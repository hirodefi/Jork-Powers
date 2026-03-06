#!/usr/bin/env python3
"""ClawTasks API integration - USDC bounty marketplace on Base L2"""
import json, os, requests

BASE = "https://clawtasks.com/api"
SKILL_URL = "https://clawtasks.com/skill.md"

def _headers():
    key = os.environ.get("CLAWTASKS_API_KEY", "")
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"} if key else {}

def register(name, wallet_address):
    """Register agent on ClawTasks - returns api_key and referral_code"""
    r = requests.post(f"{BASE}/agents", json={"name": name, "wallet_address": wallet_address}, timeout=15)
    return r.json()

def verify(verification_code):
    """Verify agent after posting code to Moltbook (m/clawtasks)"""
    r = requests.post(f"{BASE}/agents/verify", json={"code": verification_code}, headers=_headers(), timeout=15)
    return r.json()

def list_bounties(status="open", min_amount=0):
    """List available bounties - filter by status and minimum USDC"""
    r = requests.get(f"{BASE}/bounties?status={status}", headers=_headers(), timeout=15)
    bounties = r.json() if r.ok else []
    if min_amount > 0:
        bounties = [b for b in bounties if b.get("amount", 0) >= min_amount]
    return bounties

def get_bounty(bounty_id):
    """Get full details for a specific bounty"""
    r = requests.get(f"{BASE}/bounties/{bounty_id}", headers=_headers(), timeout=15)
    return r.json()

def claim_bounty(bounty_id):
    """Claim a bounty - stakes 10% of amount from your balance"""
    r = requests.post(f"{BASE}/bounties/{bounty_id}/claim", headers=_headers(), timeout=15)
    return r.json()

def submit_work(bounty_id, content):
    """Submit completed work for a bounty
    content: the completed work as text (code, writing, analysis, etc.)
    For large files: upload externally, include the link here
    """
    r = requests.post(
        f"{BASE}/bounties/{bounty_id}/submit",
        json={"content": content},
        headers=_headers(),
        timeout=15
    )
    return r.json()

def submit_proposal(bounty_id, proposal, estimated_time_hours=None):
    """Submit a proposal for proposal-type bounties"""
    body = {"proposal": proposal}
    if estimated_time_hours:
        body["estimated_time_hours"] = estimated_time_hours
    r = requests.post(f"{BASE}/bounties/{bounty_id}/propose", json=body, headers=_headers(), timeout=15)
    return r.json()

def post_bounty(title, description, amount_usdc, mode="instant"):
    """Post a new bounty - use this to hire other agents for tasks
    mode: instant | proposal | contest | race
    Bounty starts unfunded - fund separately when ready
    """
    r = requests.post(
        f"{BASE}/bounties",
        json={"title": title, "description": description, "amount": amount_usdc, "mode": mode, "funded": False},
        headers=_headers(),
        timeout=15
    )
    return r.json()

def my_status():
    """Get your agent profile, balance, reputation, pending actions"""
    r = requests.get(f"{BASE}/agents/me", headers=_headers(), timeout=15)
    return r.json()

def pending():
    """Check for pending actions - proposals accepted, stakes due, direct assignments"""
    r = requests.get(f"{BASE}/agents/me/pending", headers=_headers(), timeout=15)
    return r.json()

def approve(bounty_id):
    """Approve submitted work as the poster - releases payment"""
    r = requests.post(f"{BASE}/bounties/{bounty_id}/approve", headers=_headers(), timeout=15)
    return r.json()

def reject(bounty_id, reason=""):
    """Reject submitted work - slashes worker stake, refunds you"""
    r = requests.post(f"{BASE}/bounties/{bounty_id}/reject", json={"reason": reason}, headers=_headers(), timeout=15)
    return r.json()

def get_referral_code():
    """Get your referral code - earn 2.5% of bounties your recruits complete"""
    me = my_status()
    return me.get("referral_code", "")

def format_bounty(b):
    """Human-readable bounty summary"""
    return (
        f"ID: {b.get('id')} | ${b.get('amount')} USDC | {b.get('mode','instant')} | "
        f"{b.get('title','')} | Deadline: {b.get('deadline','none')}"
    )

def suggest_work(bounty):
    """Given a bounty, suggest approach based on task type"""
    title = bounty.get("title", "").lower()
    desc = bounty.get("description", "").lower()
    combined = title + " " + desc

    if any(w in combined for w in ["write", "article", "blog", "guide", "doc"]):
        return "Writing task - use Claude directly, produce polished text, cite sources"
    if any(w in combined for w in ["code", "script", "api", "function", "python", "javascript"]):
        return "Code task - write clean, commented code with usage examples"
    if any(w in combined for w in ["research", "analyze", "compare", "summarize", "report"]):
        return "Research task - use web-search power, structure findings clearly"
    if any(w in combined for w in ["data", "extract", "format", "convert", "csv", "json"]):
        return "Data task - process systematically, validate output, explain format"
    return "General task - read requirements carefully, deliver exactly what is asked"
