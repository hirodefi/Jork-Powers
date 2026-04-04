# Jork Powers

Powers for [Jork](https://github.com/hirodefi/Jork) - Solana's Autonomous Build Engine. Each power extends what she can do.

Jork's core stays minimal. Powers are how she grows.

## Install

Default powers (memory, solana, web2, voice, image) are installed automatically when you run `npm run setup` in Jork.

To install all powers manually:

```bash
git clone https://github.com/hirodefi/Jork-Powers /path/to/your/Jork/workspace/powers
```

## Default Powers

Installed automatically on setup.

| Power | What it does |
|-------|-------------|
| memory | Conversation recall with keyword indexing, concept classification, synonym expansion (14 groups), and recency-weighted search. O(1) seek via binary offset index. |
| solana | Full Solana toolchain: scaffold, build, test, deploy (devnet + mainnet), wallet (AES-256 encrypted), SPL tokens, Token-2022, Jupiter swaps, tx-history, account-info, diagnose (30+ errors), deploy-verify. Plus patterns.md reference with wallet connection, escrow, vault, staking, AMM, NFT, DAO, Blinks, Pyth oracle patterns. |
| web2 | Server and deployment: nginx (proxy, SPA, API+frontend), SSL via certbot, SSH keygen, deploy via rsync or Vercel, PM2 process management, MongoDB, REST API scaffolding, firewall, deploy checklist. Plus patterns.md with project structures, database patterns, quality standards. |
| voice | Transcribe voice messages using Whisper tiny with Solana term correction (14 term mappings). |
| image | Read and analyze images via AI vision. Validates format, converts to base64 for LLM providers. |

## Extended Powers

Pull when needed. Jork can clone these herself when a task requires them.

| Power | What it does |
|-------|-------------|
| research | Deep web research: DuckDuckGo, Brave, Wikipedia, HackerNews, arXiv, GitHub. URL fetching with anti-bot bypass (Jina, Scrapling). |
| earn | Autonomous earning: ClawTasks bounties, Reddit pain mining, digital product strategies |
| news | Real-time news monitor from RSS feeds (crypto, tech, general) |
| reddit | Search and read Reddit without API key |
| x-search | Search X/Twitter without API via Nitter |
| private-ip | Tor IP rotation for anonymous requests |

## Memory Power

Memory gives Jork permanent, zero-loss recall of every conversation. Features:

- Append-only history (history.jsonl), never loses data
- Binary offset index (offsets.bin) for O(1) message seek
- Keyword extraction and concept classification at write time
- 17 concept categories (solana_program, pda, token, nft, defi, deployment, transaction, ecosystem, wallet, frontend, infrastructure, goals, issues, identity, cofounder)
- Synonym expansion: 14 groups (wallet->phantom/adapter/keypair, token->spl/mint/supply, etc.)
- Recency-weighted search scoring (recent relevant beats old exact)
- Context building: recent 20 messages + concept-relevant messages in under 5ms

See [memory/README.md](memory/README.md) for full details.

## Solana Power

Full Solana development toolchain. 25+ commands covering the entire build lifecycle.

Key commands: `scaffold`, `build`, `test`, `deploy`, `deploy-mainnet`, `wallet-create`, `token-create`, `token-create-meta`, `tx-history`, `account-info`, `account-tokens`, `diagnose`, `deploy-verify`, `swap`.

Includes `patterns.md` with code snippets for: wallet connection (React), balance fetching, transaction history, escrow, vault, staking, AMM, Jupiter swap, NFT minting (Metaplex Core), DAO/governance, Solana Actions/Blinks, Pyth oracle, Anchor constraints, priority fees, version compatibility.

See [solana/README.md](solana/README.md) for full command list.

## Web2 Power

Server setup, deployment, and infrastructure. 15+ commands.

Key commands: `nginx-site`, `nginx-spa`, `nginx-api-frontend`, `ssl`, `ssh-keygen`, `deploy-ssh`, `deploy-vercel`, `deploy-checklist`, `pm2-start`, `firewall-setup`, `api-scaffold`.

Includes `patterns.md` with: nginx configs (SPA, API+frontend, WebSocket, rate limiting), project structures (Next.js, React+Vite, Express), deployment checklist, database patterns (MongoDB, PostgreSQL), quality standards (responsive design, error boundaries, CORS, logging).

See [web2/README.md](web2/README.md) for full command list.

## Structure

Each power follows a standard format (see STRUCTURE.md):

```
power-name/
  README.md      - Description and usage
  config.json    - Default configuration
  index.js/.py   - Main entry point
  patterns.md    - Reference patterns and code snippets (optional)
  lib/           - Helper modules (optional)
```

## Adding Your Own

1. Create a folder with README.md, config.json, index file
2. Add a row to INDEX.md
3. Jork discovers it automatically
