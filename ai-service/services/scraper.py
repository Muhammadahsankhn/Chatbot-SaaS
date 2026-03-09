"""
ai-service/services/scraper.py

Fetch strategy:
  1. Selenium (headless Chrome) — for React/Next.js/Vue JS-rendered sites
  2. httpx fallback             — for static HTML sites

Works with Python 3.14 on Windows.
"""

import asyncio
import re
import time
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

# ── URL patterns to skip ──
SKIP_URL_PATTERNS = [
    r"\.(jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|exe|dmg)$",
    r"/(cart|checkout|login|register|account|my-account|wp-admin|wp-login)",
    r"/(tag|author|date|feed|rss|sitemap|robots)",
    r"\?(s=|search=|q=)",
]

PAGE_TYPES = {
    "product":  ["product", "shop", "store", "item", "buy", "catalogue"],
    "policy":   ["policy", "terms", "conditions", "privacy", "refund", "return", "warranty"],
    "faq":      ["faq", "frequently-asked", "questions", "help", "support"],
    "contact":  ["contact", "reach-us", "get-in-touch", "location"],
    "about":    ["about", "who-we-are", "our-story", "team", "mission"],
    "pricing":  ["pricing", "plans", "packages", "rates"],
    "service":  ["service", "solutions", "offerings", "what-we-do"],
    "project":  ["project", "portfolio", "work", "case-study"],
}


# ──────────────────────────────────────────────
# SELENIUM FETCH — for JS-rendered sites
# Runs in thread executor (selenium is sync)
# ──────────────────────────────────────────────
def _selenium_fetch_sync(url: str) -> Optional[str]:
    """Sync function — runs in thread via asyncio executor."""
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.chrome.options import Options
        from webdriver_manager.chrome import ChromeDriverManager

        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )
        driver.set_page_load_timeout(20)

        try:
            driver.get(url)
            time.sleep(3)  # wait for JS to render
            html = driver.page_source
            return html
        finally:
            driver.quit()

    except Exception as e:
        print(f"[Selenium] Error for {url}: {e}")
        return None


async def fetch_with_selenium(url: str) -> Optional[str]:
    """Run selenium in thread so it doesn't block FastAPI event loop."""
    loop = asyncio.get_event_loop()
    html = await loop.run_in_executor(None, _selenium_fetch_sync, url)
    return html


# ──────────────────────────────────────────────
# HTTPX FETCH — for static sites (faster)
# ──────────────────────────────────────────────
async def fetch_with_httpx(url: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(
            timeout          = 15,
            follow_redirects = True,
            headers          = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
            }
        ) as c:
            r = await c.get(url)
            if r.status_code == 200:
                return r.text
            print(f"[httpx] HTTP {r.status_code} for {url}")
    except Exception as e:
        print(f"[httpx] Error for {url}: {e}")
    return None


# ──────────────────────────────────────────────
# IS PAGE JS-RENDERED? Check if httpx got empty content
# ──────────────────────────────────────────────
def is_js_rendered(html: str) -> bool:
    """Returns True if the page looks empty (React/Next.js shell)."""
    soup      = BeautifulSoup(html, "html.parser")
    body_text = soup.get_text(strip=True)

    # Very little text = JS rendered, content not loaded yet
    if len(body_text) < 200:
        return True

    # Common React/Next.js patterns
    if soup.find(id="__NEXT_DATA__"):      # Next.js
        return False  # Next.js has SSR data in script tag — parse it
    if soup.find(id="root") and len(body_text) < 500:
        return True   # React app with empty root

    return False


# ──────────────────────────────────────────────
# MAIN FETCH — tries httpx first, Selenium if JS-rendered
# ──────────────────────────────────────────────
async def fetch_page_html(url: str) -> Optional[str]:
    # Step 1: Try httpx (fast, no browser needed)
    html = await fetch_with_httpx(url)

    # Step 2: If content looks empty/JS-rendered, use Selenium
    if not html or is_js_rendered(html):
        print(f"[Scraper] JS-rendered site detected, using Selenium for {url}")
        html = await fetch_with_selenium(url)

    return html


# ──────────────────────────────────────────────
# NEXT.JS SSR DATA EXTRACTION
# Next.js embeds full page data in __NEXT_DATA__ script
# ──────────────────────────────────────────────
def extract_nextjs_data(html: str) -> Optional[str]:
    """Extract content from Next.js __NEXT_DATA__ if available."""
    try:
        import json
        soup        = BeautifulSoup(html, "html.parser")
        next_data   = soup.find("script", id="__NEXT_DATA__")
        if not next_data:
            return None

        data    = json.loads(next_data.string)
        props   = data.get("props", {}).get("pageProps", {})

        # Recursively extract all string values
        texts = []
        def extract_strings(obj, depth=0):
            if depth > 5:
                return
            if isinstance(obj, str) and len(obj) > 20:
                texts.append(obj)
            elif isinstance(obj, dict):
                for v in obj.values():
                    extract_strings(v, depth + 1)
            elif isinstance(obj, list):
                for item in obj:
                    extract_strings(item, depth + 1)

        extract_strings(props)
        if texts:
            return "\n".join(texts[:50])  # max 50 text pieces
    except Exception:
        pass
    return None


