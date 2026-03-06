# Powers Index

| Power | Script | What it does |
|-------|--------|--------------|
| web-search | web-search.sh | Search the web via DuckDuckGo |
| web-fetch | web-fetch.sh | Fetch and read a URL |
| search-memory | search-memory.sh | Search journal and history |

## Usage

Call any power from bash:
```bash
bash powers/web-search.sh "your query"
bash powers/web-fetch.sh "https://example.com"
bash powers/search-memory.sh "keyword"
```

Or from a think cycle, use the Bash tool directly.

## Adding a power

1. Drop a script in this folder
2. Add a row to this INDEX.md
3. Jork will find it next time she reads this file
