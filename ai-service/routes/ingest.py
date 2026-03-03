from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from middleware.validate_key import verify_internal_key
from services.scraper import scrape_specific_urls, crawl_website
from services.embeddings import process_scraped_pages
from services.knowledge_base import (
    store_chunks,
    delete_knowledge_base,
    get_knowledge_base_status
)
import asyncio

router = APIRouter()


# ── Request models ──
class IngestUrlsRequest(BaseModel):
    userId: str
    urls: List[str]           # specific URLs user provided


class CrawlWebsiteRequest(BaseModel):
    userId: str
    baseUrl: str              # homepage — we crawl from here
    maxPages: Optional[int] = 15


class DeleteKnowledgeRequest(BaseModel):
    userId: str


# ──────────────────────────────────────────────
# INGEST specific URLs (user pasted FAQ, policy pages etc.)
# ──────────────────────────────────────────────
@router.post("/urls", dependencies=[Depends(verify_internal_key)])
async def ingest_urls(body: IngestUrlsRequest, background_tasks: BackgroundTasks):
    """
    Node.js calls this when user adds specific URLs in the dashboard.
    Runs scraping in the background so the API responds immediately.
    The dashboard polls /ingest/status to check progress.
    """
    background_tasks.add_task(_run_url_ingestion, body.userId, body.urls)

    return {
        "success": True,
        "message": f"Ingestion started for {len(body.urls)} URL(s). Check /ingest/status for progress.",
        "userId": body.userId
    }


async def _run_url_ingestion(user_id: str, urls: List[str]):
    """Background task — scrape, embed, store"""
    try:
        print(f"[Ingest] Starting URL ingestion for user {user_id}: {urls}")

        # Step 1 — Scrape all URLs
        pages = await scrape_specific_urls(urls)
        print(f"[Ingest] Scraped {len(pages)} pages successfully")

        if not pages:
            print(f"[Ingest] No content found for user {user_id}")
            return

        # Step 2 — Split into chunks and embed
        chunks = process_scraped_pages(pages)
        print(f"[Ingest] Created {len(chunks)} chunks")

        # Step 3 — Store in ChromaDB
        result = store_chunks(user_id, chunks)
        print(f"[Ingest] Storage result: {result}")

    except Exception as e:
        print(f"[Ingest] Error for user {user_id}: {e}")


# ──────────────────────────────────────────────
# CRAWL entire website (auto-discover pages)
# ──────────────────────────────────────────────
@router.post("/crawl", dependencies=[Depends(verify_internal_key)])
async def crawl_and_ingest(body: CrawlWebsiteRequest, background_tasks: BackgroundTasks):
    """
    Node.js calls this when user clicks "Auto-crawl my website".
    Discovers and scrapes up to maxPages pages automatically.
    """
    background_tasks.add_task(
        _run_crawl_ingestion,
        body.userId,
        body.baseUrl,
        body.maxPages
    )

    return {
        "success": True,
        "message": f"Crawling started for {body.baseUrl}. Up to {body.maxPages} pages will be indexed.",
        "userId": body.userId
    }


async def _run_crawl_ingestion(user_id: str, base_url: str, max_pages: int):
    """Background task — crawl, embed, store"""
    try:
        print(f"[Crawl] Starting crawl for user {user_id}: {base_url}")

        # Step 1 — Crawl website
        pages = await crawl_website(base_url, max_pages=max_pages)
        print(f"[Crawl] Found {len(pages)} pages")

        if not pages:
            print(f"[Crawl] No content found for {base_url}")
            return

        # Step 2 — Split into chunks and embed
        chunks = process_scraped_pages(pages)
        print(f"[Crawl] Created {len(chunks)} chunks")

        # Step 3 — Store in ChromaDB
        result = store_chunks(user_id, chunks)
        print(f"[Crawl] Storage result: {result}")

    except Exception as e:
        print(f"[Crawl] Error for user {user_id}: {e}")


# ──────────────────────────────────────────────
# STATUS — check how much is indexed for a user
# ──────────────────────────────────────────────
@router.get("/status/{user_id}", dependencies=[Depends(verify_internal_key)])
async def get_status(user_id: str):
    """
    Dashboard polls this to show the user how many pages are indexed.
    Returns: { total_chunks, indexed_urls, total_pages }
    """
    status = get_knowledge_base_status(user_id)
    return {"success": True, "data": status}


# ──────────────────────────────────────────────
# DELETE — remove all knowledge for a user
# ──────────────────────────────────────────────
@router.delete("/delete", dependencies=[Depends(verify_internal_key)])
async def delete_knowledge(body: DeleteKnowledgeRequest):
    """
    Called when user removes a website or deletes their account.
    Wipes all their stored vectors from ChromaDB.
    """
    result = delete_knowledge_base(body.userId)
    return result