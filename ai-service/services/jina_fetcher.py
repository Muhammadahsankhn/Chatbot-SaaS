"""
ai-service/services/jina_fetcher.py

Fetches web pages as clean markdown using Jina.ai Reader API.
No scraping. No IP blocks. Works with WordPress, React, Next.js, Shopify, etc.

Usage:
    GET https://r.jina.ai/{target_url}  →  returns clean readable text
"""

import asyncio
import httpx
import re
from typing import List, Dict
from xml.etree import ElementTree

JINA_BASE    = "https://r.jina.ai"
JINA_TIMEOUT = 30          # seconds per page
MAX_CONTENT  = 50_000      # max chars per page (avoid massive pages)

# Pages to skip — navigation, login, cart, etc.
SKIP_PATTERNS = re.compile(
    r"/(login|logout|register|signup|cart|checkout|account|admin|wp-admin|api/|feed|rss)",
    re.IGNORECASE
)


async def fetch_page_via_jina(url: str) -> Dict:
    """
    Fetch a single URL via Jina Reader API.
    Returns { url, text, success, error }
    """
    jina_url = f"{JINA_BASE}/{url}"
    try:
        async with httpx.AsyncClient(timeout=JINA_TIMEOUT, follow_redirects=True) as client:
            res = await client.get(
                jina_url,
                headers={
                    "Accept":     "text/plain",
                    "User-Agent": "DigiChat-Bot/1.0",
                    "X-No-Cache": "true",
                }
            )
            if res.status_code != 200:
                return {"url": url, "text": "", "success": False, "error": f"HTTP {res.status_code}"}

            text = res.text[:MAX_CONTENT]
            # Jina sometimes returns very short responses for blocked pages
            if len(text.strip()) < 100:
                return {"url": url, "text": "", "success": False, "error": "Content too short"}

            return {"url": url, "text": text, "success": True, "error": None}

    except httpx.TimeoutException:
        return {"url": url, "text": "", "success": False, "error": "Timeout"}
    except Exception as e:
        return {"url": url, "text": "", "success": False, "error": str(e)}


async def get_urls_from_sitemap(base_url: str, max_pages: int = 50) -> List[str]:
    """
    Try to fetch sitemap.xml from the domain and extract page URLs.
    Falls back to just [base_url] if no sitemap found.
    """
    # Normalize base_url
    domain = base_url.rstrip("/")

    sitemap_candidates = [
        f"{domain}/sitemap.xml",
        f"{domain}/sitemap_index.xml",
        f"{domain}/sitemap/",
        f"{domain}/page-sitemap.xml",
        f"{domain}/post-sitemap.xml",
    ]

    urls = []

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for sitemap_url in sitemap_candidates:
            try:
                res = await client.get(sitemap_url, headers={"User-Agent": "DigiChat-Bot/1.0"})
                if res.status_code != 200:
                    continue
                content_type = res.headers.get("content-type", "")
                if "xml" not in content_type and "text" not in content_type:
                    continue

                # Parse XML sitemap
                try:
                    root = ElementTree.fromstring(res.text)
                    # Handle both sitemap index and regular sitemaps
                    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

                    # If it's a sitemap index — fetch the first sub-sitemap
                    sub_sitemaps = root.findall(".//sm:sitemap/sm:loc", ns)
                    if sub_sitemaps:
                        for sub in sub_sitemaps[:3]:  # check first 3 sub-sitemaps
                            try:
                                sub_res = await client.get(sub.text.strip(), headers={"User-Agent": "DigiChat-Bot/1.0"})
                                if sub_res.status_code == 200:
                                    sub_root = ElementTree.fromstring(sub_res.text)
                                    locs = sub_root.findall(".//sm:url/sm:loc", ns)
                                    urls.extend(loc.text.strip() for loc in locs if loc.text)
                            except Exception:
                                continue
                    else:
                        # Regular sitemap
                        locs = root.findall(".//sm:url/sm:loc", ns)
                        urls.extend(loc.text.strip() for loc in locs if loc.text)

                    if urls:
                        print(f"[Jina] ✅ Found sitemap at {sitemap_url} with {len(urls)} URLs")
                        break   # found a working sitemap

                except ElementTree.ParseError:
                    continue

            except Exception:
                continue

    if not urls:
        # No sitemap found — just use the base URL itself
        print(f"[Jina] No sitemap found for {domain}, using single page.")
        urls = [base_url]

    # ── Filter out irrelevant pages ──
    filtered = []
    seen     = set()
    for u in urls:
        u = u.strip()
        if not u or u in seen:
            continue
        if SKIP_PATTERNS.search(u):
            continue
        # Only include URLs that belong to the same domain
        if domain.replace("https://", "").replace("http://", "").split("/")[0] not in u:
            continue
        seen.add(u)
        filtered.append(u)

    # Apply plan limit
    filtered = filtered[:max_pages]
    print(f"[Jina] Fetching {len(filtered)} pages (limit: {max_pages})")
    return filtered


async def fetch_all_pages(urls: List[str], concurrency: int = 5) -> List[Dict]:
    """
    Fetch all URLs via Jina Reader concurrently (max `concurrency` at a time).
    Returns list of { url, text, success, error }
    """
    results = []
    semaphore = asyncio.Semaphore(concurrency)

    async def fetch_with_limit(url: str):
        async with semaphore:
            result = await fetch_page_via_jina(url)
            if result["success"]:
                print(f"[Jina] ✅ {url[:60]} ({len(result['text'])} chars)")
            else:
                print(f"[Jina] ⚠️  {url[:60]} — {result['error']}")
            return result

    tasks = [fetch_with_limit(url) for url in urls]
    results = await asyncio.gather(*tasks)

    success_count = sum(1 for r in results if r["success"])
    print(f"[Jina] Done: {success_count}/{len(urls)} pages fetched successfully")
    return list(results)
