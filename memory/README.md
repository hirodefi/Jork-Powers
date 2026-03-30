# Memory Power

Zero-loss memory for Jork's Telegram conversation. Every message ever written is preserved. Retrieval is O(1) via binary offset index — no scanning, no compression, no data loss.

## What it does

- **Preserves** every message forever in an append-only log
- **Indexes** keywords and concepts at write-time — lookup only at read-time
- **Provides** instant context for Jork's think cycle: summary + recent + relevant
- **Searches** past conversations by keyword with no file scanning

No separate daemon. No dependencies. Pure Node.js.

## How it works

```
.jork/
├── history.jsonl         ← every message ever. append-only. never touched.
└── memory/
    ├── offsets.bin       ← 12 bytes per message. binary. zero-parse O(1) seek.
    ├── keywords.json     ← word → [message ids]
    ├── concepts.json     ← concept → [message ids]
    ├── wal.json          ← write-ahead log (recent mutations, flushed periodically)
    └── summary.md        ← 3-5 lines. Jork rewrites herself.
```

**Core law: all intelligence at write-time. Only lookup at read-time.**

Every new message: extract keywords + classify concept + append offset → done.
Every think cycle: seek 20 recent + seek relevant by concept → context in <5ms.

## Installation

```bash
cd powers/memory
```

No dependencies. Pure Node.js.

## Usage

### Get think-cycle context

```bash
node powers/memory/index.js context
```

Returns:
```
=== MEMORY CONTEXT ===

SUMMARY:
Building in Solana domain. Radar live on gRPC. Market making BAGS tokens.
Active goals: radar v2, memory power, grow treasury.

RECENT:
[1001] user: how's the radar working?
[1002] jork: Running smoothly, gRPC stream stable.

RELEVANT:
[radar] [988] jork: switched to gRPC after REST kept dropping
[goals] [889] jork: I want radar v2 out this week

=== END ===
```

### Search memory

```bash
node powers/memory/index.js query "gRPC pipeline"
```

Options:
- `--limit <n>` — max results (default: 10)

### Append a message

```bash
node powers/memory/index.js append --role user --msg "how's the radar?"
node powers/memory/index.js append --role jork  --msg "Running fine."
```

### Status

```bash
node powers/memory/index.js status
```

### Quick stats (JSON)

```bash
node powers/memory/index.js check
```

### Rebuild index (recovery / migration)

```bash
node powers/memory/index.js rebuild
```

Scans `history.jsonl` once and rebuilds all index files. Run this once when migrating from the old memory power, or after any crash.

## Jork integration

```js
const memory = require('./powers/memory');

// Every think cycle
const memCtx = memory.context();
const prompt = memCtx + '\n\n' + buildThinkPrompt(state);

// Every message in/out
memory.append('user', msg.text);
memory.append('jork', response);

// On shutdown
memory.close();
```

No process spawning. Module is loaded once, index stays in RAM.

## Configuration

Edit `config.json`:

```json
{
  "settings": {
    "recentWindow": 20,
    "contextConceptDepth": 5,
    "flushEvery": 5,
    "compactEvery": 1000
  }
}
```

- `recentWindow` — how many recent messages to include in context
- `contextConceptDepth` — how many relevant messages per concept
- `flushEvery` — flush WAL to disk every N messages
- `compactEvery` — compact WAL into main index every N messages

## Adding concepts

Edit `lib/Concepts.js` to add domain-specific patterns:

```js
const CONCEPTS = {
  radar:         /radar|grpc|pipeline|stream/i,
  market_making: /market.mak|spread|liquidity/i,
  // add yours here
};
```

Concepts are classified at write-time. Zero cost at read-time.

## Scale

| History     | offsets.bin | keywords.json | RAM usage | Context time |
|-------------|-------------|---------------|-----------|--------------|
| 1,000 msgs  | 12 KB       | ~150 KB       | <1 MB     | <2ms         |
| 10,000 msgs | 120 KB      | ~1.5 MB       | ~3 MB     | <3ms         |
| 100,000 msgs| 1.2 MB      | ~15 MB        | ~20 MB    | <5ms         |

At 300 messages/day, 100k messages ≈ 1 year of operation.

## License

MIT
