'use strict';

const { execSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');
const WALLETS_DIR = path.join(__dirname, 'wallets');

function loadConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function sh(cmd, opts) {
    opts = opts || {};
    try {
        return execSync(cmd, {
            encoding: 'utf8',
            timeout: opts.timeout || 120000,
            cwd: opts.cwd || process.cwd(),
            env: Object.assign({}, process.env, opts.env || {})
        }).trim();
    } catch(e) {
        return 'Error: ' + (e.stderr || e.message || '').trim().slice(0, 500);
    }
}

// ---- Cluster / Config ----

function getCluster() {
    return process.env.SOLANA_CLUSTER || 'devnet';
}

function getRpc() {
    if (process.env.SOLANA_RPC) return process.env.SOLANA_RPC;
    const cluster = getCluster();
    const rpcs = {
        'devnet': 'https://api.devnet.solana.com',
        'testnet': 'https://api.testnet.solana.com',
        'mainnet-beta': 'https://api.mainnet-beta.solana.com',
        'localhost': 'http://127.0.0.1:8899'
    };
    return rpcs[cluster] || rpcs['devnet'];
}

function configInfo() {
    return {
        cluster: getCluster(),
        rpc: getRpc(),
        solana: sh('solana --version 2>/dev/null') || 'not installed',
        anchor: sh('anchor --version 2>/dev/null') || 'not installed',
        rust: sh('rustc --version 2>/dev/null') || 'not installed',
        keypair: sh('solana config get keypair 2>/dev/null') || 'not set'
    };
}

// ---- Scaffold ----

function scaffold(name, template) {
    template = template || 'single';
    if (!name) return 'Usage: scaffold <project-name> [template]';

    // Configure solana CLI for current cluster
    sh('solana config set --url ' + getRpc());

    const result = sh('anchor init ' + name + ' --template ' + template, { timeout: 180000 });
    if (result.indexOf('Error') !== -1) return result;

    // Sync keys
    sh('anchor keys sync', { cwd: path.resolve(name) });

    return 'Project scaffolded: ' + name + '\nTemplate: ' + template + '\nCluster: ' + getCluster() + '\n\nNext: cd ' + name + ' && anchor build';
}

// ---- Build ----

function build(projectDir, verifiable) {
    projectDir = projectDir || '.';
    const cmd = verifiable ? 'anchor build --verifiable' : 'anchor build';
    return sh(cmd, { cwd: projectDir, timeout: 300000 });
}

// ---- Test ----

function test(projectDir, skipValidator) {
    projectDir = projectDir || '.';
    const cmd = skipValidator ? 'anchor test --skip-local-validator' : 'anchor test';
    return sh(cmd, { cwd: projectDir, timeout: 300000 });
}

// ---- Deploy ----

function deploy(projectDir) {
    projectDir = projectDir || '.';
    sh('solana config set --url ' + getRpc());

    if (getCluster() === 'mainnet-beta') {
        return 'SAFETY: Mainnet deployment requested. Confirm by running: deploy-mainnet';
    }

    return sh('anchor deploy', { cwd: projectDir, timeout: 300000 });
}

function deployMainnet(projectDir) {
    projectDir = projectDir || '.';
    sh('solana config set --url https://api.mainnet-beta.solana.com');
    return sh('anchor deploy', { cwd: projectDir, timeout: 300000 });
}

// ---- Keys ----

function keys(projectDir) {
    projectDir = projectDir || '.';
    return sh('anchor keys list', { cwd: projectDir });
}

function keysSync(projectDir) {
    projectDir = projectDir || '.';
    return sh('anchor keys sync', { cwd: projectDir });
}

// ---- IDL ----

function idl(subcmd, args, projectDir) {
    projectDir = projectDir || '.';
    if (!subcmd) return 'Usage: idl <build|init|upgrade|fetch> [program-id]';
    const cmd = 'anchor idl ' + subcmd + (args ? ' ' + args : '');
    return sh(cmd, { cwd: projectDir });
}

// ---- Verify ----

function verify(programId, projectDir) {
    projectDir = projectDir || '.';
    if (!programId) return 'Usage: verify <program-id>';
    return sh('anchor verify ' + programId, { cwd: projectDir, timeout: 300000 });
}

// ---- Airdrop ----

function airdrop(amount) {
    amount = amount || '2';
    if (getCluster() === 'mainnet-beta') return 'Cannot airdrop on mainnet.';
    sh('solana config set --url ' + getRpc());
    return sh('solana airdrop ' + amount);
}

// ---- Balance ----

function balance(address) {
    sh('solana config set --url ' + getRpc());
    if (address) return sh('solana balance ' + address);
    return sh('solana balance');
}

// ---- Wallet (encrypted) ----

function encrypt(data, password) {
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { salt: salt.toString('hex'), iv: iv.toString('hex'), data: encrypted };
}

function decrypt(encrypted, password) {
    const salt = Buffer.from(encrypted.salt, 'hex');
    const iv = Buffer.from(encrypted.iv, 'hex');
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

function walletCreate(name, password) {
    if (!name || !password) return 'Usage: wallet-create <name> <password>';
    if (!fs.existsSync(WALLETS_DIR)) fs.mkdirSync(WALLETS_DIR, { recursive: true });

    const tmpFile = path.join(WALLETS_DIR, '.tmp-' + Date.now() + '.json');
    try {
        sh('solana-keygen new --no-bip39-passphrase --outfile ' + tmpFile + ' 2>/dev/null');
        const keypairBytes = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
        const { Keypair } = require('@solana/web3.js');
        const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairBytes));
        const walletData = { secretKey: Array.from(keypair.secretKey), publicKey: keypair.publicKey.toBase58() };
        const encrypted = encrypt(walletData, password);
        fs.writeFileSync(path.join(WALLETS_DIR, name + '.json'), JSON.stringify(encrypted, null, 2));
        return 'Wallet created: ' + name + '\nPublic key: ' + keypair.publicKey.toBase58() + '\nEncrypted and saved.';
    } catch(e) {
        return 'Error creating wallet: ' + e.message;
    } finally {
        try { fs.unlinkSync(tmpFile); } catch(e) {}
    }
}

