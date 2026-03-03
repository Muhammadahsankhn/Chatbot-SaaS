"""
Knowledge base using simple numpy vector search.
No C++ compiler needed. Works on Python 3.14.

Stores vectors as .npy files on disk — one file per user.
Fast enough for thousands of chunks per user.
"""
import os
import json
import numpy as np
from typing import List, Dict

# All knowledge base data stored here
KB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "knowledge")
os.makedirs(KB_PATH, exist_ok=True)


def _get_user_paths(user_id: str):
    """Returns file paths for a user's vectors and metadata."""
    safe_id = user_id.replace("-", "_")
    vectors_path  = os.path.join(KB_PATH, f"{safe_id}_vectors.npy")
    metadata_path = os.path.join(KB_PATH, f"{safe_id}_metadata.json")
    return vectors_path, metadata_path


def _cosine_similarity(query: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """
    Calculates cosine similarity between one query vector and many stored vectors.
    Returns array of similarity scores (1.0 = identical, 0.0 = unrelated).
    """
    query_norm  = query / (np.linalg.norm(query) + 1e-10)
    matrix_norm = matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10)
    return np.dot(matrix_norm, query_norm)


# ──────────────────────────────────────────────
# STORE — save chunks and vectors to disk
# ──────────────────────────────────────────────
def store_chunks(user_id: str, chunks: List[Dict]) -> Dict:
    """
    Saves all text chunks and their embedding vectors to disk.
    Replaces any existing data for the same URLs (re-ingestion safe).
    """
    if not chunks:
        return {"success": False, "message": "No chunks to store"}

    try:
        vectors_path, metadata_path = _get_user_paths(user_id)

        # Load existing data if any
        existing_vectors  = []
        existing_metadata = []

        if os.path.exists(vectors_path) and os.path.exists(metadata_path):
            existing_vectors  = np.load(vectors_path).tolist()
            with open(metadata_path, "r") as f:
                existing_metadata = json.load(f)

        # Get URLs being re-ingested — remove their old chunks
        new_urls = set(c["metadata"]["url"] for c in chunks)
        filtered_vectors  = []
        filtered_metadata = []

        for vec, meta in zip(existing_vectors, existing_metadata):
            if meta.get("url") not in new_urls:
                filtered_vectors.append(vec)
                filtered_metadata.append(meta)

        # Add new chunks
        for chunk in chunks:
            filtered_vectors.append(chunk["embedding"])
            filtered_metadata.append({
                "text":        chunk["text"],
                "url":         chunk["metadata"]["url"],
                "chunk_index": chunk["metadata"]["chunk_index"],
                "user_id":     user_id
            })

        # Save to disk
        np.save(vectors_path, np.array(filtered_vectors, dtype=np.float32))
        with open(metadata_path, "w") as f:
            json.dump(filtered_metadata, f)

        return {
            "success":      True,
            "chunks_stored": len(chunks),
            "total_chunks":  len(filtered_metadata),
            "urls_indexed":  len(new_urls)
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


# ──────────────────────────────────────────────
# SEARCH — find most relevant chunks for a question
# ──────────────────────────────────────────────
def search_knowledge_base(
    user_id: str,
    query_embedding: List[float],
    top_k: int = 4
) -> List[str]:
    """
    Searches stored chunks for the ones most similar to the visitor's question.
    Returns the top_k most relevant text chunks.
    These get injected into the Gemini prompt as context.
    """
    try:
        vectors_path, metadata_path = _get_user_paths(user_id)

        # No knowledge base yet for this user
        if not os.path.exists(vectors_path) or not os.path.exists(metadata_path):
            return []

        vectors = np.load(vectors_path)
        if len(vectors) == 0:
            return []

        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        # Calculate similarity scores
        query_vec   = np.array(query_embedding, dtype=np.float32)
        similarities = _cosine_similarity(query_vec, vectors)

        # Get top_k indices sorted by similarity (highest first)
        top_indices = np.argsort(similarities)[::-1][:top_k]

        # Filter out low-relevance results (similarity < 0.3)
        relevant = []
        for idx in top_indices:
            if similarities[idx] >= 0.3:
                relevant.append(metadata[idx]["text"])

        return relevant

    except Exception as e:
        print(f"Knowledge base search error: {e}")
        return []


# ──────────────────────────────────────────────
# DELETE — remove all knowledge for a user
# ──────────────────────────────────────────────
def delete_knowledge_base(user_id: str) -> Dict:
    try:
        vectors_path, metadata_path = _get_user_paths(user_id)
        if os.path.exists(vectors_path):
            os.remove(vectors_path)
        if os.path.exists(metadata_path):
            os.remove(metadata_path)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ──────────────────────────────────────────────
# STATUS — how much is indexed for a user
# ──────────────────────────────────────────────
def get_knowledge_base_status(user_id: str) -> Dict:
    try:
        vectors_path, metadata_path = _get_user_paths(user_id)

        if not os.path.exists(metadata_path):
            return {"success": True, "total_chunks": 0, "indexed_urls": [], "total_pages": 0}

        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        urls = list(set(m["url"] for m in metadata))

        return {
            "success":      True,
            "total_chunks": len(metadata),
            "indexed_urls": urls,
            "total_pages":  len(urls)
        }
    except Exception as e:
        return {"success": True, "total_chunks": 0, "indexed_urls": [], "total_pages": 0}