# Powers Index

| Power | Type | What it does |
|-------|------|--------------|
| web-search | bash | Search the web via DuckDuckGo |
| web-fetch | bash | Fetch and read a URL |
| search-memory | bash | Search journal and history |
| solana | node | Wallet, transactions, swaps |
| voice | python | Transcribe and generate speech |
| private-ip | python | Tor IP rotation for anonymous requests |
| x-search | python | Search X/Twitter without API via Nitter |
| reddit | python | Search and read Reddit without API key |
| news | python | Real-time news monitor from RSS feeds |
| graphics | python | Read images and generate graphics |
| earn | python | Make money: ClawTasks bounties, Reddit pain mining, digital products |
| research | python | Find data on anything: web search, URL fetch (anti-bot), academic, GitHub, HN |

## Usage

```bash
bash powers/web-search.sh "query"
node powers/solana/index.js create mywallet password
python3 powers/voice/index.py transcribe audio.oga
python3 powers/private-ip/index.py rotate
python3 powers/x-search/index.py search "solana defi"
python3 powers/reddit/index.py search "claude ai"
python3 powers/news/index.py fetch crypto
python3 powers/graphics/index.py read screenshot.png
python3 powers/earn/index.py overview
python3 powers/research/index.py deep "query" 3
```

## Adding a power

1. Create folder with README.md, config.json, index file
2. Add a row to this INDEX.md
3. Jork will find it next time she reads this file

## Structure

See STRUCTURE.md for standard power format.
