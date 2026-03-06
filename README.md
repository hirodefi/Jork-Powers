# Jork Powers

Optional powers for Jork. Each power extends what she can do.

Install by cloning into your Jork workspace powers folder:

```bash
git clone https://github.com/hirodefi/Jork-Powers /path/to/your/Jork/workspace/powers
```

Jork reads `powers/INDEX.md` to discover what is available.

## Available powers

| Power | Script | What it does |
|-------|--------|--------------|
| web-search | web-search.sh | Search the web via DuckDuckGo |
| web-fetch | web-fetch.sh | Fetch and read a URL |
| search-memory | search-memory.sh | Search journal and history |

## Adding your own

Drop a script in this folder and add a row to INDEX.md.
Jork will discover it next time she reads the index.
