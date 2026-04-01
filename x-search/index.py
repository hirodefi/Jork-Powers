#!/usr/bin/env python3
import sys, json, re

NITTER_INSTANCES = [
    'https://nx.privacy.dev',
    'https://nitter.poast.org',
    'https://nitter.privacydev.net',
]

def _get(instance, path):
    import requests
    headers = {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}
    r = requests.get(instance + path, headers=headers, timeout=15)
    return r.text

def _parse_tweets(html):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    tweets = []
    for item in soup.select('.timeline-item'):
        content = item.select_one('.tweet-content')
        stats = item.find('time')
        if content:
            tweets.append({
                'text': content.get_text(strip=True),
                'time': stats['datetime'] if stats else ''
            })
    return tweets

def search(query, limit=20):
    """Search X/Twitter via Nitter"""
    import requests
    from urllib.parse import quote
    for instance in NITTER_INSTANCES:
        try:
            path = f'/search?f=tweets&q={quote(query)}'
            html = _get(instance, path)
            tweets = _parse_tweets(html)
            if tweets:
                return tweets[:limit]
        except Exception as e:
            continue
    return []

def user_tweets(username, limit=20):
    """Get tweets from a user"""
    for instance in NITTER_INSTANCES:
        try:
            html = _get(instance, f'/{username}')
            tweets = _parse_tweets(html)
            if tweets:
                return tweets[:limit]
        except:
            continue
    return []

def run(args):
    cmd = args[0] if args else 'help'
    if cmd == 'search': return search(' '.join(args[1:]))
    if cmd == 'user': return user_tweets(args[1])
    return help()

def help():
    return 'X-Search Power\nCommands:\n  search <query> - Search tweets\n  user <username> - Get user tweets'

if __name__ == '__main__':
    result = run(sys.argv[1:])
    print(json.dumps(result, indent=2) if isinstance(result, (dict,list)) else result)
