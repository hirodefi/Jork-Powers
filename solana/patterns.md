# Solana Development Patterns

Reference for building Solana projects. Read this when working on a build task.

## Wallet Connection (React)

```tsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';

const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

function App() {
  return (
    <ConnectionProvider endpoint={rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletMultiButton />
          {/* Your app */}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

## Balance Fetching

```ts
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

const { publicKey } = useWallet();
const connection = new Connection(rpcUrl);
const balance = await connection.getBalance(publicKey);
const sol = balance / LAMPORTS_PER_SOL;
```

## Transaction History

```ts
const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
const txs = await Promise.all(
  sigs.map(s => connection.getParsedTransaction(s.signature))
);
```

## Escrow Pattern (Anchor)

```rust
#[account]
pub struct Escrow {
    pub maker: Pubkey,
    pub taker: Pubkey,
    pub amount: u64,
    pub status: EscrowStatus,
    pub bump: u8,
}

// PDA seeds: ["escrow", maker.key()]
#[account(
    init, payer = maker, space = 8 + 32 + 32 + 8 + 1 + 1,
    seeds = [b"escrow", maker.key().as_ref()], bump
)]
pub escrow: Account<'info, Escrow>,
```

Flow: maker deposits -> escrow holds -> taker fulfills -> escrow releases. Cancel: maker reclaims.

## Vault Pattern

```rust
#[account(
    seeds = [b"vault", pool.key().as_ref()], bump,
    token::mint = token_mint, token::authority = vault_authority
)]
pub vault: Account<'info, TokenAccount>,

// Transfer into vault via CPI
token::transfer(CpiContext::new(token_program, Transfer {
    from: user_token_account, to: vault, authority: user
}), amount)?;

// Transfer out: vault_authority signs via invoke_signed
token::transfer(CpiContext::new_with_signer(token_program, Transfer {
    from: vault, to: user_token_account, authority: vault_authority
}, &[&[b"vault-auth", &[bump]]])), amount)?;
```

## Staking Pattern

```rust
#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub amount: u64,
    pub staked_at: i64,
    pub last_claim: i64,
}

// Reward calculation
let elapsed = clock.unix_timestamp - stake.last_claim;
let reward = (stake.amount * rate * elapsed as u64) / (365 * 24 * 3600);
```

## AMM (Constant Product)

```rust
// x * y = k
// After swap: (x + dx) * (y - dy) = k
// dy = y * dx / (x + dx)

let amount_out = (pool.token_b_amount * amount_in) / (pool.token_a_amount + amount_in);
// Apply fee (e.g., 0.3%)
let fee = amount_out * 3 / 1000;
let amount_out_after_fee = amount_out - fee;
```

## Jupiter Swap Integration

```ts
// Get quote
const quote = await fetch(
  `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`
).then(r => r.json());

// Get swap transaction
const swap = await fetch('https://quote-api.jup.ag/v6/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quoteResponse: quote,
    userPublicKey: wallet.publicKey.toString(),
    wrapAndUnwrapSol: true
  })
}).then(r => r.json());

// Sign and send
const tx = VersionedTransaction.deserialize(Buffer.from(swap.swapTransaction, 'base64'));
tx.sign([wallet]);
const sig = await connection.sendRawTransaction(tx.serialize());
```

## Common Anchor Constraints

```rust
#[account(init, payer = user, space = 8 + SIZE)]     // Create account
#[account(mut)]                                        // Mutable
#[account(seeds = [b"seed", key.as_ref()], bump)]     // PDA validation
#[account(has_one = authority)]                        // Field must match
#[account(close = recipient)]                          // Close, send rent to recipient
#[account(token::mint = mint, token::authority = auth)] // Token account checks
#[account(constraint = amount > 0 @ MyError::Zero)]   // Custom constraint
```

## Priority Fees

```ts
import { ComputeBudgetProgram } from '@solana/web3.js';
tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
// Put these FIRST in the transaction instructions
```

## Common Mints

```
SOL (wrapped): So11111111111111111111111111111111111111112
USDC: EPjFWdd5AufqSSqeM2qN1xzBZLc65aNrmA1pi4cRQwBj
USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
```
