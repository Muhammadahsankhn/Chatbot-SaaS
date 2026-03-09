"""
ai-service/services/knowledge_base.py

Stores and searches vector embeddings on disk.
Also tracks crawl config per user for auto-refresh.
"""

import os
import json
import numpy as np
from datetime import datetime
from typing import List, Dict

KB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "knowledge")
os.makedirs(KB_PATH, exist_ok=True)


def _get_user_paths(user_id: str):
    safe_id       = user_id.replace("-", "_")
    vectors_path  = os.path.join(KB_PATH, f"{safe_id}_vectors.npy")
    metadata_path = os.path.join(KB_PATH, f"{safe_id}_metadata.json")
    config_path   = os.path.join(KB_PATH, f"{safe_id}_config.json")
    return vectors_path, metadata_path, config_path


def _cosine_similarity(query: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    query_norm  = query / (np.linalg.norm(query) + 1e-10)
    matrix_norm = matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10)
    return np.dot(matrix_norm, query_norm)


# ──────────────────────────────────────────────
# STORE chunks and vectors to disk
# ──────────────────────────────────────────────
def store_chunks(user_id: str, chunks: List[Dict]) -> Dict:
    if not chunks:
        return {"success": False, "message": "No chunks to store"}

    try:
        vectors_path, metadata_path, _ = _get_user_paths(user_id)

        existing_vectors  = []
        existing_metadata = []

        if os.path.exists(vectors_path) and os.path.exists(metadata_path):
            existing_vectors  = np.load(vectors_path).tolist()
            with open(metadata_path, "r") as f:
                existing_metadata = json.load(f)

        # Remove old chunks for URLs being re-ingested
        new_urls          = set(c["metadata"]["url"] for c in chunks)
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
                "page_type":   chunk["metadata"].get("page_type", "general"),
                "chunk_index": chunk["metadata"]["chunk_index"],
                "user_id":     user_id,
                "indexed_at":  datetime.utcnow().isoformat(),
            })

        np.save(vectors_path, np.array(filtered_vectors, dtype=np.float32))
        with open(metadata_path, "w") as f:
            json.dump(filtered_metadata, f)

        return {
            "success":       True,
            "chunks_stored": len(chunks),
            "total_chunks":  len(filtered_metadata),
            "urls_indexed":  len(new_urls),
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


# ──────────────────────────────────────────────
# SEARCH knowledge base for relevant chunks
# ──────────────────────────────────────────────
def search_knowledge_base(
    user_id: str,
    query_embedding: List[float],
    top_k: int = 4
) -> List[str]:
    try:
        vectors_path, metadata_path, _ = _get_user_paths(user_id)

        if not os.path.exists(vectors_path) or not os.path.exists(metadata_path):
            return []

        vectors = np.load(vectors_path)
        if len(vectors) == 0:
            return []

        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        query_vec    = np.array(query_embedding, dtype=np.float32)
        similarities = _cosine_similarity(query_vec, vectors)
        top_indices  = np.argsort(similarities)[::-1][:top_k]

        relevant = []
        for idx in top_indices:
            if similarities[idx] >= 0.25:  # slightly lower threshold for better recall
                text      = metadata[idx]["text"]
                page_type = metadata[idx].get("page_type", "")
                # Label the chunk so Gemini knows what type of data it is
                if page_type and page_type != "general":
                    relevant.append(f"[{page_type.upper()}]\n{text}")
                else:
                    relevant.append(text)

        return relevant

    except Exception as e:
        print(f"[KB Search] Error: {e}")
        return []


# ──────────────────────────────────────────────
# SAVE crawl config (URL + schedule)
# ──────────────────────────────────────────────
def save_crawl_config(user_id: str, base_url: str, max_pages: int = 50, interval_hours: int = 24) -> None:
    _, _, config_path = _get_user_paths(user_id)
    config = {
        "user_id":        user_id,
        "base_url":       base_url,
        "max_pages":      max_pages,
        "interval_hours": interval_hours,
        "last_crawled":   None,
        "created_at":     datetime.utcnow().isoformat(),
    }
    # Preserve last_crawled if config exists
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            old = json.load(f)
            config["last_crawled"] = old.get("last_crawled")
            config["created_at"]   = old.get("created_at", config["created_at"])

    with open(config_path, "w") as f:
        json.dump(config, f)


# ──────────────────────────────────────────────
# GET crawl config
# ──────────────────────────────────────────────
def get_crawl_config(user_id: str) -> Dict:
    _, _, config_path = _get_user_paths(user_id)
    if not os.path.exists(config_path):
        return {}
    with open(config_path, "r") as f:
        return json.load(f)


# ──────────────────────────────────────────────
# UPDATE last crawled timestamp
# ──────────────────────────────────────────────
def update_last_crawled(user_id: str) -> None:
    _, _, config_path = _get_user_paths(user_id)
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            config = json.load(f)
        config["last_crawled"] = datetime.utcnow().isoformat()
        with open(config_path, "w") as f:
            json.dump(config, f)


# ──────────────────────────────────────────────
# GET all users who have a crawl config (for scheduler)
# ──────────────────────────────────────────────
def get_all_crawl_configs() -> List[Dict]:
    configs = []
    for filename in os.listdir(KB_PATH):
        if filename.endswith("_config.json"):
            path = os.path.join(KB_PATH, filename)
            with open(path, "r") as f:
                configs.append(json.load(f))
    return configs


# ──────────────────────────────────────────────
# DELETE all knowledge for a user
# ──────────────────────────────────────────────
def delete_knowledge_base(user_id: str) -> Dict:
    try:
        vectors_path, metadata_path, config_path = _get_user_paths(user_id)
        for path in [vectors_path, metadata_path, config_path]:
            if os.path.exists(path):
                os.remove(path)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ──────────────────────────────────────────────
# STATUS — how much is indexed
# ──────────────────────────────────────────────
def get_knowledge_base_status(user_id: str) -> Dict:
    try:
        vectors_path, metadata_path, config_path = _get_user_paths(user_id)

        if not os.path.exists(metadata_path):
            return {
                "success":      True,
                "total_chunks": 0,
                "indexed_urls": [],
                "total_pages":  0,
                "last_crawled": None,
                "base_url":     None,
            }

        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        urls = list(set(m["url"] for m in metadata))

        # Page type breakdown
        type_counts = {}
        for m in metadata:
            pt = m.get("page_type", "general")
            type_counts[pt] = type_counts.get(pt, 0) + 1

        # Crawl config
        last_crawled = None
        base_url     = None
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                cfg          = json.load(f)
                last_crawled = cfg.get("last_crawled")
                base_url     = cfg.get("base_url")

        return {
            "success":      True,
            "total_chunks": len(metadata),
            "indexed_urls": urls,
            "total_pages":  len(urls),
            "page_types":   type_counts,
            "last_crawled": last_crawled,
            "base_url":     base_url,
        }

    except Exception as e:
        return {"success": True, "total_chunks": 0, "indexed_urls": [], "total_pages": 0}