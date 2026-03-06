#!/usr/bin/env python3
import sys, json, time

DEFAULT_SOURCES = {
    'general': [
        'https://feeds.bbc.co.uk/news/world/rss.xml',
        'https://rss.cnn.com/rss/edition.rss',
        'https://feeds.reuters.com/reuters/topNews',
    ],
    'crypto': [
        'https://cointelegraph.com/rss',
        'https://decrypt.co/rss',
    ],
    'tech': [
        'https://techcrunch.com/feed',
        'https://www.theregister.co.uk/headlines.atom',
    ]
}

def fetch_feed(url):
    """Fetch and parse RSS feed"""
    import feedparser
    feed = feedparser.parse(url)
    return [{
        'title': e.get('title', ''),
        'summary': e.get('summary', '')[:300],
        'link': e.get('link', ''),
        'time': e.get('published', '')
    } for e in feed.entries[:5]]

def monitor(topic, interval=120, callback=None):
    """Continuously poll for new headlines on a topic"""
    seen_titles = set()
    sources = DEFAULT_SOURCES.get(topic, DEFAULT_SOURCES['general'])
    while True:
        new_items = []
        for url in sources:
            try:
                items = fetch_feed(url)
                for item in items:
                    if item['title'] not in seen_titles:
                        seen_titles.add(item['title'])
                        new_items.append(item)
            except: pass
        if new_items and callback:
            callback(new_items)
        elif new_items:
            print(json.dumps(new_items, indent=2))
        time.sleep(interval)

def fetch_now(topic='general', limit=10):
    """Get current headlines on a topic"""
    sources = DEFAULT_SOURCES.get(topic, DEFAULT_SOURCES['general'])
    all_items = []
    for url in sources:
        try: all_items += fetch_feed(url)
        except: pass
    return all_items[:limit]

def add_feed(topic, url):
    """Add a custom RSS feed"""
    if topic not in DEFAULT_SOURCES:
        DEFAULT_SOURCES[topic] = []
    DEFAULT_SOURCES[topic].append(url)
    return {'msg': f'Added feed to {topic}'}

def run(args):
    cmd = args[0] if args else 'help'
    if cmd == 'fetch': return fetch_now(args[1] if len(args) > 1 else 'general')
    if cmd == 'monitor': monitor(args[1] if len(args) > 1 else 'general'); return 'monitor started'
    if cmd == 'add': return add_feed(args[1], args[2])
    return help()

def help():
    return 'News Power\nCommands:\n  fetch [topic] - Get latest headlines\n  monitor [topic] - Poll continuously\n  add <topic> <url> - Add RSS feed\nTopics: general, crypto, tech'

if __name__ == '__main__':
    result = run(sys.argv[1:])
    print(json.dumps(result, indent=2) if isinstance(result, (dict,list)) else result)
