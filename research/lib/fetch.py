#!/usr/bin/env python3
"""
Smart URL fetcher with multiple modes:
- jina:    r.jina.ai reader - clean markdown, bypasses most anti-bot (free, no key)
- fast:    httpx + UA rotation + retries - works on 90% of sites
- stealth: Scrapling stealthy fetcher - handles Cloudflare etc (needs scrapling[fetchers])
- dynamic: Scrapling dynamic fetcher via Playwright (needs scrapling[all] + scrapling install)
"""
import re, random, time
import requests

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
]

def _base_headers(url=""):
    domain = re.search(r"https?://([^/]+)", url)
    referer = f"https://{domain.group(1)}/" if domain else "https://www.google.com/"
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": referer,
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
    }

def html_to_text(html, max_chars=8000):
    """Strip HTML to clean readable text"""
    # remove scripts, styles, nav, footer, header, ads
    for tag in ["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "form"]:
        html = re.sub(rf"<{tag}[^>]*>.*?</{tag}>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    # remove HTML comments
    html = re.sub(r"<!--.*?-->", " ", html, flags=re.DOTALL)
    # convert block elements to newlines
    html = re.sub(r"<(br|p|div|h[1-6]|li|tr)[^>]*>", "\n", html, flags=re.IGNORECASE)
    # strip remaining tags
    html = re.sub(r"<[^>]+>", " ", html)
    # decode common HTML entities
    for entity, char in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&nbsp;", " "), ("&#39;", "'")]:
        html = html.replace(entity, char)
    # clean whitespace
    text = re.sub(r"[ \t]+", " ", html)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:max_chars]

def fetch_jina(url, max_chars=8000):
    """
    Jina.ai reader - converts any URL to clean LLM-ready markdown.
    Free, no key needed. Handles paywalls and anti-bot naturally via Jina's server.
    Best first choice for most URLs.
    """
    try:
        r = requests.get(
            f"https://r.jina.ai/{url}",
            headers={"User-Agent": random.choice(USER_AGENTS), "Accept": "text/plain,*/*"},
            timeout=20
        )
        if r.ok and len(r.text) > 100:
            return {"text": r.text[:max_chars], "mode": "jina", "url": url, "ok": True}
    except Exception as e:
        pass
    return {"text": "", "mode": "jina", "url": url, "ok": False, "error": "jina failed"}

def fetch_fast(url, max_chars=8000, retries=2):
    """
    Fast HTTP fetch with UA rotation and retry.
    Works for most public pages. Falls back to raw text extraction.
    """
    for attempt in range(retries):
        try:
            if attempt > 0:
                time.sleep(1 + attempt)
            r = requests.get(url, headers=_base_headers(url), timeout=15, allow_redirects=True)
            if r.ok:
                text = html_to_text(r.text, max_chars)
                if len(text) > 200:
                    return {"text": text, "mode": "fast", "url": r.url, "ok": True}
        except Exception as e:
            last_err = str(e)
    return {"text": "", "mode": "fast", "url": url, "ok": False, "error": last_err if 'last_err' in dir() else "fetch failed"}

def fetch_stealth(url, max_chars=8000):
    """
    Scrapling stealth fetcher - handles Cloudflare, anti-bot, fingerprint spoofing.
    Requires: pip install 'scrapling[fetchers]' && scrapling install
    Falls back to fast mode if not installed.
    """
    try:
        from scrapling.fetchers import StealthyFetcher
        page = StealthyFetcher.get(url)
        text = html_to_text(str(page.html), max_chars)
        return {"text": text, "mode": "stealth", "url": url, "ok": True}
    except ImportError:
        return fetch_fast(url, max_chars)
    except Exception as e:
        return {"text": "", "mode": "stealth", "url": url, "ok": False, "error": str(e)}

def fetch_dynamic(url, wait_for=None, max_chars=8000):
    """
    Scrapling dynamic fetcher - full Playwright browser automation.
    Handles JS-heavy sites, login flows, dynamic content.
    Requires: pip install 'scrapling[all]' && scrapling install
    Falls back to stealth mode if not installed.
    """
    try:
        from scrapling.fetchers import PlayWrightFetcher
        kwargs = {}
        if wait_for:
            kwargs["wait_for"] = wait_for
        page = PlayWrightFetcher.get(url, **kwargs)
        text = html_to_text(str(page.html), max_chars)
        return {"text": text, "mode": "dynamic", "url": url, "ok": True}
    except ImportError:
        return fetch_stealth(url, max_chars)
    except Exception as e:
        return {"text": "", "mode": "dynamic", "url": url, "ok": False, "error": str(e)}

def fetch(url, mode="auto", max_chars=8000):
    """
    Smart fetch with automatic mode selection and fallback chain.

    mode="auto"    - try jina first, fall back to fast, then stealth
    mode="jina"    - Jina.ai reader (best for LLM-ready text)
    mode="fast"    - Direct HTTP (fastest, works most places)
    mode="stealth" - Anti-bot bypass via Scrapling
    mode="dynamic" - Full browser via Playwright
    """
    if mode == "jina":
        return fetch_jina(url, max_chars)
    if mode == "fast":
        return fetch_fast(url, max_chars)
    if mode == "stealth":
        return fetch_stealth(url, max_chars)
    if mode == "dynamic":
        return fetch_dynamic(url, max_chars=max_chars)

    # auto mode: jina -> fast -> stealth
    result = fetch_jina(url, max_chars)
    if result["ok"]:
        return result
    result = fetch_fast(url, max_chars)
    if result["ok"]:
        return result
    return fetch_stealth(url, max_chars)

def fetch_multiple(urls, mode="auto", max_chars=4000, delay=0.5):
    """Fetch multiple URLs, returns list of results"""
    results = []
    for url in urls:
        results.append(fetch(url, mode=mode, max_chars=max_chars))
        if delay:
            time.sleep(delay)
    return results
