#!/usr/bin/env python3
"""
Research Power - Jork can find data on anything.

Backends (no API key required by default):
  Search:  DuckDuckGo HTML, DuckDuckGo news, Wikipedia, HackerNews, GitHub, arXiv
  Fetch:   Jina.ai reader (clean markdown, anti-bot), fast HTTP, Scrapling stealth/dynamic
  Special: academic papers (OpenAlex + arXiv), code/repos (GitHub), tech (HackerNews)

Optional (add keys to config.json for better results):
  BRAVE_API_KEY  - Brave Search: best quality results, 2000 free/month
  GITHUB_TOKEN   - GitHub: 5000 req/hr vs 60 unauthenticated
"""
import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))

from lib import search as search_lib
from lib import fetch as fetch_lib
from lib import extract as extract_lib

# load config
_cfg_path = os.path.join(os.path.dirname(__file__), "config.json")
try:
    _cfg = json.load(open(_cfg_path))
except Exception:
    _cfg = {}

def _brave_key():
    return os.environ.get("BRAVE_API_KEY") or _cfg.get("brave_api_key", "")

def _github_token():
    return os.environ.get("GITHUB_TOKEN") or _cfg.get("github_token", "")


# ---- search ----

def cmd_search(args):
    """Search the web - uses DDG HTML + Wikipedia + HN by default"""
    if not args:
        return "Usage: search <query>"
    query = " ".join(args)
    backends = ["ddg", "wikipedia", "hackernews"]
    if _brave_key():
        backends = ["brave"] + backends
    results = search_lib.search(query, backends=backends, max_results=12,
                                brave_key=_brave_key(), github_token=_github_token())
    return extract_lib.format_results(results)

def cmd_news(args):
    """Search news specifically"""
    if not args:
        return "Usage: news <query>"
    query = " ".join(args)
    results = search_lib.ddg_news(query, max_results=12)
    return extract_lib.format_results(results)

def cmd_academic(args):
    """Search academic papers - arXiv + OpenAlex (both free, no key)"""
    if not args:
        return "Usage: academic <query>"
    query = " ".join(args)
    results = search_lib.arxiv_search(query, max_results=5)
    results += search_lib.openalex_search(query, max_results=5)
    return extract_lib.format_results(results)

def cmd_code(args):
    """Search GitHub repositories and code"""
    if not args:
        return "Usage: code <query>"
    query = " ".join(args)
    results = search_lib.github_search(query, search_type="repositories",
                                        max_results=10, token=_github_token())
    return extract_lib.format_results(results)

def cmd_tech(args):
    """Search Hacker News for tech topics"""
    if not args:
        return "Usage: tech <query>"
    query = " ".join(args)
    results = search_lib.hackernews(query, max_results=12)
    return extract_lib.format_results(results)

def cmd_wiki(args):
    """Get Wikipedia summary for a topic"""
    if not args:
        return "Usage: wiki <topic>"
    query = " ".join(args)
    results = search_lib.wikipedia(query, sentences=10)
    return extract_lib.format_results(results)


# ---- fetch ----

def cmd_fetch(args):
    """
    Fetch and read a URL. Auto mode: tries Jina first (clean markdown), falls back to fast/stealth.
    Usage: fetch <url> [mode]
    Modes: auto (default) | jina | fast | stealth | dynamic
    """
    if not args:
        return "Usage: fetch <url> [auto|jina|fast|stealth|dynamic]"
    url = args[0]
    mode = args[1] if len(args) > 1 else "auto"
    result = fetch_lib.fetch(url, mode=mode)
    if not result["ok"]:
        return f"Failed to fetch {url}: {result.get('error','unknown error')}\nTry: fetch {url} stealth"
    return f"[{result['mode']} mode | {result['url']}]\n\n{result['text']}"


# ---- deep research ----

def cmd_deep(args):
    """
    Deep research: search + fetch top results + return full content.
    Usage: deep <query> [num_pages]
    """
    if not args:
        return "Usage: deep <query> [num_pages]"
    num_pages = 3
    if args[-1].isdigit():
        num_pages = int(args[-1])
        query = " ".join(args[:-1])
    else:
        query = " ".join(args)

    # search
    backends = ["ddg", "hackernews"]
    if _brave_key():
        backends = ["brave"] + backends
    results = search_lib.search(query, backends=backends, max_results=num_pages * 2,
                                brave_key=_brave_key())

    # fetch top N pages
    urls = [r["url"] for r in results if r.get("url")][:num_pages]
    fetched = fetch_lib.fetch_multiple(urls, mode="auto", max_chars=4000, delay=0.5)

    return extract_lib.format_deep_research(query, results, fetched)

def cmd_deep_academic(args):
    """
    Deep research using academic sources: arXiv + OpenAlex + fetch papers.
    Usage: deep-academic <query>
    """
    if not args:
        return "Usage: deep-academic <query>"
    query = " ".join(args)
    results = search_lib.arxiv_search(query, max_results=5)
    results += search_lib.openalex_search(query, max_results=5)
    urls = [r["url"] for r in results if r.get("url") and "arxiv" in r.get("url","")][:3]
    fetched = fetch_lib.fetch_multiple(urls, mode="jina", max_chars=4000)
    return extract_lib.format_deep_research(query, results, fetched)


