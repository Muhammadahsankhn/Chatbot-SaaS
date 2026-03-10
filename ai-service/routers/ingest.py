# ai-service/routers/ingest.py

from fastapi           import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from pydantic          import BaseModel
from typing            import Optional

from services.embeddings     import embed_chunks
from services.knowledge_base import store_chunks, delete_knowledge_base, get_knowledge_base_status

router = APIRouter()


# ── Request models ──
class ManualIngestRequest(BaseModel):
    userId: str
    text:   str
    source: Optional[str] = "manual_form"

class DeleteKnowledgeRequest(BaseModel):
    userId: str


# ──────────────────────────────────────────────
# MANUAL FORM — save typed business info
# ──────────────────────────────────────────────
@router.post("/manual")
async def ingest_manual(body: ManualIngestRequest, background_tasks: BackgroundTasks):
    """
    Customer fills in the manual form in dashboard.
    We receive plain text, chunk it, embed and store.
    """
    if not body.text or len(body.text.strip()) < 30:
        raise HTTPException(400, "Text is too short. Please provide more business information.")

    background_tasks.add_task(_run_manual_ingestion, body.userId, body.text, body.source)

    return {
        "success": True,
        "message": "Business information received. Bot is being trained...",
        "userId":  body.userId
    }


async def _run_manual_ingestion(user_id: str, text: str, source: str):
    try:
        print(f"[Manual] Starting ingestion for user {user_id}, source={source}")

        from services.file_parser import chunk_text
        chunks = chunk_text(text)

        if not chunks:
            print(f"[Manual] No chunks generated for user {user_id}")
            return

        # Build chunk dicts with metadata
        chunk_dicts = [
            {
                "text":      chunk,
                "source":    source,
                "page_type": "manual",
                "url":       "manual_form",
                "title":     "Business Information",
            }
            for chunk in chunks
        ]

        result = store_chunks(user_id, chunk_dicts)
        print(f"[Manual] ✅ Stored {len(chunks)} chunks for user {user_id}: {result}")

    except Exception as e:
        print(f"[Manual] ❌ Error for user {user_id}: {e}")


# ──────────────────────────────────────────────
# FILE UPLOAD — PDF, Word, Excel, CSV, TXT
# ──────────────────────────────────────────────
@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file:   UploadFile = File(...),
    userId: str        = Form(...),
):
    """
    Customer uploads a file (PDF, Word, Excel, CSV, TXT).
    We parse it, chunk, embed and store.
    """
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

    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    if len(file_bytes) > max_size:
        raise HTTPException(400, "File too large. Maximum size is 10MB.")

    if len(file_bytes) < 10:
        raise HTTPException(400, "File appears to be empty.")

    background_tasks.add_task(_run_file_ingestion, userId, filename, file_bytes)

    return {
        "success":  True,
        "message":  f"File '{filename}' received. Bot is being trained...",
        "filename": filename,
        "userId":   userId
    }


async def _run_file_ingestion(user_id: str, filename: str, file_bytes: bytes):
    try:
        print(f"[Upload] Starting file ingestion for user {user_id}: {filename}")

        from services.file_parser import parse_file
        raw_text, chunks = parse_file(filename, file_bytes)

        if not chunks:
            print(f"[Upload] No chunks generated from {filename}")
            return

        # Build chunk dicts with metadata
        chunk_dicts = [
            {
                "text":      chunk,
                "source":    f"file:{filename}",
                "page_type": "upload",
                "url":       filename,
                "title":     filename,
            }
            for chunk in chunks
        ]

        result = store_chunks(user_id, chunk_dicts)
        print(f"[Upload] ✅ Stored {len(chunks)} chunks from '{filename}' for user {user_id}: {result}")

    except ValueError as e:
        print(f"[Upload] ❌ Parse error for {filename}: {e}")
    except Exception as e:
        print(f"[Upload] ❌ Error for user {user_id}: {e}")


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