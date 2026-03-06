News Power

Real-time news monitor for any topic via RSS feeds.

## Features

- Fetch latest headlines on demand
- Continuous monitoring with interval
- Add custom RSS feeds
- Built-in topics: general, crypto, tech

## Requirements

```bash
pip install feedparser requests
```

## Usage

```bash
python3 index.py fetch crypto
python3 index.py fetch tech
python3 index.py monitor crypto
python3 index.py add custom https://myblog.com/rss.xml
```
