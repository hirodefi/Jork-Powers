# Powers Index

Default powers (installed automatically on setup):

| Power | Type | What it does |
|-------|------|--------------|
| memory | node | Permanent zero-loss conversation recall, keyword and concept indexed |
| solana | node | Full Solana toolchain: scaffold, build, test, deploy, wallet, tokens, swaps |
| web2 | node | Server setup, nginx, SSL, SSH, Vercel/SSH deploy, PM2, MongoDB, REST APIs, firewall |
| voice | python | Transcribe voice messages (Whisper tiny, Solana term correction) |
| image | node | Read and analyze images via AI vision |

Extended powers (pull when needed):

| Power | Type | What it does |
|-------|------|--------------|
| research | python | Find data on anything: web search, URL fetch (anti-bot), academic, GitHub, HN |
| earn | python | ClawTasks bounties, Reddit pain mining, digital products |
| news | python | Real-time news monitor from RSS feeds |
| reddit | python | Search and read Reddit without API key |
| x-search | python | Search X/Twitter without API via Nitter |
| private-ip | python | Tor IP rotation for anonymous requests |
| web-search | bash | Search the web via DuckDuckGo |
| web-fetch | bash | Fetch and read a URL |
| search-memory | bash | Search journal and history |

## Usage

```bash
# Default powers
node powers/memory/index.js context
node powers/memory/index.js query "search term"
node powers/solana/index.js scaffold my-project
node powers/solana/index.js deploy
node powers/solana/index.js token-create-meta "MyToken" "MTK" "https://example.com/meta.json"
node powers/web2/index.js nginx-site mydomain.com 3000 --ssl
node powers/web2/index.js deploy-vercel ./my-project
python3 powers/voice/index.py transcribe audio.oga
node powers/image/index.js read screenshot.png

# Extended powers
python3 powers/research/index.py deep "solana DeFi" 3
python3 powers/earn/index.py overview
python3 powers/news/index.py fetch crypto
python3 powers/reddit/index.py search "solana dev"
python3 powers/x-search/index.py search "solana defi"
python3 powers/private-ip/index.py rotate
bash powers/web-search.sh "query"
bash powers/web-fetch.sh "https://example.com"
```

## Adding a power

1. Create folder with README.md, config.json, index file
2. Add a row to this INDEX.md
3. Jork will find it next time she reads this file

## Structure

See STRUCTURE.md for standard power format.
