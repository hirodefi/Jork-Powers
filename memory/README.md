# Memory Power

Stealth, minimal, robust memory management for Jork. Compress conversations into L0/L1/L2 format, query past sessions, and resume old conversations.

## What it does

- **Compress** large conversations to ~10% of original size
- **Query** past sessions by keyword
- **Resume** old conversations with full context
- **Manage** long-term memory efficiently

## Installation

```bash
cd powers/memory
chmod +x install.sh
./install.sh
```

## Usage

### Compress a session

```bash
node powers/memory/index.js compress path/to/session.jsonl
```

Compresses a JSONL conversation file into L0/L1/L2 format:
- **L0**: Session summary (~100 tokens)
- **L1**: Batch summaries (~2k tokens)
- **L2**: Recent messages (rolling window)

### Search compressed sessions

```bash
node powers/memory/index.js query "solana trading"
```

Options:
- `--limit <n>` - Max results (default: 10)
- `--snippets` - Show matching text snippets

### Resume a session

```bash
node powers/memory/index.js resume <session-id>
```

Options:
- `--format <text|markdown>` - Output format (default: text)

Outputs context you can paste into a new session.

### List all sessions

```bash
node powers/memory/index.js list
```

### Show status

```bash
node powers/memory/index.js status
```

## Architecture

```
memory/
├── index.js           # Main CLI
├── config.json        # Settings
├── lib/
│   ├── Storage.js     # File operations
│   ├── Compressor.js  # L0/L1/L2 compression
│   └── Querier.js     # Search and resume
└── install.sh         # Dependencies
```

## Storage

Compressed sessions are stored in `.memory/` in your workspace:

```
.memory/
├── index.json                    # Global index
└── <session-id>/
    ├── L0.json                   # Session summary
    ├── L1.json                   # Batch summaries
    ├── L2.json                   # Recent messages
    └── metadata.json             # Stats
```

## Configuration

Edit `config.json` to customize:

```json
{
  "settings": {
    "maxTokens": 100000,
    "rollingWindow": 50,
    "batchSize": 50
  }
}
```

- `maxTokens`: Auto-compress threshold
- `rollingWindow`: Recent messages to keep uncompressed
- `batchSize`: Messages per L1 batch

## Example

```bash
# Compress a large session
$ node index.js compress ~/.claude/projects/myproject/31eba705-c9c0-400e-895e-73be610c5d80.jsonl

🗜️  Compressing session...

File: /Users/you/.claude/projects/myproject/31eba705-c9c0-400e-895e-73be610c5d80.jsonl

✅ Session compressed!

Session ID: 31eba705-c9c0-400e-895e-73be610c5d80
Messages: 4733
Original tokens: 4200000
Compressed tokens: 156000
Reduction: 96.3%

# Search for something
$ node index.js query "market making"

🔍 Searching for: "market making"

Found 2 session(s):

1. 4209fb13-1569-40b1-b3a4-7f2cc2f55dfb
   Score: 15
   Messages: 1912

2. 31eba705-c9c0-400e-895e-73be610c5d80
   Score: 8
   Messages: 4733

# Resume a session
$ node index.js resume 4209fb13-1569-40b1-b3a4-7f2cc2f55dfb

📋 Session Context

=== SESSION CONTEXT ===

SUMMARY:
Session with 1912 messages. Key topics: solana, trading, market-making, defi

BATCH SUMMARIES:
[Batch 1] User asked about implementing market making system...
[Batch 2] Implemented price monitoring and profit calculations...
...

--- Paste the above into a new session to resume ---
```

## License

MIT
