import requests
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from urllib.parse import urljoin, urlparse
import asyncio
import re
from typing import List, Dict


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36"
}

# Tags that never contain useful content
IGNORE_TAGS = ["script", "style", "nav", "footer", "header",
               "noscript", "svg", "img", "button", "input"]


# CLEAN extracted text
def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)          # collapse whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)    # max 2 newlines
    return text.strip()


def extract_text_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    # Remove useless tags
    for tag in soup(IGNORE_TAGS):
        tag.decompose()

    # Get all visible text
    text = soup.get_text(separator="\n")
    return clean_text(text)


# ──────────────────────────────────────────────
# STATIC scraper — for normal HTML websites
# ──────────────────────────────────────────────
def scrape_static(url: str) -> Dict:
    """
    Scrapes a plain HTML page using requests + BeautifulSoup.
    Works for WordPress, basic HTML, most standard websites.
    """
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()

        text = extract_text_from_html(response.text)

        return {
            "url": url,
            "success": True,
            "text": text,
            "method": "static"
        }
    except Exception as e:
        return {
            "url": url,
            "success": False,
            "text": "",
            "error": str(e),
            "method": "static"
        }


# ──────────────────────────────────────────────
# DYNAMIC scraper — for React / Next.js / Vue sites
# ──────────────────────────────────────────────
async def scrape_dynamic(url: str) -> Dict:
    """
    Uses a real browser (Playwright) to render JavaScript-heavy pages.
    Works for React, Next.js, Vue, Angular websites.
    Falls back to static scraping if Playwright fails.
    """
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.set_extra_http_headers(HEADERS)
            await page.goto(url, wait_until="networkidle", timeout=30000)

            # Wait for content to load
            await page.wait_for_timeout(2000)

            html = await page.content()
            await browser.close()

            text = extract_text_from_html(html)

            return {
                "url": url,
                "success": True,
                "text": text,
                "method": "dynamic"
            }
    except Exception as e:
        # Fallback to static scraping
        return scrape_static(url)


# ──────────────────────────────────────────────
# AUTO-DETECT — tries static first, uses dynamic if content is too short
# ──────────────────────────────────────────────
async def scrape_url(url: str) -> Dict:
    """
    Smart scraper that detects whether to use static or dynamic method.
    First tries fast static scraping. If content seems empty (JS-rendered site),
    falls back to Playwright browser scraping.
    """
    # Try static first (fast)
    result = scrape_static(url)

    # If too little text was found, it's likely a JS-rendered site
    if result["success"] and len(result["text"]) < 200:
        result = await scrape_dynamic(url)

    return result


# ──────────────────────────────────────────────
# CRAWL — scrape multiple pages from same domain
# ──────────────────────────────────────────────
async def crawl_website(base_url: str, max_pages: int = 15) -> List[Dict]:
    """
    Crawls a website starting from base_url and follows internal links.
    Stops at max_pages to avoid scraping huge websites.
    Prioritizes important pages: /faq, /about, /policy, /terms, /contact
    """
    parsed = urlparse(base_url)
    domain = f"{parsed.scheme}://{parsed.netloc}"

    visited = set()
    to_visit = [base_url]
    results = []

    # Priority pages to look for
    PRIORITY_PATHS = [
        "/faq", "/faqs", "/about", "/about-us",
        "/privacy", "/privacy-policy", "/terms",
        "/terms-of-service", "/contact", "/contact-us",
        "/help", "/support", "/return-policy", "/refund"
    ]

    # Add priority pages to the front of the queue
    for path in PRIORITY_PATHS:
        priority_url = domain + path
        if priority_url not in to_visit:
            to_visit.insert(1, priority_url)

    while to_visit and len(visited) < max_pages:
        url = to_visit.pop(0)

        if url in visited:
            continue

        visited.add(url)

        # Scrape this page
        result = await scrape_url(url)
        if result["success"] and len(result["text"]) > 100:
            results.append(result)

            # Find more internal links to follow
            try:
                response = requests.get(url, headers=HEADERS, timeout=10)
                soup = BeautifulSoup(response.text, "html.parser")

                for link in soup.find_all("a", href=True):
                    href = link["href"]
                    full_url = urljoin(domain, href)

                    # Only follow links on the same domain
                    if (urlparse(full_url).netloc == parsed.netloc
                            and full_url not in visited
                            and full_url not in to_visit
                            and not any(ext in full_url for ext in
                                        [".pdf", ".jpg", ".png", ".zip", "#"])):
                        to_visit.append(full_url)
            except:
                pass

    return results


# ──────────────────────────────────────────────
# SCRAPE SPECIFIC URLs (user-provided list)
# ──────────────────────────────────────────────
async def scrape_specific_urls(urls: List[str]) -> List[Dict]:
    """
    Scrapes a specific list of URLs provided by the user.
    Used when user pastes their FAQ page, policy page etc. directly.
    """
    tasks = [scrape_url(url) for url in urls]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r["success"] and len(r["text"]) > 50]