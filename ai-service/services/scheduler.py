# ai-service/services/scheduler.py
"""
Background scheduler that auto re-crawls websites every 24 hours.
Starts when FastAPI starts. Runs silently in background.
"""

import asyncio
from datetime import datetime, timedelta


async def auto_refresh_loop():
    """
    Runs forever in background.
    Every hour, checks which users need their website re-crawled.
    """
    print("[Scheduler] Auto-refresh scheduler started ✅")

    while True:
        try:
            await _check_and_refresh_all()
        except Exception as e:
            print(f"[Scheduler] Error: {e}")

        # Check every hour
        await asyncio.sleep(3600)


async def _check_and_refresh_all():
    from services.knowledge_base import get_all_crawl_configs, get_crawl_config
    from services.scraper import crawl_website
    from services.embeddings import process_scraped_pages
    from services.knowledge_base import store_chunks, update_last_crawled

    configs = get_all_crawl_configs()
    now     = datetime.utcnow()

    for config in configs:
        user_id        = config.get("user_id")
        base_url       = config.get("base_url")
        interval_hours = config.get("interval_hours", 24)
        last_crawled   = config.get("last_crawled")

        if not user_id or not base_url:
            continue

        # Check if refresh is due
        if last_crawled:
            last_dt    = datetime.fromisoformat(last_crawled)
            next_crawl = last_dt + timedelta(hours=interval_hours)
            if now < next_crawl:
                continue  # not time yet

        print(f"[Scheduler] Auto-refreshing {base_url} for user {user_id}")

        try:
            pages  = await crawl_website(base_url, max_pages=config.get("max_pages", 50))
            if pages:
                chunks = process_scraped_pages(pages)
                store_chunks(user_id, chunks)
                update_last_crawled(user_id)
                print(f"[Scheduler] ✅ Refreshed {base_url} — {len(chunks)} chunks")
            else:
                print(f"[Scheduler] ⚠️ No content found for {base_url}")
        except Exception as e:
            print(f"[Scheduler] ❌ Failed to refresh {base_url}: {e}")

        # Small delay between users
        await asyncio.sleep(5)