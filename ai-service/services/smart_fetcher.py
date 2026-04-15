# ai-service/services/smart_fetcher.py
"""
Smart URL fetcher — fetches live data via JSON APIs only.
No scraping. No HTML parsing. No BeautifulSoup.

Supported platforms:
  1. DigiChat Feed   → /digichat-feed.json  (MERN, PHP, Python, Django, Flask)
  2. Shopify         → /products.json        (auto-detected)
  3. WooCommerce     → /wp-json/wc/v3        (auto-detected)
  4. WordPress       → /wp-json/wp/v2        (auto-detected)
"""

import re
import httpx
from typing import Tuple, Optional

TIMEOUT    = 15
USER_AGENT = "DigiChatBot/1.0"


# ══════════════════════════════════════════════
# MAIN ENTRY
# ══════════════════════════════════════════════
async def smart_fetch(url: str) -> Tuple[str, str, int]:
    """
    Auto-detect platform and fetch live data via JSON API.

    Returns:
        (text, platform, item_count)
    """
    url = normalize_url(url)
    print(f"[SmartFetch] Fetching: {url}")

    # 1. DigiChat custom feed (MERN, PHP, Python, Django, Flask)
    result = await try_digichat_feed(url)
    if result:
        text, count = result
        print(f"[SmartFetch] DigiChat feed — {count} items")
        return text, "custom", count

    # 2. Shopify
    result = await try_shopify(url)
    if result:
        text, count = result
        print(f"[SmartFetch] Shopify — {count} products")
        return text, "shopify", count

    # 3. WooCommerce
    result = await try_woocommerce(url)
    if result:
        text, count = result
        print(f"[SmartFetch] WooCommerce — {count} products")
        return text, "woocommerce", count

    # 4. WordPress
    result = await try_wordpress(url)
    if result:
        text, count = result
        print(f"[SmartFetch] WordPress — {count} pages")
        return text, "wordpress", count

    # Nothing worked
    raise ValueError(
        "Could not connect to your website. "
        "Please add the DigiChat feed endpoint to your site. "
        "Check the setup guide in the dashboard."
    )


# ══════════════════════════════════════════════
# 1. DIGICHAT CUSTOM FEED
# Supports: MERN, PHP, Python, Django, Flask, Next.js
# ══════════════════════════════════════════════
async def try_digichat_feed(url: str) -> Optional[Tuple[str, int]]:
    endpoints = [
        f"{url}/digichat-feed.json",
        f"{url}/digichat-feed",
        f"{url}/api/digichat-feed",
        f"{url}/api/digichat-feed.json",
    ]

    for endpoint in endpoints:
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                r = await client.get(
                    endpoint,
                    headers={"User-Agent": USER_AGENT}
                )
                if r.status_code != 200:
                    continue

                data = r.json()

                # Must have at least one of these keys
                if not any(k in data for k in ["products", "pages", "business", "services"]):
                    continue

                text  = parse_digichat_feed(data)
                count = len(data.get("products", [])) + len(data.get("pages", []))
                return text, max(count, 1)

        except Exception:
            continue

    return None


def parse_digichat_feed(data: dict) -> str:
    """Convert DigiChat JSON feed to plain text."""
    parts = []

    if data.get("business"):
        parts.append(f"Business: {data['business']}")

    if data.get("description"):
        parts.append(f"About: {data['description']}")

    # Products
    products = data.get("products", [])
    if products:
        parts.append("\nProducts:")
        for p in products:
            line = f"- {p.get('name', '')}"
            if p.get("price"):
                line += f" | Price: {p['price']}"
            stock = p.get("stock") or p.get("quantity") or p.get("inventory")
            if stock is not None:
                available = int(stock) > 0
                line += f" | {'In Stock' if available else 'Out of Stock'} ({stock} units)"
            if p.get("description"):
                line += f" | {str(p['description'])[:200]}"
            if p.get("category"):
                line += f" | Category: {p['category']}"
            parts.append(line)

    # Services
    services = data.get("services", [])
    if services:
        parts.append("\nServices:")
        for s in services:
            if isinstance(s, dict):
                line = f"- {s.get('name', '')}"
                if s.get("price"):
                    line += f" | Price: {s['price']}"
                if s.get("description"):
                    line += f" | {s['description']}"
                parts.append(line)
            else:
                parts.append(f"- {s}")

    # Pages
    pages = data.get("pages", [])
    if pages:
        for page in pages:
            title   = page.get("title", "")
            content = page.get("content", "") or page.get("body", "")
            if title and content:
                parts.append(f"\n{title}:\n{str(content)[:500]}")

    # FAQs
    faqs = data.get("faqs", [])
    if faqs:
        parts.append("\nFAQs:")
        for faq in faqs:
            q = faq.get("question", "")
            a = faq.get("answer", "")
            if q and a:
                parts.append(f"Q: {q}\nA: {a}")

    # Contact
    contact = data.get("contact", {})
    if contact:
        parts.append("\nContact:")
        for key, val in contact.items():
            parts.append(f"{key.title()}: {val}")

    if data.get("hours") or data.get("workingHours"):
        hours = data.get("hours") or data.get("workingHours")
        parts.append(f"Working Hours: {hours}")

    if data.get("address"):
        parts.append(f"Address: {data['address']}")

    return "\n".join(parts)


