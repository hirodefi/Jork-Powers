#!/usr/bin/env python3
"""
Content extraction and deep research utilities.
Synthesize search + fetch results into structured findings.
"""
import re

def extract_main_content(html_or_text, max_chars=6000):
    """
    Extract the most relevant content block from a page.
    Prefers article/main content over nav/sidebar/footer.
    """
    from bs4 import BeautifulSoup

    # if it's already plain text (e.g. from jina), just clean it
    if not html_or_text.strip().startswith("<"):
        return clean_text(html_or_text, max_chars)

    soup = BeautifulSoup(html_or_text, "html.parser")

    # remove noise elements
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "form", "advertisement"]):
        tag.decompose()

    # try semantic content containers first
    for selector in ["article", "main", '[role="main"]', ".post-content", ".article-body",
                     ".entry-content", ".content", "#content", "#main", ".prose"]:
        el = soup.select_one(selector)
        if el and len(el.get_text(strip=True)) > 200:
            return clean_text(el.get_text(separator="\n"), max_chars)

    # fall back to body
    body = soup.find("body")
    if body:
        return clean_text(body.get_text(separator="\n"), max_chars)

    return clean_text(soup.get_text(separator="\n"), max_chars)

def clean_text(text, max_chars=6000):
    """Normalize whitespace, remove garbage, trim"""
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # remove lines that are just whitespace or single chars
    lines = [l for l in text.split("\n") if len(l.strip()) > 1]
    return "\n".join(lines).strip()[:max_chars]

def format_results(results, max_snippet=300):
    """Format search results for Jork to read"""
    if not results:
        return "No results found."
    lines = []
    for i, r in enumerate(results, 1):
        lines.append(f"{i}. {r.get('title','(no title)')}")
        lines.append(f"   {r.get('url','')}")
        snippet = r.get("snippet", "")
        if snippet:
            lines.append(f"   {snippet[:max_snippet]}")
        lines.append("")
    return "\n".join(lines).strip()

def format_deep_research(query, results, fetched_pages, max_chars_per_page=3000):
    """
    Format a deep research output: query + all search results + fetched page content.
    This is what gets sent to Jork as context for answering research questions.
    """
    lines = [f"RESEARCH: {query}", "=" * 60, ""]

    if results:
        lines.append("SEARCH RESULTS:")
        lines.append(format_results(results))
        lines.append("")

    if fetched_pages:
        lines.append("PAGE CONTENT:")
        for page in fetched_pages:
            if not page.get("ok") or not page.get("text"):
                continue
            lines.append(f"--- {page.get('url', '')} ---")
            lines.append(page["text"][:max_chars_per_page])
            lines.append("")

    return "\n".join(lines)

def extract_facts(text):
    """
    Quick fact extraction - pull out numbers, dates, names from text.
    Useful for summarizing fetched pages.
    """
    facts = {}

    # numbers with context
    numbers = re.findall(r"[\$£€]?\d[\d,\.]*\s*(?:million|billion|thousand|M|B|K|%)?", text)
    if numbers:
        facts["numbers"] = list(set(numbers[:10]))

    # URLs mentioned
    urls = re.findall(r"https?://[^\s\"'<>]+", text)
    if urls:
        facts["urls"] = list(set(urls[:5]))

    # email addresses
    emails = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    if emails:
        facts["emails"] = list(set(emails[:5]))

    return facts