function walletList() {
    if (!fs.existsSync(WALLETS_DIR)) return 'No wallets yet.';
    const files = fs.readdirSync(WALLETS_DIR).filter(f => f.endsWith('.json'));
    if (files.length === 0) return 'No wallets yet.';
    return files.map(f => f.replace('.json', '')).join('\n');
}

function walletBalance(name, password) {
    if (!name || !password) return 'Usage: wallet-balance <name> <password>';
    try {
        const encrypted = JSON.parse(fs.readFileSync(path.join(WALLETS_DIR, name + '.json'), 'utf8'));
        const data = decrypt(encrypted, password);
        return sh('solana balance ' + data.publicKey + ' --url ' + getRpc());
    } catch(e) {
        return 'Error: ' + e.message;
    }
}

// ---- Token operations ----

function tokenCreate(decimals) {
    decimals = decimals || '9';
    sh('solana config set --url ' + getRpc());
    return sh('spl-token create-token --decimals ' + decimals);
}

function tokenCreateWithMetadata(name, symbol, uri, decimals) {
    if (!name || !symbol) return 'Usage: token-create-meta <name> <symbol> <uri> [decimals]';
    decimals = decimals || '9';
    sh('solana config set --url ' + getRpc());
    // Token-2022 with metadata
    const result = sh('spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --enable-metadata --decimals ' + decimals);
    if (result.indexOf('Error') !== -1) return result;

    // Extract mint address
    const mintMatch = result.match(/Creating token ([A-Za-z0-9]+)/);
    if (mintMatch) {
        const mint = mintMatch[1];
        const metaResult = sh('spl-token initialize-metadata ' + mint + ' "' + name + '" "' + symbol + '" "' + (uri || '') + '"');
        return result + '\n' + metaResult;
    }
    return result;
}

function tokenMint(mint, amount) {
    if (!mint || !amount) return 'Usage: token-mint <mint> <amount>';
    sh('solana config set --url ' + getRpc());
    return sh('spl-token mint ' + mint + ' ' + amount);
}

function tokenTransfer(mint, amount, recipient) {
    if (!mint || !amount || !recipient) return 'Usage: token-transfer <mint> <amount> <recipient>';
    sh('solana config set --url ' + getRpc());
    return sh('spl-token transfer ' + mint + ' ' + amount + ' ' + recipient + ' --fund-recipient');
}

