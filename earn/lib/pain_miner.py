#!/usr/bin/env python3
"""Reddit pain point mining - find validated business problems worth solving"""
import json, requests, sys

HEADERS = {"User-Agent": "Jork/1.0 (autonomous agent)"}
BASE = "https://www.reddit.com"

# High-value subreddits for pain mining by category
SUBREDDITS = {
    "professional": ["freelance", "consulting", "smallbusiness", "entrepreneur"],
    "tech": ["webdev", "devops", "SaaS", "selfhosted", "programming"],
    "finance": ["accounting", "financialplanning", "personalfinance", "bookkeeping"],
    "marketing": ["marketing", "SEO", "PPC", "socialmedia", "copywriting"],
    "ecommerce": ["ecommerce", "Etsy", "dropship", "FulfillmentByAmazon"],
    "legal": ["legaladvice", "LawFirm", "paralegal"],
    "hr": ["humanresources", "recruiting", "WorkAdvice"],
}

# Pain signal phrases - posts containing these are gold
PAIN_SIGNALS = [
    "does anyone know a tool",
    "i have to manually",
    "why doesn't",
    "i'd pay for",
    "is there a way to automate",
    "i hate having to",
    "does anyone else struggle",
    "every time i have to",
    "wish there was",
    "can't find anything that",
    "we spend hours every week",
    "our biggest bottleneck",
    "i've been looking for",
    "no good solution for",
    "how do you all handle",
]

def get_top_posts(subreddit, sort="top", time="all", limit=50):
    """Get top posts from a subreddit"""
    url = f"{BASE}/r/{subreddit}/{sort}.json?t={time}&limit={limit}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        posts = r.json().get("data", {}).get("children", [])
        return [p["data"] for p in posts]
    except:
        return []

def get_comments(post_url, limit=30):
    """Get top comments from a post"""
    try:
        url = post_url.rstrip("/") + ".json?limit=" + str(limit)
        r = requests.get(url, headers=HEADERS, timeout=15)
        data = r.json()
        if len(data) < 2:
            return []
        comments = data[1].get("data", {}).get("children", [])
        return [
            {"text": c["data"].get("body", "")[:600], "score": c["data"].get("score", 0)}
            for c in comments if c.get("kind") == "t1"
        ]
    except:
        return []

def score_pain(post):
    """Score a post for pain signal strength"""
    text = (post.get("title", "") + " " + post.get("selftext", "")).lower()
    score = post.get("score", 0)
    comments = post.get("num_comments", 0)

    pain_score = 0

    # upvotes = number of people with same problem
    if score >= 500:
        pain_score += 30
    elif score >= 200:
        pain_score += 20
    elif score >= 100:
        pain_score += 10

    # comments = depth of pain + feature requirements
    if comments >= 100:
        pain_score += 20
    elif comments >= 50:
        pain_score += 10

    # pain signal phrases
    for signal in PAIN_SIGNALS:
        if signal in text:
            pain_score += 15

    # "would pay" or "$" in post = validated willingness to pay
    if "would pay" in text or "i'd pay" in text or "willing to pay" in text:
        pain_score += 25

    return pain_score

def mine_subreddit(subreddit, min_upvotes=200):
    """Mine a subreddit for pain points - returns scored, sorted list"""
    posts = get_top_posts(subreddit, sort="top", time="all", limit=100)
    results = []

    for post in posts:
        if post.get("score", 0) < min_upvotes:
            continue
        if post.get("is_self") is False and not post.get("selftext"):
            continue  # skip pure link posts with no context

        pain = score_pain(post)
        if pain > 0:
            results.append({
                "subreddit": subreddit,
                "title": post.get("title"),
                "url": f"https://reddit.com{post.get('permalink', '')}",
                "upvotes": post.get("score"),
                "comments": post.get("num_comments"),
                "pain_score": pain,
                "preview": post.get("selftext", "")[:300],
            })

    return sorted(results, key=lambda x: x["pain_score"], reverse=True)

def mine_all(category=None, min_upvotes=200):
    """Mine all subreddits (or a category) for pain points"""
    subs = []
    if category and category in SUBREDDITS:
        subs = SUBREDDITS[category]
    else:
        for v in SUBREDDITS.values():
            subs.extend(v)

    all_results = []
    for sub in subs:
        results = mine_subreddit(sub, min_upvotes)
        all_results.extend(results)

    return sorted(all_results, key=lambda x: x["pain_score"], reverse=True)[:20]

def assess_opportunity(pain_post):
    """Given a pain post, assess what type of solution to build and rough pricing"""
    title = pain_post.get("title", "").lower()
    upvotes = pain_post.get("upvotes", 0)

    # Estimate solution type based on complexity signals
    if any(w in title for w in ["template", "spreadsheet", "notion", "airtable"]):
        solution = "Template/spreadsheet - build in a day, sell $9-29"
    elif any(w in title for w in ["automate", "script", "tool", "software"]):
        solution = "Script or micro-tool - build in 1-3 days, sell $29-99 one-time or $9-29/mo"
    elif any(w in title for w in ["guide", "how to", "process", "workflow"]):
        solution = "Playbook/guide - write in hours, sell $19-49"
    elif any(w in title for w in ["api", "integration", "connect", "sync"]):
        solution = "Integration script - build in 2-5 days, sell $49-199"
    else:
        solution = "Research further - could be template, guide, or tool"

    # Rough market size estimate
    if upvotes >= 1000:
        market = "Large - 10K+ people likely have this problem"
    elif upvotes >= 500:
        market = "Medium - 2K-10K people with this problem"
    else:
        market = "Small - 500-2K people, still viable for micro-product"

    return {"solution_type": solution, "market_size": market}

def format_pain(p, include_assessment=True):
    """Format a pain point for display"""
    lines = [
        f"Pain Score: {p['pain_score']} | Upvotes: {p['upvotes']} | Comments: {p['comments']}",
        f"Subreddit: r/{p['subreddit']}",
        f"Title: {p['title']}",
        f"URL: {p['url']}",
    ]
    if p.get("preview"):
        lines.append(f"Preview: {p['preview'][:200]}...")
    if include_assessment:
        assessment = assess_opportunity(p)
        lines.append(f"Suggested approach: {assessment['solution_type']}")
        lines.append(f"Market size: {assessment['market_size']}")
    return "\n".join(lines)
