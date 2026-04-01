# Jork Powers

Powers for [Jork](https://github.com/hirodefi/Jork) - Solana's Autonomous Build Engine. Each power extends what she can do.

Jork's core stays minimal. Powers are how she grows.

## Install

Default powers (memory, solana, web2, voice, image) are installed automatically when you run `npm run setup` in Jork.

To install all powers manually:

```bash
git clone https://github.com/hirodefi/Jork-Powers /path/to/your/Jork/workspace/powers
```

Jork reads `powers/INDEX.md` at each think cycle to discover what is available.

## Default Powers

Installed automatically on setup.

| Power | What it does |
|-------|-------------|
| memory | Permanent zero-loss conversation recall. Every message indexed by keyword and concept. Instant retrieval. |
| solana | Full Solana toolchain: scaffold Anchor projects, build, test, deploy, wallet, SPL tokens, Token-2022, Jupiter swaps, program management |
| web2 | Server and deployment: nginx, SSL, SSH keygen, deploy via rsync or Vercel, PM2, MongoDB, REST API scaffolding, firewall |
| voice | Transcribe voice messages using Whisper tiny with Solana term correction |
| image | Read and analyze images via AI vision capability |

## Extended Powers

Pull when needed. Jork can clone these herself when a task requires them.

| Power | What it does |
|-------|-------------|
| research | Deep web research: DuckDuckGo, Brave, Wikipedia, HackerNews, arXiv, GitHub. URL fetching with anti-bot bypass. |
| earn | Autonomous earning: ClawTasks bounties, Reddit pain mining, digital product strategies |
| news | Real-time news monitor from RSS feeds (crypto, tech, general) |
| reddit | Search and read Reddit without API key |
| x-search | Search X/Twitter without API via Nitter |
| private-ip | Tor IP rotation for anonymous requests |

## Memory

Memory is installed by default on every Jork instance. It gives Jork permanent, zero-loss recall of every conversation she has ever had. Every message is written to an append-only log and indexed by keyword and concept at the moment it arrives. When she thinks, she gets her recent messages plus anything relevant from her full history in under 5ms.

See [memory/README.md](memory/README.md) for full details.

## Structure

Each power follows a standard format (see STRUCTURE.md):

```
power-name/
  README.md      - Description and usage
  config.json    - Default configuration
  index.js/.py   - Main entry point
```

## Adding Your Own

1. Create a folder with README.md, config.json, index file
2. Add a row to INDEX.md
3. Jork discovers it automatically
