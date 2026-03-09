# ai-service/routers/ingest.py

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from services.scraper import scrape_specific_urls, crawl_website
from services.embeddings import process_scraped_pages
from services.knowledge_base import (
    store_chunks,
    delete_knowledge_base,
    get_knowledge_base_status,
    save_crawl_config,
    update_last_crawled,
)

router = APIRouter()


# ── Request models ──
class IngestUrlsRequest(BaseModel):
    userId:   str
    urls:     List[str]

class CrawlWebsiteRequest(BaseModel):
    userId:   str
    baseUrl:  str
    maxPages: Optional[int] = 50

class DeleteKnowledgeRequest(BaseModel):
    userId: str

class RefreshRequest(BaseModel):
    userId: str


# ──────────────────────────────────────────────
# CRAWL entire website — main entry point
# ──────────────────────────────────────────────
@router.post("/crawl")
async def crawl_and_ingest(body: CrawlWebsiteRequest, background_tasks: BackgroundTasks):
    """
    Customer enters their website URL in dashboard.
    We crawl it, extract structured data, embed and store.
    """
    # Save crawl config immediately so scheduler can auto-refresh later
    save_crawl_config(
        user_id       = body.userId,
        base_url      = body.baseUrl,
        max_pages     = body.maxPages or 50,
        interval_hours= 24
    )

    background_tasks.add_task(
        _run_crawl_ingestion,
        body.userId,
        body.baseUrl,
        body.maxPages or 50
    )

    return {
        "success": True,
        "message": f"Crawling started for {body.baseUrl}. Up to {body.maxPages} pages will be indexed.",
        "userId":  body.userId
    }


async def _run_crawl_ingestion(user_id: str, base_url: str, max_pages: int):
    try:
        print(f"[Crawl] Starting for user {user_id}: {base_url}")

        pages = await crawl_website(base_url, max_pages=max_pages)
        print(f"[Crawl] Found {len(pages)} pages")

        if not pages:
            print(f"[Crawl] No content found for {base_url}")
            return

        chunks = process_scraped_pages(pages)
        print(f"[Crawl] Created {len(chunks)} chunks")

        result = store_chunks(user_id, chunks)
        update_last_crawled(user_id)
        print(f"[Crawl] Stored: {result}")

    except Exception as e:
        print(f"[Crawl] Error for user {user_id}: {e}")


# ──────────────────────────────────────────────
# INGEST specific URLs
# ──────────────────────────────────────────────
@router.post("/urls")
async def ingest_urls(body: IngestUrlsRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(_run_url_ingestion, body.userId, body.urls)
    return {
        "success": True,
        "message": f"Ingestion started for {len(body.urls)} URL(s).",
        "userId":  body.userId
    }


async def _run_url_ingestion(user_id: str, urls: List[str]):
    try:
        print(f"[Ingest] Starting URL ingestion for user {user_id}: {urls}")

        pages = await scrape_specific_urls(urls)
        print(f"[Ingest] Scraped {len(pages)} pages")

        if not pages:
            return

        chunks = process_scraped_pages(pages)
        result = store_chunks(user_id, chunks)
        update_last_crawled(user_id)
        print(f"[Ingest] Result: {result}")

    except Exception as e:
        print(f"[Ingest] Error for user {user_id}: {e}")


# ──────────────────────────────────────────────
# MANUAL REFRESH — re-crawl now
# ──────────────────────────────────────────────
@router.post("/refresh")
async def refresh_knowledge(body: RefreshRequest, background_tasks: BackgroundTasks):
    """
    Called when user clicks 'Re-crawl Now' in dashboard.
    Also called by the scheduler every 24 hours.
    """
    from services.knowledge_base import get_crawl_config
    config = get_crawl_config(body.userId)

    if not config or not config.get("base_url"):
        raise HTTPException(400, "No website configured for this user. Please crawl a website first.")

    background_tasks.add_task(
        _run_crawl_ingestion,
        body.userId,
        config["base_url"],
        config.get("max_pages", 50)
    )

    return {
        "success": True,
        "message": f"Re-crawling {config['base_url']}...",
        "userId":  body.userId
    }


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