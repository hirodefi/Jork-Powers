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
| memory | node | Permanent zero-loss memory - installed by default |
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

## Memory

Memory is the one power that ships with every Jork install. Setup installs it automatically - you never have to think about it.

It gives Jork permanent, zero-loss recall of every conversation she has ever had. Every message is written to an append-only log and indexed by keyword and concept at the moment it arrives - no compression, no summarisation, nothing thrown away. When she thinks, she gets her recent messages plus anything relevant from her full history in under 5ms, regardless of how long she has been running.

The older she gets, the more she knows. Memory never slows her down.

See [memory/README.md](memory/README.md) for full details.

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