function tokenSupply(mint) {
    if (!mint) return 'Usage: token-supply <mint>';
    sh('solana config set --url ' + getRpc());
    return sh('spl-token supply ' + mint);
}

function tokenAccounts() {
    sh('solana config set --url ' + getRpc());
    return sh('spl-token accounts');
}

// ---- Jupiter swap ----

async function swap(inputMint, outputMint, amount) {
    if (!inputMint || !outputMint || !amount) return 'Usage: swap <inputMint> <outputMint> <amount>';

    const quoteUrl = 'https://quote-api.jup.ag/v6/quote?inputMint=' + inputMint + '&outputMint=' + outputMint + '&amount=' + amount + '&slippageBps=50';
    try {
        const quoteRes = await fetch(quoteUrl);
        const quote = await quoteRes.json();
        if (!quote || quote.error) return 'Quote error: ' + (quote.error || 'no quote');
        return JSON.stringify({
            inputAmount: quote.inAmount,
            outputAmount: quote.outAmount,
            priceImpact: quote.priceImpactPct,
            route: quote.routePlan ? quote.routePlan.map(r => r.swapInfo.label).join(' -> ') : 'direct'
        }, null, 2);
    } catch(e) {
        return 'Swap error: ' + e.message;
    }
}

// ---- Program management ----

function programShow(programId) {
    if (!programId) return 'Usage: program-show <program-id>';
    sh('solana config set --url ' + getRpc());
    return sh('solana program show ' + programId);
}

function programClose(programId) {
    if (!programId) return 'Usage: program-close <program-id>';
    if (getCluster() === 'mainnet-beta') return 'SAFETY: Use program-close-mainnet for mainnet.';
    sh('solana config set --url ' + getRpc());
    return sh('solana program close ' + programId);
}

function setAuthority(programId, newAuthority, confirmed) {
    if (!programId) return 'Usage: set-authority <program-id> [new-authority | --final]';
    sh('solana config set --url ' + getRpc());
    if (newAuthority === '--final') {
        if (!confirmed) {
            return 'SAFETY: Making a program immutable is IRREVERSIBLE. The program can never be upgraded again.\nTo confirm, run: set-authority ' + programId + ' --final --confirm';
        }
        return sh('solana program set-upgrade-authority ' + programId + ' --final');
    }
    if (newAuthority) {
        return sh('solana program set-upgrade-authority ' + programId + ' --new-upgrade-authority ' + newAuthority);
    }
    return 'Specify new authority or --final to make immutable.';
}

// ---- Input sanitization ----

function sanitize(input) {
    if (!input) return '';
    return input.replace(/[^a-zA-Z0-9._\-\/]/g, '');
}

// ---- Transaction history ----

function txHistory(address, limit) {
    if (!address) return 'Usage: tx-history <address> [limit]';
    address = sanitize(address);
    limit = parseInt(limit) || 10;
    sh('solana config set --url ' + getRpc());
    try {
        const result = require('child_process').execSync(
            'node -e "const{Connection,PublicKey}=require(\'@solana/web3.js\');' +
            'new Connection(\'' + getRpc() + '\',\'confirmed\')' +
            '.getSignaturesForAddress(new PublicKey(\'' + address + '\'),{limit:' + limit + '})' +
            '.then(s=>console.log(JSON.stringify(s.map(t=>({sig:t.signature.slice(0,16)+\'...\',slot:t.slot,time:t.blockTime?new Date(t.blockTime*1000).toISOString():\'?\',err:t.err?\'FAIL\':\'OK\'})))))"',
            { encoding: 'utf8', timeout: 15000 }
        ).trim();
        var sigs = JSON.parse(result);
        return 'Last ' + sigs.length + ' transactions for ' + address + ':\n' +
            sigs.map(function(s, i) { return (i+1) + '. ' + s.sig + ' | slot ' + s.slot + ' | ' + s.time + ' | ' + s.err; }).join('\n');
    } catch(e) {
        return 'Error: ' + e.message;
    }
}

