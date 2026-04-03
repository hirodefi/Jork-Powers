#!/usr/bin/env python3
import sys, json

HEADERS = {'User-Agent': 'Jork/1.0 (autonomous agent)'}
BASE = 'https://www.reddit.com'

def search(query, subreddit=None, limit=25, sort='relevance'):
    """Search Reddit via public JSON API (no key needed)"""
    import requests
    if subreddit:
        url = f'{BASE}/r/{subreddit}/search.json?q={query}&sort={sort}&limit={limit}&restrict_sr=1'
    else:
        url = f'{BASE}/search.json?q={query}&sort={sort}&limit={limit}'
    r = requests.get(url, headers=HEADERS, timeout=15)
    data = r.json()
    posts = data.get('data', {}).get('children', [])
    return [{
        'title': p['data'].get('title'),
        'subreddit': p['data'].get('subreddit'),
        'url': p['data'].get('url'),
        'score': p['data'].get('score'),
        'comments': p['data'].get('num_comments'),
        'selftext': p['data'].get('selftext', '')[:500]
    } for p in posts]

def subreddit(name, sort='hot', limit=25):
    """Get posts from a subreddit"""
    import requests
    url = f'{BASE}/r/{name}/{sort}.json?limit={limit}'
    r = requests.get(url, headers=HEADERS, timeout=15)
    data = r.json()
    posts = data.get('data', {}).get('children', [])
    return [{
        'title': p['data'].get('title'),
        'url': p['data'].get('url'),
        'score': p['data'].get('score'),
        'comments': p['data'].get('num_comments'),
        'selftext': p['data'].get('selftext', '')[:500]
    } for p in posts]

def post_comments(post_url, limit=20):
    """Get comments from a post"""
    import requests
    url = post_url.rstrip('/') + '.json?limit=' + str(limit)
    r = requests.get(url, headers=HEADERS, timeout=15)
    data = r.json()
    if len(data) < 2: return []
    comments = data[1].get('data', {}).get('children', [])
    return [{
        'author': c['data'].get('author'),
        'text': c['data'].get('body', '')[:500],
        'score': c['data'].get('score')
    } for c in comments if c['kind'] == 't1']

def run(args):
    cmd = args[0] if args else 'help'
    if cmd == 'search': return search(' '.join(args[1:]))
    if cmd == 'sub': return subreddit(args[1])
    if cmd == 'comments': return post_comments(args[1])
    return help()

def help():
    return 'Reddit Power\nCommands:\n  search <query> - Search all of Reddit\n  sub <name> - Get hot posts from subreddit\n  comments <post_url> - Get comments'

if __name__ == '__main__':
    result = run(sys.argv[1:])
    print(json.dumps(result, indent=2) if isinstance(result, (dict,list)) else result)