# ──────────────────────────────────────────────
# CLEAN TEXT from HTML
# ──────────────────────────────────────────────
def get_clean_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "noscript", "iframe", "svg",
                     "header", "footer", "nav", "aside"]):
        tag.decompose()

    noise = ["cookie", "popup", "modal", "overlay", "newsletter",
             "advertisement", "ads", "banner", "sidebar", "widget",
             "social", "share", "breadcrumb", "pagination", "related"]
    for tag in list(soup.find_all(True)):
        tag_id    = (tag.get("id")    or "").lower()
        tag_class = " ".join(tag.get("class") or []).lower()
        if any(p in tag_id or p in tag_class for p in noise):
            tag.decompose()

    main = (
        soup.find("main") or
        soup.find("article") or
        soup.find(id=re.compile(r"^(main|content|primary)$", re.I)) or
        soup.find(class_=re.compile(r"\b(main|content|entry|post[-_]?body)\b", re.I)) or
        soup.find("body") or
        soup
    )

    return main.get_text(separator="\n", strip=True)


# ──────────────────────────────────────────────
# DETECT PAGE TYPE
# ──────────────────────────────────────────────
def detect_page_type(url: str, html: str) -> str:
    url_lower = url.lower()
    for page_type, keywords in PAGE_TYPES.items():
        if any(kw in url_lower for kw in keywords):
            return page_type

    soup = BeautifulSoup(html, "html.parser")

    title = soup.find("title")
    if title:
        tl = title.get_text().lower()
        for page_type, keywords in PAGE_TYPES.items():
            if any(kw in tl for kw in keywords):
                return page_type

    h1 = soup.find("h1")
    if h1:
        hl = h1.get_text().lower()
        for page_type, keywords in PAGE_TYPES.items():
            if any(kw in hl for kw in keywords):
                return page_type

    return "general"


# ──────────────────────────────────────────────
# EXTRACTORS
# ──────────────────────────────────────────────
def extract_product(html: str, url: str) -> str:
    soup  = BeautifulSoup(html, "html.parser")
    parts = []

    cards = (
        soup.find_all(class_=re.compile(r"product[-_]?card|product[-_]?item", re.I)) or
        soup.find_all("li",      class_=re.compile(r"product", re.I)) or
        soup.find_all("article", class_=re.compile(r"product", re.I))
    )
    if len(cards) > 3:
        parts.append("Products available:")
        seen = set()
        for card in cards[:25]:
            name_el  = card.find(class_=re.compile(r"title|name", re.I)) or card.find(["h2", "h3", "h4"])
            price_el = card.find(class_=re.compile(r"price|cost", re.I))
            name     = name_el.get_text(strip=True)  if name_el  else ""
            price    = price_el.get_text(strip=True) if price_el else ""
            if name and name not in seen:
                seen.add(name)
                parts.append(f"- {name}" + (f": {price}" if price else ""))
        return "\n".join(parts)

    h1 = soup.find("h1")
    if h1:
        parts.append(f"Product: {h1.get_text(strip=True)}")

    price = soup.find(class_=re.compile(r"\bprice\b|\bcost\b|\bamount\b", re.I))
    if price:
        parts.append(f"Price: {price.get_text(strip=True)}")

    desc = soup.find(class_=re.compile(r"description|summary", re.I))
    if desc:
        parts.append(f"Description: {desc.get_text(separator=' ', strip=True)[:600]}")

    return "\n".join(parts) if parts else get_clean_text(html)[:1200]


def extract_policy(html: str, url: str) -> str:
    soup  = BeautifulSoup(html, "html.parser")
    parts = []
    h1    = soup.find("h1")
    if h1:
        parts.append(f"Policy: {h1.get_text(strip=True)}")
    for p in soup.find_all("p"):
        t = p.get_text(strip=True)
        if len(t) > 40:
            parts.append(t)
        if len("\n".join(parts)) > 2000:
            break
    return "\n".join(parts) if parts else get_clean_text(html)[:2000]


def extract_faq(html: str, url: str) -> str:
    soup  = BeautifulSoup(html, "html.parser")
    parts = ["FAQs:"]
    found = False
    for h in soup.find_all(["h3", "h4"]):
        q  = h.get_text(strip=True)
        np = h.find_next_sibling(["p", "div"])
        if np:
            a = np.get_text(strip=True)
            if q and a and len(a) > 10:
                parts.append(f"Q: {q}\nA: {a}")
                found = True
    if not found:
        parts.append(get_clean_text(html)[:1500])
    return "\n\n".join(parts)


