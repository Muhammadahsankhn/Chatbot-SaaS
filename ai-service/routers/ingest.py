# ai-service/routers/ingest.py

from fastapi        import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from pydantic       import BaseModel
from typing         import Optional

from services.embeddings     import embed_chunks
from services.knowledge_base import store_chunks, delete_knowledge_base, get_knowledge_base_status
from services.jina_fetcher   import get_urls_from_sitemap, fetch_all_pages

router = APIRouter()

# Track in-progress URL ingestion per user
_url_progress: dict = {}


# ── Request models ──
class ManualIngestRequest(BaseModel):
    userId: str
    text:   str
    source: Optional[str] = "manual_form"

class UrlIngestRequest(BaseModel):
    userId:   str
    url:      str
    maxPages: Optional[int] = 15

class DeleteKnowledgeRequest(BaseModel):
    userId: str


# ──────────────────────────────────────────────
# URL INGESTION VIA JINA.AI (no scraping)
# ──────────────────────────────────────────────
@router.post("/url")
async def ingest_url(body: UrlIngestRequest, background_tasks: BackgroundTasks):
    """Train the bot from a website URL using Jina.ai Reader API."""
    url = body.url.strip()
    if not url:
        raise HTTPException(400, "URL is required.")
    if not url.startswith("http"):
        url = "https://" + url

    max_pages = max(1, min(body.maxPages or 15, 200))

    # Mark as in-progress
    _url_progress[body.userId] = {"status": "running", "url": url, "pages_done": 0, "total": 0}

    background_tasks.add_task(_run_url_ingestion, body.userId, url, max_pages)

    return {
        "success": True,
        "message": f"Fetching content from {url}. Bot will be ready in 1-2 minutes.",
        "url": url,
    }


async def _run_url_ingestion(user_id: str, url: str, max_pages: int):
    try:
        print(f"[URL Ingest] Starting for user {user_id}: {url}")

        # 1. Discover pages via sitemap (or just the given URL)
        urls = await get_urls_from_sitemap(url, max_pages=max_pages)
        _url_progress[user_id]["total"] = len(urls)

        # 2. Fetch all pages via Jina Reader
        pages = await fetch_all_pages(urls, concurrency=5)
        successful = [p for p in pages if p["success"] and p["text"].strip()]

        if not successful:
            print(f"[URL Ingest] No content fetched for {url}")
            _url_progress[user_id]["status"] = "failed"
            return

        print(f"[URL Ingest] Got content from {len(successful)}/{len(pages)} pages")

        # 3. Chunk all page texts
        from services.file_parser import chunk_text
        all_chunk_dicts = []
        for page in successful:
            chunks = chunk_text(page["text"])
            if not chunks:
                continue
            embeddings = embed_chunks(chunks)
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                all_chunk_dicts.append({
                    "text":      chunk,
                    "embedding": emb,
                    "metadata":  {"url": page["url"], "page_type": "general"},
                })
            _url_progress[user_id]["pages_done"] = _url_progress[user_id].get("pages_done", 0) + 1

        if not all_chunk_dicts:
            print(f"[URL Ingest] No valid chunks generated")
            _url_progress[user_id]["status"] = "failed"
            return

        # 4. Store — save the base URL in config so Re-crawl works
        from services.knowledge_base import save_crawl_config
        save_crawl_config(user_id, url, max_pages=max_pages)

        source = f"url:{url}"
        result = store_chunks(user_id, all_chunk_dicts, source=source)

        _url_progress[user_id]["status"] = "done"
        print(f"[URL Ingest] ✅ Done for {user_id}: {result}")

    except Exception as e:
        print(f"[URL Ingest] ❌ Error: {e}")
        import traceback; traceback.print_exc()
        _url_progress[user_id]["status"] = "failed"


@router.get("/url-progress/{user_id}")
async def get_url_progress(user_id: str):
    progress = _url_progress.get(user_id, {"status": "idle"})
    return {"success": True, "progress": progress}


@router.post("/refresh")
async def refresh_url(body: UrlIngestRequest, background_tasks: BackgroundTasks):
    """Re-fetch and re-index the same URL (re-crawl)."""
    return await ingest_url(body, background_tasks)


