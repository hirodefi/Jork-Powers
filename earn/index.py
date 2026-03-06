#!/usr/bin/env python3
"""
Earn Power - Autonomous money-making for Jork
Strategies: ClawTasks bounties, Reddit pain mining, digital products
"""
import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))

from lib import clawtasks, pain_miner

def cmd_clawtasks(args):
    subcmd = args[0] if args else "help"

    if subcmd == "list":
        min_usd = float(args[1]) if len(args) > 1 else 0
        bounties = clawtasks.list_bounties(min_amount=min_usd)
        if not bounties:
            return "No open bounties found. Check https://clawtasks.com"
        lines = [f"Open bounties ({len(bounties)}):\n"]
        for b in bounties[:15]:
            lines.append("  " + clawtasks.format_bounty(b))
            lines.append("  Approach: " + clawtasks.suggest_work(b))
            lines.append("")
        return "\n".join(lines)

    if subcmd == "claim":
        if len(args) < 2:
            return "Usage: clawtasks claim <bounty_id>"
        result = clawtasks.claim_bounty(args[1])
        return json.dumps(result, indent=2)

    if subcmd == "submit":
        if len(args) < 3:
            return "Usage: clawtasks submit <bounty_id> <work_content>"
        result = clawtasks.submit_work(args[1], " ".join(args[2:]))
        return json.dumps(result, indent=2)

    if subcmd == "propose":
        if len(args) < 3:
            return "Usage: clawtasks propose <bounty_id> <proposal>"
        result = clawtasks.submit_proposal(args[1], " ".join(args[2:]))
        return json.dumps(result, indent=2)

    if subcmd == "post":
        if len(args) < 4:
            return "Usage: clawtasks post <title> <description> <amount_usdc>"
        result = clawtasks.post_bounty(args[1], args[2], float(args[3]))
        return json.dumps(result, indent=2)

    if subcmd == "status":
        result = clawtasks.my_status()
        return json.dumps(result, indent=2)

    if subcmd == "pending":
        result = clawtasks.pending()
        return json.dumps(result, indent=2)

    if subcmd == "register":
        if len(args) < 3:
            return "Usage: clawtasks register <agent_name> <wallet_address>"
        result = clawtasks.register(args[1], args[2])
        return json.dumps(result, indent=2)

    if subcmd == "referral":
        code = clawtasks.get_referral_code()
        if code:
            return f"Your referral code: {code}\nShare it - you earn 2.5% of every bounty your recruits complete (first 10 each)"
        return "No referral code found. Are you registered?"

    return (
        "ClawTasks commands:\n"
        "  list [min_usdc]           - Browse open bounties\n"
        "  claim <id>                - Claim a bounty (stakes 10%)\n"
        "  submit <id> <work>        - Submit completed work\n"
        "  propose <id> <proposal>   - Submit proposal (proposal-type)\n"
        "  post <title> <desc> <$>   - Post a new bounty\n"
        "  status                    - Your balance, reputation, stats\n"
        "  pending                   - Actions waiting on you\n"
        "  register <name> <wallet>  - Register as new agent\n"
        "  referral                  - Your referral code\n\n"
        "Setup: Set CLAWTASKS_API_KEY environment variable after registering\n"
        "Docs: https://clawtasks.com/skill.md"
    )

def cmd_pain(args):
    subcmd = args[0] if args else "help"

    if subcmd == "analyze":
        subreddit = args[1] if len(args) > 1 else "freelance"
        min_up = int(args[2]) if len(args) > 2 else 200
        print(f"Mining r/{subreddit} for pain points (min {min_up} upvotes)...\n")
        results = pain_miner.mine_subreddit(subreddit, min_upvotes=min_up)
        if not results:
            return f"No high-scoring pain points found in r/{subreddit}"
        lines = [f"Top pain points in r/{subreddit} ({len(results)} found):\n"]
        for p in results[:5]:
            lines.append(pain_miner.format_pain(p))
            lines.append("-" * 60)
        return "\n".join(lines)

    if subcmd == "search":
        keyword = " ".join(args[1:]) if len(args) > 1 else "freelance"
        print(f"Mining all subreddits related to '{keyword}'...\n")
        # find matching subreddits
        matching = []
        for cat, subs in pain_miner.SUBREDDITS.items():
            if keyword.lower() in cat or any(keyword.lower() in s for s in subs):
                matching.extend(subs)
        if not matching:
            matching = ["freelance", "smallbusiness", "SaaS"]
        results = []
        for sub in matching[:4]:
            results.extend(pain_miner.mine_subreddit(sub))
        results = sorted(results, key=lambda x: x["pain_score"], reverse=True)[:10]
        if not results:
            return "No strong pain points found. Try a different keyword."
        lines = [f"Top pain points for '{keyword}':\n"]
        for p in results[:5]:
            lines.append(pain_miner.format_pain(p))
            lines.append("-" * 60)
        return "\n".join(lines)

    if subcmd == "opportunities":
        print("Mining all subreddits for top opportunities...\n")
        results = pain_miner.mine_all(min_upvotes=300)
        if not results:
            return "No high-scoring opportunities found right now."
        lines = ["Top opportunities across all subreddits:\n"]
        for p in results[:5]:
            lines.append(pain_miner.format_pain(p))
            lines.append("-" * 60)
        return "\n".join(lines)

    if subcmd == "categories":
        lines = ["Available subreddit categories:\n"]
        for cat, subs in pain_miner.SUBREDDITS.items():
            lines.append(f"  {cat}: {', '.join(subs)}")
        return "\n".join(lines)

    return (
        "Pain mining commands:\n"
        "  analyze <subreddit> [min_upvotes]  - Deep mine one subreddit\n"
        "  search <keyword>                   - Search by topic keyword\n"
        "  opportunities                      - Top picks across all subreddits\n"
        "  categories                         - Show available categories\n\n"
        "Examples:\n"
        "  pain analyze freelance 500\n"
        "  pain search accounting\n"
        "  pain opportunities"
    )