function txDetail(signature) {
    if (!signature) return 'Usage: tx-detail <signature>';
    signature = sanitize(signature);
    sh('solana config set --url ' + getRpc());
    return sh('solana confirm -v ' + signature + ' 2>&1 | head -50');
}

// ---- Account reading ----

function accountInfo(address) {
    if (!address) return 'Usage: account-info <address>';
    address = sanitize(address);
    sh('solana config set --url ' + getRpc());
    return sh('solana account ' + address);
}

function accountTokens(address) {
    if (!address) return 'Usage: account-tokens <address>';
    address = sanitize(address);
    sh('solana config set --url ' + getRpc());
    return sh('spl-token accounts --owner ' + address + ' 2>&1');
}

// ---- Error diagnosis ----

var SOLANA_ERRORS = {
    'insufficient funds': 'Not enough SOL for transaction fees. Airdrop on devnet: solana airdrop 2. On mainnet: deposit SOL to your wallet.',
    'insufficientfunds': 'Not enough SOL. Check balance with: solana balance',
    'accountnotfound': 'The account does not exist on-chain. It may not have been created yet or may be on a different cluster.',
    'programfailedtocomplete': 'The program ran out of compute units or hit a runtime error. Try increasing compute budget or check program logs.',
    'blockhashnotfound': 'Transaction expired. The blockhash was too old. Retry with a fresh blockhash.',
    'transactionsimulationfailed': 'Transaction simulation failed before sending. Check the instruction data and accounts.',
    'custom program error': 'An Anchor/program-specific error. Check the error code against your program\'s error enum.',
    'accountownermismatch': 'The account is owned by a different program than expected. Check the owner field.',
    'accountdatatooshort': 'Account data is smaller than expected. The account may not be initialized or may use a different schema.',
    'declaredprogramiddoesnotmatch': 'The program ID in declare_id! does not match the deployed keypair. Run: anchor keys sync',
    'anchor constraint violated': 'An Anchor constraint check failed (#[account(constraint = ...)]). Check the account relationships.',
    'seeds constraint was violated': 'PDA derivation failed. Check the seeds, bump, and program ID used in the constraint.',
    'access violation': 'Memory access violation in BPF. Usually means writing to an account you don\'t own or buffer overflow.',
    'compute budget exceeded': 'Ran out of compute units. Add: ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 })',
    'rent exempt': 'Account must be rent-exempt. Ensure enough lamports for: (data_size + 128) * 3480 * 2',
};

function diagnose(errorText) {
    if (!errorText) return 'Usage: diagnose <error-text>';
    var lower = errorText.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    var matches = [];
    for (var key in SOLANA_ERRORS) {
        if (lower.indexOf(key.replace(/[^a-z0-9 ]/g, '')) !== -1) {
            matches.push(key + ': ' + SOLANA_ERRORS[key]);
        }
    }
    if (matches.length > 0) return 'Diagnosis:\n' + matches.join('\n\n');
    return 'No known diagnosis for: ' + errorText + '\nTry searching: https://explorer.solana.com or the Anchor docs.';
}

// ---- Deploy + verify in one step ----

function deployVerify(programId, projectDir) {
    if (!programId) return 'Usage: deploy-verify <program-id> [dir]';
    projectDir = projectDir || '.';
    sh('solana config set --url ' + getRpc());
    var buildResult = sh('anchor build --verifiable', { cwd: projectDir, timeout: 300000 });
    if (buildResult.indexOf('Error') !== -1) return 'Build failed:\n' + buildResult;
    var deployResult = sh('anchor deploy', { cwd: projectDir, timeout: 300000 });
    if (deployResult.indexOf('Error') !== -1) return 'Deploy failed:\n' + deployResult;
    var verifyResult = sh('anchor verify ' + programId, { cwd: projectDir, timeout: 300000 });
    return 'Build: OK\nDeploy: OK\nVerify: ' + verifyResult;
}

// ---- Router ----

