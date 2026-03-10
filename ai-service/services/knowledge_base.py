"""
ai-service/services/knowledge_base.py

Stores and searches vector embeddings on disk.
Supports: file upload, manual form (no URL required)
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
    query_norm  = query  / (np.linalg.norm(query) + 1e-10)
    matrix_norm = matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10)
    return np.dot(matrix_norm, query_norm)


# ──────────────────────────────────────────────
# STORE chunks + vectors to disk
#
# Accepts chunks in two formats:
#   Format A (file/manual): { "text": "...", "embedding": [...] }
#   Format B (old crawler): { "text": "...", "embedding": [...], "metadata": { "url": "..." } }
# ──────────────────────────────────────────────
def store_chunks(user_id: str, chunks: List[Dict], source: str = "upload") -> Dict:
    if not chunks:
        return {"success": False, "message": "No chunks to store"}

    try:
        vectors_path, metadata_path, config_path = _get_user_paths(user_id)

        # ── Load existing data safely ──
        existing_vectors  = []
        existing_metadata = []

        if os.path.exists(vectors_path):
            try:
                existing_vectors = np.load(vectors_path).tolist()
            except Exception:
                existing_vectors = []

        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r") as f:
                    existing_metadata = json.load(f)
            except Exception:
                existing_metadata = []

        # ── Remove old chunks from the same source (replace, not append) ──
        filtered_vectors  = []
        filtered_metadata = []

        for vec, meta in zip(existing_vectors, existing_metadata):
            if meta.get("source") != source:
                filtered_vectors.append(vec)
                filtered_metadata.append(meta)

        # ── Add new chunks ──
        now = datetime.utcnow().isoformat()

        for i, chunk in enumerate(chunks):
            text      = chunk.get("text", "")
            embedding = chunk.get("embedding", [])

            if not text or not embedding:
                continue

            # Build metadata entry — works with or without URL
            meta_entry = {
                "text":        text,
                "source":      source,
                "chunk_index": i,
                "user_id":     user_id,
                "indexed_at":  now,
                "url":         "",
                "page_type":   "general",
            }

            # Include URL/page_type only if from crawler
            if "metadata" in chunk and isinstance(chunk["metadata"], dict):
                meta_entry["url"]       = chunk["metadata"].get("url", "")
                meta_entry["page_type"] = chunk["metadata"].get("page_type", "general")

            filtered_vectors.append(embedding)
            filtered_metadata.append(meta_entry)

        if not filtered_vectors:
            return {"success": False, "message": "No valid chunks to store"}

        # ── Save to disk ──
        np.save(vectors_path, np.array(filtered_vectors, dtype=np.float32))
        with open(metadata_path, "w") as f:
            json.dump(filtered_metadata, f)

        # ── Update config ──
        config = {}
        if os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)
            except Exception:
                config = {}

        config["last_crawled"] = now
        config["source"]       = source
        config["user_id"]      = user_id

        with open(config_path, "w") as f:
            json.dump(config, f)

        print(f"[KB] ✅ Stored {len(chunks)} chunks for {user_id}. Total: {len(filtered_metadata)}")

        return {
            "success":       True,
            "chunks_stored": len(chunks),
            "total_chunks":  len(filtered_metadata),
        }

    except Exception as e:
        print(f"[KB] store_chunks error: {e}")
        return {"success": False, "error": str(e)}


# ──────────────────────────────────────────────
# SEARCH
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
            if similarities[idx] >= 0.25:
                text      = metadata[idx]["text"]
                page_type = metadata[idx].get("page_type", "")
                if page_type and page_type not in ("general", ""):
                    relevant.append(f"[{page_type.upper()}]\n{text}")
                else:
                    relevant.append(text)

        return relevant

    except Exception as e:
        print(f"[KB Search] Error: {e}")
        return []


# ──────────────────────────────────────────────
# DELETE
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
# STATUS
# ──────────────────────────────────────────────
def get_knowledge_base_status(user_id: str) -> Dict:
    try:
        vectors_path, metadata_path, config_path = _get_user_paths(user_id)

        if not os.path.exists(metadata_path):
            return {
                "success":      True,
                "total_chunks": 0,
                "total_pages":  0,
                "indexed_urls": [],
                "page_types":   {},
                "last_crawled": None,
                "base_url":     None,
                "source":       None,
            }

        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        urls        = list(set(m["url"] for m in metadata if m.get("url")))
        type_counts = {}
        for m in metadata:
            pt = m.get("page_type", "general")
            type_counts[pt] = type_counts.get(pt, 0) + 1

        last_crawled = None
        base_url     = None
        source       = None

        if os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    cfg          = json.load(f)
                    last_crawled = cfg.get("last_crawled")
                    base_url     = cfg.get("base_url")
                    source       = cfg.get("source")
            except Exception:
                pass

        return {
            "success":      True,
            "total_chunks": len(metadata),
            "total_pages":  max(len(urls), 1) if metadata else 0,
            "indexed_urls": urls,
            "page_types":   type_counts,
            "last_crawled": last_crawled,
            "base_url":     base_url,
            "source":       source,
        }

    except Exception as e:
        print(f"[KB Status] Error: {e}")
        return {
            "success":      True,
            "total_chunks": 0,
            "total_pages":  0,
            "indexed_urls": [],
            "page_types":   {},
            "last_crawled": None,
            "base_url":     None,
            "source":       None,
        }


# ──────────────────────────────────────────────
# LEGACY — kept for backward compatibility
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
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                old = json.load(f)
                config["last_crawled"] = old.get("last_crawled")
                config["created_at"]   = old.get("created_at", config["created_at"])
        except Exception:
            pass
    with open(config_path, "w") as f:
        json.dump(config, f)


def get_crawl_config(user_id: str) -> Dict:
    _, _, config_path = _get_user_paths(user_id)
    if not os.path.exists(config_path):
        return {}
    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def update_last_crawled(user_id: str) -> None:
    _, _, config_path = _get_user_paths(user_id)
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
            config["last_crawled"] = datetime.utcnow().isoformat()
            with open(config_path, "w") as f:
                json.dump(config, f)
        except Exception:
            pass


def get_all_crawl_configs() -> List[Dict]:
    configs = []
    try:
        for filename in os.listdir(KB_PATH):
            if filename.endswith("_config.json"):
                path = os.path.join(KB_PATH, filename)
                try:
                    with open(path, "r") as f:
                        configs.append(json.load(f))
                except Exception:
                    pass
    except Exception:
        pass
    return configs