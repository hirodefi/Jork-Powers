# Solana Power

Wallet management, transactions, and token swaps on Solana.

## Features

- Create encrypted wallets (AES-256)
- Store keypairs securely with password
- Check SOL balance
- Send SOL
- Swap tokens via Jupiter

## RPC Configuration

Default uses public Solana mainnet. For better performance, set:

```bash
export SOLANA_RPC="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
```

Or pass RPC URL to each command.

## Usage

```bash
# Create wallet
node index.js create mywallet mypassword

# List wallets
node index.js list

# Check balance
node index.js balance <address>

# Send SOL
node index.js send mywallet mypassword <to_address> 0.1

# Swap tokens (SOL -> USDC
 node index.js swap mywallet mypassword So1111111111111111111111111111111112 EPjFWdd5AufqzzGfCfSJLSJ7HbLx3zgvLTo5b6ELpDRp 100000000
```

## Wallet Storage

Wallets stored in `wallets/<name>.json` with:
- AES-256-CBC encryption
- PBKDF2 key derivation (100k iterations)
- Random salt + IV per wallet

## Dependencies

```bash
npm install @solana/web3.js @solana/spl-token
```
