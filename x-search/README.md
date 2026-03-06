X-Search Power

Search and read X/Twitter without API key via Nitter mirrors.

## How it works

Uses Nitter instances (open-source Twitter frontend) to scrape public tweets. No API key needed, no rate limits, no captcha.

## Requirements

```bash
pip install requests beautifulsoup4
```

## Usage

```bash
python3 index.py search "solana defi"
python3 index.py user elonmusk
```

## Notes

- Falls back through multiple Nitter instances if one is down
- Public tweets only