# ---- specialized ----

def cmd_person(args):
    """Research a person - searches web, Wikipedia, GitHub, HN"""
    if not args:
        return "Usage: person <name>"
    name = " ".join(args)
    results = []
    results += search_lib.ddg_html(name, max_results=5)
    results += search_lib.wikipedia(name, sentences=8)
    results += search_lib.github_search(name, search_type="users", max_results=3, token=_github_token())
    results += search_lib.hackernews(name, max_results=3)
    return extract_lib.format_results(results)

def cmd_company(args):
    """Research a company - web + Wikipedia + HN + GitHub"""
    if not args:
        return "Usage: company <name>"
    name = " ".join(args)
    results = []
    results += search_lib.ddg_html(f"{name} company", max_results=5)
    results += search_lib.wikipedia(name, sentences=8)
    results += search_lib.hackernews(name, max_results=5)
    results += search_lib.github_search(name, search_type="repositories", max_results=3, token=_github_token())
    return extract_lib.format_results(results)

def cmd_price(args):
    """Get price/market data for a token or stock"""
    if not args:
        return "Usage: price <symbol or name>"
    query = " ".join(args)
    results = search_lib.ddg_html(f"{query} price today", max_results=5)
    results += search_lib.ddg_news(f"{query} price", max_results=5)
    return extract_lib.format_results(results)

def cmd_multi(args):
    """
    Search across all sources at once.
    Usage: multi <query>
    """
    if not args:
        return "Usage: multi <query>"
    query = " ".join(args)
    backends = ["ddg", "wikipedia", "hackernews", "arxiv", "github"]
    if _brave_key():
        backends = ["brave"] + backends
    results = search_lib.search(query, backends=backends, max_results=20,
                                brave_key=_brave_key(), github_token=_github_token())
    return extract_lib.format_results(results, max_snippet=250)


# ---- install ----

def cmd_install(_args):
    """Install optional dependencies for stealth/dynamic fetching"""
    return (
        "Base install (already works):\n"
        "  pip install requests beautifulsoup4\n\n"
        "For stealth fetching (Cloudflare bypass):\n"
        "  pip install 'scrapling[fetchers]'\n"
        "  scrapling install\n\n"
        "For dynamic/JS-heavy sites (full browser):\n"
        "  pip install 'scrapling[all]'\n"
        "  scrapling install\n\n"
        "For Brave Search (best quality, 2000/mo free):\n"
        "  Get key at https://api.search.brave.com\n"
        "  Set BRAVE_API_KEY env var or add to config.json\n\n"
        "For higher GitHub API limits:\n"
        "  Create token at https://github.com/settings/tokens\n"
        "  Set GITHUB_TOKEN env var or add to config.json"
    )


# ---- router ----

COMMANDS = {
    "search":        cmd_search,
    "news":          cmd_news,
    "academic":      cmd_academic,
    "code":          cmd_code,
    "tech":          cmd_tech,
    "wiki":          cmd_wiki,
    "fetch":         cmd_fetch,
    "deep":          cmd_deep,
    "deep-academic": cmd_deep_academic,
    "person":        cmd_person,
    "company":       cmd_company,
    "price":         cmd_price,
    "multi":         cmd_multi,
    "install":       cmd_install,
}

def run(args):
    cmd = args[0] if args else "help"
    rest = args[1:]
    if cmd in COMMANDS:
        return COMMANDS[cmd](rest)
    return help()

def help():
    return (
        "Research Power - find data on anything\n\n"
        "Search:\n"
        "  search <query>           - Web search (DDG + Wikipedia + HN)\n"
        "  news <query>             - News search\n"
        "  academic <query>         - Academic papers (arXiv + OpenAlex)\n"
        "  code <query>             - GitHub repositories\n"
        "  tech <query>             - Hacker News\n"
        "  wiki <topic>             - Wikipedia\n"
        "  multi <query>            - All sources at once\n\n"
        "Fetch:\n"
        "  fetch <url>              - Fetch URL (auto: jina -> fast -> stealth)\n"
        "  fetch <url> jina         - Jina.ai reader (best for LLM text)\n"
        "  fetch <url> stealth      - Anti-bot bypass (needs scrapling)\n"
        "  fetch <url> dynamic      - Full browser/Playwright (needs scrapling[all])\n\n"
        "Deep Research:\n"
        "  deep <query> [N]         - Search + fetch top N pages (default: 3)\n"
        "  deep-academic <query>    - arXiv + OpenAlex + fetch papers\n\n"
        "Specialized:\n"
        "  person <name>            - Research a person\n"
        "  company <name>           - Research a company\n"
        "  price <symbol>           - Token or stock price\n\n"
        "  install                  - Show install instructions for extra features\n"
    )

if __name__ == "__main__":
    result = run(sys.argv[1:])
    print(result if isinstance(result, str) else json.dumps(result, indent=2))
