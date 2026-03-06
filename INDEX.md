# Powers Index

| Power | Type | What it does |
|-------|------|--------------|
| web-search | bash | Search the web via DuckDuckGo |
| web-fetch | bash | Fetch and read a URL |
| search-memory | bash | Search journal and history |
| solana | node | Wallet, transactions, swaps |
| voice | python | Transcribe and generate speech |

## Usage

```bash
# Bash powers
bash powers/web-search.sh "your query"

# Node powers
node powers/solana/index.js create mywallet password

# Python powers
python3 powers/voice/index.py transcribe audio.oga
```

## Adding a power

1. Create folder or script in this directory
2. Add a row to this INDEX.md
3. Jork will find it next time she reads this file

## Structure

See STRUCTURE.md for standard power format.