# ══════════════════════════════════════════════
# 2. SHOPIFY
# Public endpoint — no API key needed
# ══════════════════════════════════════════════
async def try_shopify(url: str) -> Optional[Tuple[str, int]]:
    if "myshopify.com" not in url:
        # Check if /products.json exists
        exists = await check_endpoint(f"{url}/products.json")
        if not exists:
            return None

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                f"{url}/products.json?limit=250",
                headers={"User-Agent": USER_AGENT}
            )
            if r.status_code != 200:
                return None

            products = r.json().get("products", [])
            if not products:
                return None

            parts = [f"Store: {url}\n"]

            for p in products:
                variant = p["variants"][0] if p.get("variants") else {}
                price   = variant.get("price", "N/A")
                stock   = variant.get("inventory_quantity", 0)

                # Strip HTML from description using regex only (no bs4)
                desc = re.sub(r'<[^>]+>', ' ', p.get("body_html", ""))
                desc = re.sub(r'\s+', ' ', desc).strip()[:300]

                parts.append(
                    f"Product: {p['title']}\n"
                    f"Price: {price}\n"
                    f"Stock: {'In Stock' if stock > 0 else 'Out of Stock'} ({stock} units)\n"
                    f"Description: {desc}\n"
                )

            # Fetch pages
            pages_r = await client.get(
                f"{url}/pages.json",
                headers={"User-Agent": USER_AGENT}
            )
            if pages_r.status_code == 200:
                for page in pages_r.json().get("pages", []):
                    content = re.sub(r'<[^>]+>', ' ', page.get("body_html", ""))
                    content = re.sub(r'\s+', ' ', content).strip()[:500]
                    parts.append(f"\n{page['title']}:\n{content}")

            return "\n".join(parts), len(products)

    except Exception as e:
        print(f"[Shopify] Error: {e}")
        return None


# ══════════════════════════════════════════════
# 3. WOOCOMMERCE
# Public REST API — no credentials needed
# ══════════════════════════════════════════════
async def try_woocommerce(url: str) -> Optional[Tuple[str, int]]:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(
                f"{url}/wp-json/wc/v3/products?per_page=50&status=publish",
                headers={"User-Agent": USER_AGENT}
            )

            if r.status_code != 200:
                return None

            products = r.json()
            if not isinstance(products, list) or not products:
                return None

            parts = [f"Store: {url}\n"]

            for p in products:
                stock  = p.get("stock_quantity") or 0
                status = p.get("stock_status", "instock")
                desc   = re.sub(r'<[^>]+>', ' ', p.get("description", ""))
                desc   = re.sub(r'\s+', ' ', desc).strip()[:300]

                parts.append(
                    f"Product: {p['name']}\n"
                    f"Price: {p.get('price', 'N/A')}\n"
                    f"Stock: {'In Stock' if status == 'instock' else 'Out of Stock'}\n"
                    f"Description: {desc}\n"
                )

            return "\n".join(parts), len(products)

    except Exception as e:
        print(f"[WooCommerce] Error: {e}")
        return None


# ══════════════════════════════════════════════
# 4. WORDPRESS
# Public REST API — no credentials needed
# ══════════════════════════════════════════════
async def try_wordpress(url: str) -> Optional[Tuple[str, int]]:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            # Check if WordPress
            check = await client.get(
                f"{url}/wp-json/wp/v2",
                headers={"User-Agent": USER_AGENT}
            )
            if check.status_code != 200:
                return None

            parts = []

            # Pages
            pages_r = await client.get(
                f"{url}/wp-json/wp/v2/pages?per_page=20&status=publish",
                headers={"User-Agent": USER_AGENT}
            )
            if pages_r.status_code == 200:
                for page in pages_r.json():
                    title   = page["title"]["rendered"]
                    content = re.sub(r'<[^>]+>', ' ', page["content"]["rendered"])
                    content = re.sub(r'\s+', ' ', content).strip()[:500]
                    parts.append(f"{title}:\n{content}\n")

            # Posts
            posts_r = await client.get(
                f"{url}/wp-json/wp/v2/posts?per_page=20&status=publish",
                headers={"User-Agent": USER_AGENT}
            )
            if posts_r.status_code == 200:
                for post in posts_r.json():
                    title   = post["title"]["rendered"]
                    content = re.sub(r'<[^>]+>', ' ', post["content"]["rendered"])
                    content = re.sub(r'\s+', ' ', content).strip()[:500]
                    parts.append(f"{title}:\n{content}\n")

            if not parts:
                return None

            return "\n".join(parts), len(parts)

    except Exception as e:
        print(f"[WordPress] Error: {e}")
        return None


# ══════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════
async def check_endpoint(url: str) -> bool:
    """Check if a URL returns 200."""
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url, headers={"User-Agent": USER_AGENT})
            return r.status_code == 200
    except Exception:
        return False


def normalize_url(url: str) -> str:
    """Clean and normalize URL."""
    url = url.strip().rstrip("/")
    if not url.startswith("http"):
        url = "https://" + url
    return url