# ──────────────────────────────────────────────
# MANUAL FORM
# ──────────────────────────────────────────────
@router.post("/manual")
async def ingest_manual(body: ManualIngestRequest, background_tasks: BackgroundTasks):
    if not body.text or len(body.text.strip()) < 30:
        raise HTTPException(400, "Text is too short. Please provide more business information.")

    background_tasks.add_task(_run_manual_ingestion, body.userId, body.text, body.source)

    return {
        "success": True,
        "message": "Business information received. Bot is being trained...",
        "userId":  body.userId,
    }


async def _run_manual_ingestion(user_id: str, text: str, source: str):
    try:
        print(f"[Manual] Starting ingestion for user {user_id}")

        from services.file_parser import chunk_text
        chunks = chunk_text(text)

        if not chunks:
            print(f"[Manual] No chunks generated for user {user_id}")
            return

        print(f"[Manual] Generated {len(chunks)} chunks. Embedding...")

        # ── Embed chunks ──
        embeddings = embed_chunks(chunks)

        if not embeddings:
            print(f"[Manual] Embedding failed for user {user_id}")
            return

        # ── Build chunk dicts with embeddings ──
        chunk_dicts = [
            {
                "text":      chunk,
                "embedding": embeddings[i],
            }
            for i, chunk in enumerate(chunks)
        ]

        # ── Store to disk ──
        result = store_chunks(user_id, chunk_dicts, source=source)
        print(f"[Manual] ✅ Done for user {user_id}: {result}")

    except Exception as e:
        print(f"[Manual] ❌ Error for user {user_id}: {e}")
        import traceback
        traceback.print_exc()


# ──────────────────────────────────────────────
# FILE UPLOAD
# ──────────────────────────────────────────────
@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file:   UploadFile = File(...),
    userId: str        = Form(...),
):
    # Validate file type
    allowed_extensions = {"pdf", "docx", "xlsx", "xls", "csv", "txt", "json"}
    filename = file.filename or ""
    ext      = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in allowed_extensions:
        raise HTTPException(
            400,
            f"File type '.{ext}' not supported. Allowed: PDF, DOCX, XLSX, XLS, CSV, TXT, JSON"
        )

    # Read file bytes
    file_bytes = await file.read()

    # Validate size (max 10MB)
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum size is 10MB.")

    if len(file_bytes) < 10:
        raise HTTPException(400, "File appears to be empty.")

    background_tasks.add_task(_run_file_ingestion, userId, filename, file_bytes)

    return {
        "success":  True,
        "message":  f"File '{filename}' received. Bot is being trained...",
        "filename": filename,
        "userId":   userId,
    }


async def _run_file_ingestion(user_id: str, filename: str, file_bytes: bytes):
    try:
        print(f"[Upload] Starting file ingestion for user {user_id}: {filename}")

        from services.file_parser import parse_file
        raw_text, chunks = parse_file(filename, file_bytes)

        if not chunks:
            print(f"[Upload] No chunks generated from {filename}")
            return

        print(f"[Upload] Generated {len(chunks)} chunks from '{filename}'. Embedding...")

        # ── Embed chunks ──
        embeddings = embed_chunks(chunks)

        if not embeddings:
            print(f"[Upload] Embedding failed for {filename}")
            return

        # ── Build chunk dicts with embeddings ──
        chunk_dicts = [
            {
                "text":      chunk,
                "embedding": embeddings[i],
            }
            for i, chunk in enumerate(chunks)
        ]

        # ── Store to disk ──
        source = f"file:{filename}"
        result = store_chunks(user_id, chunk_dicts, source=source)
        print(f"[Upload] ✅ Stored {len(chunks)} chunks from '{filename}' for user {user_id}: {result}")

    except ValueError as e:
        print(f"[Upload] ❌ Parse error for {filename}: {e}")
    except Exception as e:
        print(f"[Upload] ❌ Error for user {user_id}: {e}")
        import traceback
        traceback.print_exc()


# ──────────────────────────────────────────────
# STATUS
# ──────────────────────────────────────────────
@router.get("/status/{user_id}")
async def get_status(user_id: str):
    status = get_knowledge_base_status(user_id)
    return {"success": True, "data": status}


# ──────────────────────────────────────────────
# DELETE
# ──────────────────────────────────────────────
@router.delete("/delete")
async def delete_knowledge(body: DeleteKnowledgeRequest):
    result = delete_knowledge_base(body.userId)
    return result