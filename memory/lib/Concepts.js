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
    cofounder:      /prefer|like to|usually|my setup|my laptop|my server|i use|deploy to|my framework|my stack|i work on/i,
};

// Synonym map: expand search queries to catch related terms
const SYNONYMS = {
    'wallet':     ['phantom', 'solflare', 'backpack', 'adapter', 'connect wallet', 'keypair'],
    'token':      ['spl', 'mint', 'token-2022', 'token account', 'supply'],
    'nft':        ['metaplex', 'collection', 'candy machine', 'bubblegum', 'compressed'],
    'deploy':     ['deployment', 'vercel', 'mainnet', 'devnet', 'ship', 'launch', 'live'],
    'swap':       ['jupiter', 'dex', 'exchange', 'trade', 'raydium', 'orca'],
    'frontend':   ['react', 'nextjs', 'next.js', 'vite', 'ui', 'interface', 'dapp'],
    'server':     ['nginx', 'ssl', 'domain', 'hosting', 'vps', 'hetzner'],
    'build':      ['create', 'scaffold', 'make', 'develop', 'implement'],
    'error':      ['bug', 'fix', 'crash', 'fail', 'broken', 'issue', 'problem'],
    'staking':    ['stake', 'reward', 'delegate', 'validator', 'epoch'],
    'lending':    ['borrow', 'collateral', 'liquidation', 'interest', 'loan'],
    'program':    ['anchor', 'smart contract', 'instruction', 'account', 'pda'],
    'balance':    ['lamports', 'sol', 'amount', 'funds'],
    'transaction':['signature', 'blockhash', 'confirm', 'send', 'transfer'],
};

function expandQuery(tokens) {
    var expanded = new Set(tokens);
    for (var i = 0; i < tokens.length; i++) {
        var syns = SYNONYMS[tokens[i]];
        if (syns) {
            for (var j = 0; j < syns.length; j++) {
                // Only add single-word synonyms to the keyword search
                if (syns[j].indexOf(' ') === -1) {
                    expanded.add(syns[j]);
                }
            }
        }
    }
    return Array.from(expanded);
}

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

module.exports = { STOPWORDS, CONCEPTS, SYNONYMS, extractKeywords, classifyConcepts, expandQuery };
