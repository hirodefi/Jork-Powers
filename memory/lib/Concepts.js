'use strict';

const STOPWORDS = new Set([
    'the','this','that','with','from','have','been','just','like','about',
    'what','when','where','would','could','should','some','more','than',
    'them','then','into','also','does','done','back','were','will','each',
    'very','much','well','only','over','such','take','here','there','your',
    'they','their','which','being','because','these','those','after','before',
]);

const CONCEPTS = {
    // Solana core
    solana_program: /anchor|program|instruction|account.model|declare_id|solana.program|bpf|sbpf|entrypoint/i,
    pda:            /pda|program.derived|find_program_address|seeds|bump|invoke_signed/i,
    token:          /spl.token|token.2022|mint|token.account|associated.token|token.extension|metadata/i,
    nft:            /nft|metaplex|bubblegum|candy.machine|collection|compressed.nft|cnft/i,
    defi:           /amm|swap|liquidity|lending|staking|governance|vault|escrow|collateral/i,
    deployment:     /deploy|devnet|mainnet|testnet|verifiable.build|upgrade.authority|anchor.deploy/i,
    transaction:    /transaction|blockhash|compute.unit|priority.fee|signature|confirm/i,

    // Ecosystem
    ecosystem:      /jupiter|raydium|meteora|orca|helius|pyth|switchboard|phantom|solflare/i,
    wallet:         /wallet|keypair|sign|transfer|balance|lamport|airdrop|solana.cli/i,
    frontend:       /next\.?js|react|wallet.adapter|frontend|dapp|web3\.js|solana.kit/i,
    infrastructure: /nginx|ssl|certbot|pm2|server|deploy|vercel|domain|ssh|firewall/i,

    // General
    goals:          /goal|plan|want to|going to|intend|focus|next step|roadmap/i,
    issues:         /bug|fix|error|broke|fail|crash|wrong|problem|blocked/i,
    identity:       /i am|i feel|who i am|my purpose|evolve|grow/i,
};

function extractKeywords(msg) {
    return [...new Set(
        msg.toLowerCase()
            .replace(/[^a-z0-9 ]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3 && !STOPWORDS.has(w))
    )];
}

function classifyConcepts(msg) {
    return Object.entries(CONCEPTS)
        .filter(([, pattern]) => pattern.test(msg))
        .map(([name]) => name);
}

module.exports = { STOPWORDS, CONCEPTS, extractKeywords, classifyConcepts };
