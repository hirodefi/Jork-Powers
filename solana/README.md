# Solana Power

Full Solana toolchain. One power, everything you need.

## Commands

```bash
# Info
node index.js config
node index.js balance [address]
node index.js airdrop [amount]

# Build lifecycle
node index.js scaffold my-project
node index.js build [dir]
node index.js test [dir]
node index.js deploy [dir]
node index.js keys [dir]
node index.js verify <program-id>

# Wallet
node index.js wallet-create <name> <password>
node index.js wallet-list
node index.js wallet-balance <name> <password>

# Tokens
node index.js token-create [decimals]
node index.js token-create-meta <name> <symbol> <uri> [decimals]
node index.js token-mint <mint> <amount>
node index.js token-transfer <mint> <amount> <recipient>

# Swap (Jupiter)
node index.js swap <inputMint> <outputMint> <amount>

# Program management
node index.js program-show <id>
node index.js set-authority <id> <new|--final>
```