def extract_contact(html: str, url: str) -> str:
    soup      = BeautifulSoup(html, "html.parser")
    full_text = soup.get_text(separator="\n")
    parts     = ["Contact Information:"]

    phones = re.findall(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", full_text)
    if phones:
        parts.append(f"Phone: {', '.join(list(set(phones))[:3])}")

    emails = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", full_text)
    if emails:
        parts.append(f"Email: {', '.join(list(set(emails))[:3])}")

    whatsapp = re.findall(r"whatsapp[:\s]+([+\d\s-]{10,15})", full_text, re.I)
    if whatsapp:
        parts.append(f"WhatsApp: {whatsapp[0].strip()}")

    if len(parts) == 1:
        parts.append(get_clean_text(html)[:800])

    return "\n".join(parts)


def extract_general(html: str, url: str) -> str:
    # Try Next.js data first
    nextjs = extract_nextjs_data(html)
    if nextjs and len(nextjs) > 100:
        return nextjs[:2000]
    return get_clean_text(html)[:2000]


EXTRACTORS = {
    "product": extract_product,
    "policy":  extract_policy,
    "faq":     extract_faq,
    "contact": extract_contact,
    "about":   extract_general,
    "pricing": extract_general,
    "service": extract_general,
    "project": extract_general,
    "general": extract_general,
}


# ──────────────────────────────────────────────
# DISCOVER LINKS
# ──────────────────────────────────────────────
def should_skip_url(url: str) -> bool:
    return any(re.search(p, url, re.I) for p in SKIP_URL_PATTERNS)


def discover_links(html: str, base_url: str) -> List[str]:
    soup  = BeautifulSoup(html, "html.parser")
    base  = urlparse(base_url)
    links = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith(("javascript:", "mailto:", "tel:", "#")):
            continue
        full   = urljoin(base_url, href)
        parsed = urlparse(full)
        if parsed.netloc != base.netloc:
            continue
        clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
        if clean and not should_skip_url(clean):
            links.add(clean)

    return list(links)


# ──────────────────────────────────────────────
# SCRAPE SINGLE PAGE
# ──────────────────────────────────────────────
async def scrape_page(url: str) -> Dict:
    print(f"[Scraper] Scraping: {url}")
    try:
        html = await fetch_page_html(url)
        if not html:
            return {"url": url, "success": False, "error": "Failed to fetch", "links": []}

        page_type = detect_page_type(url, html)
        extractor = EXTRACTORS.get(page_type, extract_general)
        text      = extractor(html, url)

        if not text or len(text.strip()) < 50:
            return {"url": url, "success": False, "error": "Too little content", "links": []}

        soup      = BeautifulSoup(html, "html.parser")
        title_tag = soup.find("title")
        title     = title_tag.get_text(strip=True) if title_tag else url

        print(f"[Scraper] ✅ {url} → type={page_type}, chars={len(text)}")

        return {
            "url":       url,
            "title":     title,
            "page_type": page_type,
            "text":      text,
            "success":   True,
            "links":     discover_links(html, url),
        }
    except Exception as e:
        print(f"[Scraper] Error for {url}: {e}")
        return {"url": url, "success": False, "error": str(e), "links": []}


# ──────────────────────────────────────────────
# SCRAPE SPECIFIC URLs
# ──────────────────────────────────────────────
async def scrape_specific_urls(urls: List[str]) -> List[Dict]:
    results = []
    for url in urls:
        if should_skip_url(url):
            continue
        result = await scrape_page(url)
        if result.get("success"):
            results.append(result)
        await asyncio.sleep(1)
    return results


# ──────────────────────────────────────────────
# CRAWL ENTIRE WEBSITE
# ──────────────────────────────────────────────
async def crawl_website(base_url: str, max_pages: int = 50) -> List[Dict]:
    if not base_url.startswith("http"):
        base_url = "https://" + base_url
    base_url = base_url.rstrip("/")

    visited  = set()
    queue    = [base_url]
    results  = []
    priority = ["service", "project", "about", "contact", "faq", "pricing",
                "product", "shop", "policy", "portfolio"]

    print(f"[Crawl] Starting crawl of {base_url}, max {max_pages} pages")

    while queue and len(visited) < max_pages:
        queue.sort(key=lambda u: 0 if any(p in u.lower() for p in priority) else 1)

        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)

        result = await scrape_page(url)

        if result.get("success"):
            results.append(result)
            for link in result.get("links", []):
                if link not in visited and link not in queue:
                    if urlparse(link).netloc == urlparse(base_url).netloc:
                        queue.append(link)

        await asyncio.sleep(1)  # polite delay + let JS settle

    print(f"[Crawl] ✅ Done. {len(results)} pages scraped from {base_url}")
    return results