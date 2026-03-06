# Research Power

Find data on anything. No API keys required out of the box.

## How it works

Three-layer stack:

**Search** - Multiple backends with automatic fallback:
- DuckDuckGo HTML (full results, no JS, no captcha)
- DuckDuckGo news (real-time news)
- Wikipedia (factual queries, completely free)
- Hacker News Algolia API (tech topics, completely free)
- GitHub search API (repos, issues - 60 req/hr free)
- arXiv API (academic papers, completely free)
- OpenAlex (200M+ academic works, completely free)
- Brave Search (optional, 2000 free/month - best quality)

**Fetch** - Smart URL reader with fallback chain:
1. `jina` - Jina.ai reader (`r.jina.ai/url`) - converts any URL to clean markdown, handles anti-bot via Jina's servers, free, no key
2. `fast` - Direct HTTP with UA rotation and retry headers
3. `stealth` - Scrapling stealth fetcher - Cloudflare bypass, fingerprint spoofing
4. `dynamic` - Scrapling + Playwright - full browser for JS-heavy sites

**Deep research** - Combines search + fetch into a single context block for answering complex questions.

## Requirements

```bash
pip install requests beautifulsoup4
```

## Optional (better results)

```bash
# Stealth fetching - bypasses Cloudflare, anti-bot
pip install 'scrapling[fetchers]'
scrapling install

# Dynamic fetching - full browser, handles any JS site
pip install 'scrapling[all]'
scrapling install
```

Set `BRAVE_API_KEY` for best search quality (free at api.search.brave.com, 2000/month).
Set `GITHUB_TOKEN` for higher GitHub API limits.

## Usage

```bash
# General web search
python3 index.py search "autonomous AI agents 2026"

# Fetch and read any URL (auto selects best method)
python3 index.py fetch https://example.com
python3 index.py fetch https://cloudflare-site.com stealth

# Deep research - search + fetch top pages
python3 index.py deep "zero human company setup" 3

# News
python3 index.py news "AI agent economy"

# Academic papers
python3 index.py academic "autonomous agent economic benchmark"
python3 index.py deep-academic "LLM agent task completion"

# Code and repos
python3 index.py code "web scraping anti-captcha python"

# Hacker News
python3 index.py tech "browser automation 2026"

# Wikipedia
python3 index.py wiki "Polymarket prediction market"

# Research a person or company
python3 index.py person "Nat Eliason"
python3 index.py company "Anthropic"

# Token/stock price
python3 index.py price "SOL"

# Everything at once
python3 index.py multi "ClawWork agent economy"

# Show install instructions
python3 index.py install
```

## Fetch modes explained

| Mode | When to use | Requires |
|------|-------------|---------|
| auto | Default - tries best method first | requests |
| jina | Best for LLM-ready clean text | requests (uses Jina's server) |
| fast | Most public pages | requests |
| stealth | Cloudflare, anti-bot sites | scrapling[fetchers] |
| dynamic | JS-heavy, requires browser | scrapling[all] |

## Sources included

| Source | Free | Key needed | Best for |
|--------|------|-----------|---------|
| DuckDuckGo HTML | yes | no | General web search |
| DuckDuckGo news | yes | no | News, current events |
| Wikipedia | yes | no | Facts, people, places |
| Hacker News | yes | no | Tech, startups, dev |
| GitHub | yes | no (60/hr) | Code, repos, projects |
| arXiv | yes | no | Academic CS/AI papers |
| OpenAlex | yes | no | All academic fields |
| Brave Search | yes | free key | Best all-purpose results |
