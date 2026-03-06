#!/usr/bin/env python3
"""
Multi-backend search engine - no API keys required by default.
Falls back through backends automatically until results are found.
"""
import re, json, time, random
import requests
from urllib.parse import quote, urlencode

# Rotate user agents to avoid blocks
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
]

def _headers(referer=None):
    h = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }
    if referer:
        h["Referer"] = referer
    return h

def _get(url, **kwargs):
    kwargs.setdefault("timeout", 15)
    kwargs.setdefault("headers", _headers())
    try:
        r = requests.get(url, **kwargs)
        r.raise_for_status()
        return r
    except Exception as e:
        return None


# ---- DuckDuckGo ----

def ddg_instant(query):
    """DuckDuckGo instant answers API - fast, structured, no captcha"""
    r = _get(f"https://api.duckduckgo.com/?q={quote(query)}&format=json&no_html=1&skip_disambig=1")
    if not r:
        return []
    d = r.json()
    results = []
    if d.get("AbstractText"):
        results.append({"title": d.get("Heading", query), "url": d.get("AbstractURL", ""), "snippet": d["AbstractText"], "source": "ddg-instant"})
    for t in d.get("RelatedTopics", [])[:6]:
        if isinstance(t, dict) and t.get("Text") and t.get("FirstURL"):
            results.append({"title": t["Text"][:80], "url": t["FirstURL"], "snippet": t["Text"], "source": "ddg-instant"})
    return results

def ddg_html(query, max_results=10):
    """DuckDuckGo full HTML search - returns real search results, no API key, no JS required"""
    from bs4 import BeautifulSoup
    url = "https://html.duckduckgo.com/html/"
    data = {"q": query, "b": "", "kl": "us-en"}
    r = None
    try:
        r = requests.post(url, data=data, headers=_headers("https://duckduckgo.com/"), timeout=15)
    except Exception:
        return []
    if not r or not r.ok:
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    results = []
    for result in soup.select(".result")[:max_results]:
        title_el = result.select_one(".result__title a")
        snippet_el = result.select_one(".result__snippet")
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        href = title_el.get("href", "")
        # DDG wraps links - extract real URL
        if "uddg=" in href:
            import urllib.parse
            parsed = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
            href = parsed.get("uddg", [href])[0]
        snippet = snippet_el.get_text(strip=True) if snippet_el else ""
        if title and href:
            results.append({"title": title, "url": href, "snippet": snippet, "source": "ddg"})
    return results

def ddg_news(query, max_results=10):
    """DuckDuckGo news search"""
    from bs4 import BeautifulSoup
    url = "https://html.duckduckgo.com/html/"
    data = {"q": query, "iar": "news", "ia": "news"}
    try:
        r = requests.post(url, data=data, headers=_headers(), timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        results = []
        for result in soup.select(".result")[:max_results]:
            title_el = result.select_one(".result__title a")
            snippet_el = result.select_one(".result__snippet")
            if not title_el:
                continue
            results.append({
                "title": title_el.get_text(strip=True),
                "url": title_el.get("href", ""),
                "snippet": snippet_el.get_text(strip=True) if snippet_el else "",
                "source": "ddg-news"
            })
        return results
    except Exception:
        return []


# ---- Brave Search (free tier - 2000 req/month with key) ----

def brave_search(query, api_key, max_results=10):
    """Brave Search API - best quality results, 2000 free/month"""
    r = _get(
        f"https://api.search.brave.com/res/v1/web/search?q={quote(query)}&count={max_results}",
        headers={"Accept": "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": api_key}
    )
    if not r:
        return []
    data = r.json()
    results = []
    for item in data.get("web", {}).get("results", []):
        results.append({"title": item.get("title"), "url": item.get("url"), "snippet": item.get("description", ""), "source": "brave"})
    return results


# ---- Wikipedia ----

def wikipedia(query, sentences=5):
    """Wikipedia - best for factual queries, completely free, no rate limits"""
    r = _get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(query.replace(' ', '_'))}")
    if not r:
        # try search
        r = _get(f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={quote(query)}&format=json&srlimit=3")
        if not r:
            return []
        results = r.json().get("query", {}).get("search", [])
        return [{"title": res["title"], "url": f"https://en.wikipedia.org/wiki/{res['title'].replace(' ','_')}", "snippet": re.sub('<[^>]+>', '', res.get("snippet", "")), "source": "wikipedia"} for res in results]
    d = r.json()
    if d.get("extract"):
        text = ". ".join(d["extract"].split(". ")[:sentences])
        return [{"title": d.get("title", query), "url": d.get("content_urls", {}).get("desktop", {}).get("page", ""), "snippet": text, "source": "wikipedia"}]
    return []


# ---- Hacker News ----

def hackernews(query, max_results=10):
    """Hacker News Algolia API - great for tech topics, completely free"""
    r = _get(f"https://hn.algolia.com/api/v1/search?query={quote(query)}&tags=story&hitsPerPage={max_results}")
    if not r:
        return []
    hits = r.json().get("hits", [])
    results = []
    for h in hits:
        url = h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}"
        results.append({"title": h.get("title", ""), "url": url, "snippet": f"HN score: {h.get('points',0)} | comments: {h.get('num_comments',0)} | {h.get('author','')}", "source": "hackernews"})
    return results


