from sentence_transformers import SentenceTransformer
from typing import List, Dict
import re

# ──────────────────────────────────────────────
# Load the embedding model once at startup
# This model converts text → numbers (vectors)
# "all-MiniLM-L6-v2" is small, fast, and accurate enough for our use case
# ──────────────────────────────────────────────
print("Loading embedding model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("Embedding model loaded ✅")


# ──────────────────────────────────────────────
# SPLIT text into chunks
# ──────────────────────────────────────────────
def split_into_chunks(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Splits a long text into overlapping chunks.

    Why chunks? Because Gemini has a context limit — we can't pass an
    entire website. So we break it into pieces and only pass the
    relevant pieces to Gemini.

    Why overlap? So a sentence split across two chunks doesn't lose context.

    chunk_size = 500 words per chunk (good balance of context vs speed)
    overlap    = 50 words shared between consecutive chunks
    """
    # Split into sentences first for cleaner breaks
    sentences = re.split(r'(?<=[.!?])\s+', text)

    chunks = []
    current_chunk = []
    current_length = 0

    for sentence in sentences:
        word_count = len(sentence.split())

        if current_length + word_count > chunk_size and current_chunk:
            # Save current chunk
            chunks.append(" ".join(current_chunk))

            # Keep last few sentences as overlap for next chunk
            overlap_sentences = current_chunk[-3:] if len(current_chunk) >= 3 else current_chunk
            current_chunk = overlap_sentences.copy()
            current_length = sum(len(s.split()) for s in current_chunk)

        current_chunk.append(sentence)
        current_length += word_count

    # Don't forget the last chunk
    if current_chunk:
        chunks.append(" ".join(current_chunk))

    # Filter out very short chunks (less than 20 words — likely navigation noise)
    chunks = [c for c in chunks if len(c.split()) >= 20]

    return chunks


# ──────────────────────────────────────────────
# EMBED chunks — convert text to vectors
# ──────────────────────────────────────────────
def embed_chunks(chunks: List[str]) -> List[List[float]]:
    """
    Converts a list of text chunks into vectors (lists of numbers).

    A vector captures the MEANING of text numerically.
    "return policy" and "refund rules" will have similar vectors
    even though the words are different — that's the magic.
    """
    vectors = embedding_model.encode(chunks, show_progress_bar=False)
    return vectors.tolist()


def embed_single(text: str) -> List[float]:
    """
    Embeds a single piece of text (used for embedding the visitor's question
    so we can search for similar chunks).
    """
    vector = embedding_model.encode([text], show_progress_bar=False)
    return vector[0].tolist()


# ──────────────────────────────────────────────
# PROCESS scraped pages into embeddable chunks
# ──────────────────────────────────────────────
def process_scraped_pages(pages: List[Dict]) -> List[Dict]:
    """
    Takes raw scraped pages and converts them into chunks ready for storage.
    Each chunk carries metadata (source URL, page title) for reference.

    Returns a list of:
    {
        "text": "chunk text...",
        "embedding": [0.1, 0.2, ...],
        "metadata": { "url": "...", "chunk_index": 0 }
    }
    """
    all_chunks = []

    for page in pages:
        if not page.get("success") or not page.get("text"):
            continue

        # Split this page's text into chunks
        chunks = split_into_chunks(page["text"])

        # Embed all chunks at once (batch is faster)
        embeddings = embed_chunks(chunks)

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            all_chunks.append({
                "text": chunk,
                "embedding": embedding,
                "metadata": {
                    "url": page.get("url", ""),
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
            })

    return all_chunks