def cmd_products(args):
    subcmd = args[0] if args else "help"

    if subcmd == "ideas":
        return """
Digital product ideas that agents can build and sell:

GUIDES & PLAYBOOKS ($19-$49)
- "How to hire an AI" (proven - Felix sold this)
- "AI automation for [profession]" - pick any profession
- "The [industry] operations playbook"
- "How to set up your first autonomous agent"

TEMPLATES ($9-$29)
- Notion template for [specific workflow]
- Airtable base for [specific use case]
- Google Sheets dashboard for [metric]
- Contract/invoice template pack

SCRIPTS & TOOLS ($29-$99)
- Python script for [specific automation]
- Browser extension for [specific task]
- API integration between [two tools]
- Data export/transform tool

RESEARCH REPORTS ($19-$49 one-time or $9-$29/mo recurring)
- Weekly AI tools roundup
- Weekly [industry] trends
- Monthly [market] analysis

WHERE TO SELL
- Gumroad: easiest, no code, instant payouts
- Lemon Squeezy: better for EU/VAT compliance
- Stripe: most control, needs more setup
- Direct on your site: best margin, needs audience

PRICING RULES
- Never price at $1 (get fewer signups than $0)
- $19/$29 are sweet spots for info products
- $49 feels premium without needing much trust
- $99+ requires testimonials and case studies
- Offer 30-50% affiliate commission to get others to promote
        """.strip()

    if subcmd == "template":
        title = " ".join(args[1:]) if len(args) > 1 else "My Guide"
        return f"""
Guide template outline for: "{title}"

---
TITLE: {title}

INTRODUCTION (1-2 pages)
- Who this is for
- What problem it solves
- What you will get from reading this

THE PROBLEM IN DEPTH (2-3 pages)
- Why this problem exists
- How most people try to solve it and fail
- What the cost of not solving it is

THE SOLUTION (5-10 pages)
- The framework or approach
- Step by step breakdown
- Common mistakes to avoid

IMPLEMENTATION (5-10 pages)
- Exact steps, in order
- Tools and resources needed
- Time and cost estimates

EXAMPLES (2-3 pages)
- Before/after case study (real or constructed)
- What success looks like

APPENDIX
- Templates, checklists, or scripts
- Useful links and resources
---

Format: Google Docs > export PDF
Price: $29 to start, test demand before raising
Platform: Gumroad (free to start, 10% fee)
        """.strip()

    return (
        "Product commands:\n"
        "  ideas              - Product types that work for agents\n"
        "  template <title>   - Guide/playbook outline template\n"
    )

def cmd_overview(_args):
    return """
EARN POWER - WHAT TO DO RIGHT NOW

The honest order of operations:

1. CLAWTASKS (start here - real USDC, no audience needed)
   - Register: python3 index.py clawtasks register <name> <wallet>
   - Post intro to m/clawtasks (Moltbook) with your skill file link
   - Browse: python3 index.py clawtasks list 2
   - Pick a writing or research task (your strengths)
   - Complete 5-10 small tasks to build reputation
   - Direct hire offers come to agents with track records

2. PAIN MINING (parallel track - identify what to build)
   - python3 index.py pain opportunities
   - Read top 5 results carefully
   - Pick ONE pain point you can solve in a day
   - Build the minimum viable solution (template or guide)

3. DIGITAL PRODUCT (after you have one validated idea)
   - python3 index.py products ideas
   - Create on Gumroad (5 min setup)
   - Promote on the subreddit where you found the pain
   - Add to Moltbook posts with link

4. REINVEST
   - Use ClawTasks to hire other agents for tasks you are weak at
   - Use referral code to earn 2.5% passively from recruits
   - Scale what works

REALITY CHECK
- The agent economy is 90% infrastructure right now
- Distribution beats everything - build audience while earning
- Small consistent bounty wins beat chasing big ones
- Felix worked because Nat had 100K+ readers - build that over time

KEY LINKS
- ClawTasks: https://clawtasks.com/skill.md
- ClawWork benchmark: https://github.com/HKUDS/ClawWork
- Felix model: https://felixcraft.ai
    """.strip()

def run(args):
    cmd = args[0] if args else "help"
    rest = args[1:]

    if cmd == "clawtasks": return cmd_clawtasks(rest)
    if cmd == "pain": return cmd_pain(rest)
    if cmd == "products": return cmd_products(rest)
    if cmd == "overview": return cmd_overview(rest)
    return help()

def help():
    return (
        "Earn Power - autonomous money making\n\n"
        "Commands:\n"
        "  overview                    - What to do right now (start here)\n"
        "  clawtasks <subcommand>      - ClawTasks bounty marketplace\n"
        "  pain <subcommand>           - Reddit pain point mining\n"
        "  products <subcommand>       - Digital product strategies\n\n"
        "Quick start:\n"
        "  python3 index.py overview\n"
        "  python3 index.py clawtasks list\n"
        "  python3 index.py pain opportunities"
    )

if __name__ == "__main__":
    result = run(sys.argv[1:])
    print(result if isinstance(result, str) else json.dumps(result, indent=2))
