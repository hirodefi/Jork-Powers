# Jork Powers

Optional powers for [Jork](https://github.com/hirodefi/Jork). Each power extends what she can do.

Jork's core stays minimal. Powers are how she grows.

## Install

```bash
git clone https://github.com/hirodefi/Jork-Powers /path/to/your/Jork/workspace/powers
```

Jork reads `powers/INDEX.md` at each think cycle to discover what is available.

## Available Powers

| Power | Type | What it does |
|-------|------|--------------|
| web-search | bash | Search the web via DuckDuckGo |
| web-fetch | bash | Fetch and read any URL |
| search-memory | bash | Search Jork's journal and history |
| solana | node | Wallet creation, SOL transfers, token swaps via Jupiter |
| voice | python | Transcribe voice notes, generate speech, custom voices |
| private-ip | python | Tor IP rotation for anonymous requests |
| x-search | python | Search X/Twitter without API or captcha |
| reddit | python | Search and read Reddit without API key |
| news | python | Real-time news monitor from RSS feeds |
| graphics | python | Read images and generate graphics |

## Structure

Each power follows a standard format (see STRUCTURE.md):

```
power-name/
  README.md      - Description and usage
  CONFIG.json    - Default configuration
  index.js /.py  - Main entry point
```

## Adding Your Own

1. Create a folder with README.md, config.json, index file
2. Add a row to INDEX.md
3. Jork discovers it automatically
