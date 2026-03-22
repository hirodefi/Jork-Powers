# Memory Power

Stealth memory management for Jork's Telegram conversation. Compresses the growing chat history into L0/L1/L2 layers for efficient long-term memory.

## What it does

Jork has one continuous Telegram chat that grows over time. This power:

- **Compresses** old messages into layered summaries
- **Keeps** recent messages in a rolling window
- **Queries** past conversations by keyword
- **Provides** context for Jork's think cycle

No separate daemon needed - Jork calls this directly during her think cycle.

## Installation

```bash
cd powers/memory
```

No dependencies required - pure Node.js.

## Usage

### Check if compression needed

```bash
node powers/memory/index.js check
```

Returns JSON for Jork to parse:
```json
{"needsCompression":false,"historyTokens":5000,"historyMessages":120,"threshold":100000}
```

### Compress history

```bash
node powers/memory/index.js compress
```

Options:
- `--force` - Compress even if below threshold

Compresses `history.jsonl` into L0/L1/L2 layers:
- **L0**: Overall summary (~100 tokens)
- **L1**: Batch summaries (~50 messages each)
- **L2**: Recent message previews

### Get context

```bash
node powers/memory/index.js context
```

Returns context Jork can use in her think cycle.

Options:
- `--format json` - Output as JSON
- `--maxBatches 10` - Limit batch summaries

### Search memory

```bash
node powers/memory/index.js query "solana trading"
```

Options:
- `--limit <n>` - Max results (default: 10)

### Show status

```bash
node powers/memory/index.js status
```

## Architecture

```
memory/
├── index.js           # Main CLI
├── config.json        # Settings
└── lib/
    ├── Storage.js     # File operations
    ├── Compressor.js  # L0/L1/L2 compression
    └── Querier.js     # Search and context
```

## Storage

Compressed layers stored in `.jork/memory/`:

```
.jork/
├── history.jsonl      # Recent messages (rolling window)
└── memory/
    └── layers.json    # L0/L1/L2 compressed data
```

## Configuration

Edit `config.json`:

```json
{
  "settings": {
    "maxTokens": 100000,
    "rollingWindow": 100,
    "batchSize": 50
  }
}
```

- `maxTokens`: Auto-compress threshold
- `rollingWindow`: Recent messages to keep uncompressed
- `batchSize`: Messages per L1 batch

## How Jork uses it

During her think cycle, Jork:

1. **Checks** if compression needed: `node powers/memory/index.js check`
2. **Compresses** if threshold exceeded: `node powers/memory/index.js compress`
3. **Gets context** for thinking: `node powers/memory/index.js context`

All runs within Jork's existing PM2 process - no separate daemon.

## Example

```bash
$ node index.js status

📊 Jork Memory Status

Nucleus: /path/to/.jork

History:
  Exists: true
  Messages: 150
  Tokens: 12000

Compressed Memory:
  Exists: true
  Tokens: 800
  Last compressed: 3/22/2026, 5:00:00 PM

Compression ratio: 93.3%
Needs compression: No

$ node index.js context

=== MEMORY CONTEXT ===

SUMMARY: Conversation with 500 messages. Topics: solana, trading, defi, radar

TOPICS: solana, trading, defi, radar, wallet, api

KEY PAST CONTEXT:
[Batch 8] Discussed implementing market making for BAGS tokens...
[Batch 9] Fixed radar pipeline issues with gRPC...

RECENT MESSAGES:
  [recent] User: how's the radar working?
  [recent] Jork: Running smoothly now...

=== STATS ===
Total messages: 500
Compression: 93.3%
```

## License

MIT