async function run(args) {
    const cmd = args[0];
    const rest = args.slice(1);

    switch(cmd) {
        // Info
        case 'config':          return JSON.stringify(configInfo(), null, 2);
        case 'balance':         return balance(rest[0]);
        case 'airdrop':         return airdrop(rest[0]);

        // Build lifecycle
        case 'scaffold':        return scaffold(rest[0], rest[1]);
        case 'build':           return build(rest[0], rest.includes('--verifiable'));
        case 'test':            return test(rest[0], rest.includes('--skip-validator'));
        case 'deploy':          return deploy(rest[0]);
        case 'deploy-mainnet':  return deployMainnet(rest[0]);
        case 'keys':            return keys(rest[0]);
        case 'keys-sync':       return keysSync(rest[0]);
        case 'idl':             return idl(rest[0], rest[1] || '', rest[2] || '.');
        case 'verify':          return verify(rest[0], rest[1]);

        // Wallet
        case 'wallet-create':   return walletCreate(rest[0], rest[1]);
        case 'wallet-list':     return walletList();
        case 'wallet-balance':  return walletBalance(rest[0], rest[1]);

        // Tokens
        case 'token-create':    return tokenCreate(rest[0]);
        case 'token-create-meta': return tokenCreateWithMetadata(rest[0], rest[1], rest[2], rest[3]);
        case 'token-mint':      return tokenMint(rest[0], rest[1]);
        case 'token-transfer':  return tokenTransfer(rest[0], rest[1], rest[2]);
        case 'token-supply':    return tokenSupply(rest[0]);
        case 'token-accounts':  return tokenAccounts();

        // Swap
        case 'swap':            return await swap(rest[0], rest[1], rest[2]);

        // Transactions & accounts
        case 'tx-history':      return txHistory(rest[0], rest[1]);
        case 'tx-detail':       return txDetail(rest[0]);
        case 'account-info':    return accountInfo(rest[0]);
        case 'account-tokens':  return accountTokens(rest[0]);

        // Diagnosis
        case 'diagnose':        return diagnose(rest.join(' '));

        // Deploy + verify
        case 'deploy-verify':   return deployVerify(rest[0], rest[1]);

        // Program management
        case 'program-show':    return programShow(rest[0]);
        case 'program-close':   return programClose(rest[0]);
        case 'set-authority':   return setAuthority(rest[0], rest[1], rest.includes('--confirm'));

        default:                return help();
    }
}

function help() {
    return `Jork Solana Power - Full Toolchain

Info:
  config                              Show cluster, versions, config
  balance [address]                   SOL balance
  airdrop [amount]                    Devnet airdrop (default: 2 SOL)

Build Lifecycle:
  scaffold <name> [template]          Create Anchor project (template: single|multiple)
  build [dir] [--verifiable]          Compile program
  test [dir] [--skip-validator]       Run tests
  deploy [dir]                        Deploy to current cluster
  deploy-mainnet [dir]                Deploy to mainnet (explicit)
  keys [dir]                          List program IDs
  keys-sync [dir]                     Sync declare_id with keypair
  idl <build|init|upgrade|fetch> [id] IDL management
  verify <program-id> [dir]           Verify on-chain matches local build

Wallet:
  wallet-create <name> <password>     Create encrypted wallet
  wallet-list                         List wallets
  wallet-balance <name> <password>    Check wallet balance

Tokens:
  token-create [decimals]             Create SPL token
  token-create-meta <name> <sym> <uri> [dec]  Create Token-2022 with metadata
  token-mint <mint> <amount>          Mint tokens
  token-transfer <mint> <amt> <to>    Transfer tokens
  token-supply <mint>                 Check supply
  token-accounts                      List token accounts

Swap:
  swap <input> <output> <amount>      Jupiter quote

Transactions & Accounts:
  tx-history <address> [limit]        Recent transaction signatures
  tx-detail <signature>               Parsed transaction details
  account-info <address>              Account info (owner, lamports, data)
  account-tokens <address>            List all SPL tokens for address

Diagnosis:
  diagnose <error-text>               Lookup common Solana errors with fixes

Deploy + Verify:
  deploy-verify <program-id> [dir]    Build verifiable + deploy + verify in one step

Program:
  program-show <id>                   Program info
  program-close <id>                  Close program (reclaim SOL)
  set-authority <id> <new|--final>    Transfer or revoke upgrade authority`;
}

module.exports = { run, help, configInfo, scaffold, build, test, deploy, balance, airdrop };

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) { console.log(help()); process.exit(0); }
    Promise.resolve(run(args)).then(r => console.log(r)).catch(e => console.error(e.message));
}