# ---- GitHub ----

def github_search(query, search_type="repositories", max_results=8, token=None):
    """GitHub search API - repositories, code, issues. 60 req/hr unauthenticated, 5000 with token"""
    headers = _headers()
    headers["Accept"] = "application/vnd.github+json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = _get(f"https://api.github.com/search/{search_type}?q={quote(query)}&per_page={max_results}&sort=stars", headers=headers)
    if not r:
        return []
    items = r.json().get("items", [])
    results = []
    for item in items:
        if search_type == "repositories":
            desc = item.get("description") or ""
            results.append({"title": item.get("full_name", ""), "url": item.get("html_url", ""), "snippet": f"{desc} | stars: {item.get('stargazers_count',0)} | lang: {item.get('language','?')}", "source": "github"})
        elif search_type == "issues":
            results.append({"title": item.get("title", ""), "url": item.get("html_url", ""), "snippet": item.get("body", "")[:300], "source": "github-issues"})
    return results


# ---- arXiv ----

def arxiv_search(query, max_results=5):
    """arXiv academic papers - completely free, no key needed"""
    r = _get(f"https://export.arxiv.org/api/query?search_query=all:{quote(query)}&start=0&max_results={max_results}")
    if not r:
        return []
    import xml.etree.ElementTree as ET
    ns = "{http://www.w3.org/2005/Atom}"
    results = []
    try:
        root = ET.fromstring(r.text)
        for entry in root.findall(f"{ns}entry"):
            title = entry.find(f"{ns}title")
            summary = entry.find(f"{ns}summary")
            link = entry.find(f"{ns}id")
            authors = [a.find(f"{ns}name").text for a in entry.findall(f"{ns}author")[:3] if a.find(f"{ns}name") is not None]
            results.append({
                "title": title.text.strip().replace("\n", " ") if title is not None else "",
                "url": link.text.strip() if link is not None else "",
                "snippet": (summary.text.strip()[:400] if summary is not None else "") + f" | Authors: {', '.join(authors)}",
                "source": "arxiv"
            })
    except Exception:
        pass
    return results


# ---- OpenAlex (academic papers) ----

def openalex_search(query, max_results=5):
    """OpenAlex - 200M+ academic works, completely free"""
    r = _get(f"https://api.openalex.org/works?search={quote(query)}&per-page={max_results}&mailto=jork@agent.local")
    if not r:
        return []
    results = []
    for work in r.json().get("results", []):
        authors = [a.get("author", {}).get("display_name", "") for a in work.get("authorships", [])[:3]]
        results.append({
            "title": work.get("title", ""),
            "url": work.get("doi") or work.get("id", ""),
            "snippet": f"Cited by {work.get('cited_by_count',0)} | {work.get('publication_year','')} | {', '.join(authors)}",
            "source": "openalex"
        })
    return results


# ---- Multi-source search ----

def search(query, backends=None, max_results=10, brave_key=None, github_token=None):
    """
    Search across multiple backends with automatic fallback.
    Returns merged, deduplicated results ranked by source reliability.
    """
    if backends is None:
        backends = ["ddg", "wikipedia", "hackernews"]

    all_results = []
    seen_urls = set()

    for backend in backends:
        try:
            if backend == "ddg":
                results = ddg_html(query, max_results)
                if not results:
                    results = ddg_instant(query)
            elif backend == "ddg-news":
                results = ddg_news(query, max_results)
            elif backend == "brave" and brave_key:
                results = brave_search(query, brave_key, max_results)
            elif backend == "wikipedia":
                results = wikipedia(query)
            elif backend == "hackernews":
                results = hackernews(query, max_results=5)
            elif backend == "github":
                results = github_search(query, token=github_token)
            elif backend == "arxiv":
                results = arxiv_search(query)
            elif backend == "openalex":
                results = openalex_search(query)
            else:
                continue

            for r in results:
                url = r.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_results.append(r)
        except Exception:
            continue

    return all_results[:max_results]
