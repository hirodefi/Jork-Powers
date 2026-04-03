# Solana Power

Full Solana toolchain. One power, everything you need.

## Commands

```bash
# Info
node index.js config
node index.js balance [address]
node index.js airdrop [amount]

# Build lifecycle
node index.js scaffold my-project [template]
node index.js build [dir] [--verifiable]
node index.js test [dir] [--skip-validator]
node index.js deploy [dir]
node index.js deploy-mainnet [dir]
node index.js keys [dir]
node index.js keys-sync [dir]
node index.js idl <build|init|upgrade|fetch> [program-id] [dir]
node index.js verify <program-id> [dir]
node index.js deploy-verify <program-id> [dir]

# Wallet
node index.js wallet-create <name> <password>
node index.js wallet-list
node index.js wallet-balance <name> <password>

# Tokens
node index.js token-create [decimals]
node index.js token-create-meta <name> <symbol> <uri> [decimals]
node index.js token-mint <mint> <amount>
node index.js token-transfer <mint> <amount> <recipient>
node index.js token-supply <mint>
node index.js token-accounts

# Transactions & accounts
node index.js tx-history <address> [limit]
node index.js tx-detail <signature>
node index.js account-info <address>
node index.js account-tokens <address>

# Swap (Jupiter)
node index.js swap <inputMint> <outputMint> <amount>

# Diagnosis
node index.js diagnose <error-text>

# Program management
node index.js program-show <id>
node index.js program-close <id>
node index.js set-authority <id> <new|--final> [--confirm]
```
