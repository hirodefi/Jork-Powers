const { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');
const WALLETS_DIR = path.join(__dirname, 'wallets');

function loadConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function getConnection(rpcUrl) {
    const cfg = loadConfig();
    const url = rpcUrl || process.env.SOLANA_RPC || cfg.rpc.default;
    return new Connection(url, 'confirmed');
}

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

function createWallet(name, password) {
    if (!fs.existsSync(WALLETS_DIR)) fs.mkdirSync(WALLETS_DIR, { recursive: true });
    const keypair = Keypair.generate();
    const walletData = { secretKey: Array.from(keypair.secretKey), publicKey: keypair.publicKey.toBase58() };
    const encrypted = encrypt(walletData, password);
    const walletPath = path.join(WALLETS_DIR, name + '.json');
    fs.writeFileSync(walletPath, JSON.stringify(encrypted, null, 2));
    return { name, publicKey: keypair.publicKey.toBase58(), path: walletPath };
}

function loadWallet(name, password) {
    const walletPath = path.join(WALLETS_DIR, name + '.json');
    const encrypted = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const data = decrypt(encrypted, password);
    return Keypair.fromSecretKey(Uint8Array.from(data.secretKey));
}

function listWallets() {
    if (!fs.existsSync(WALLETS_DIR)) return [];
    return fs.readdirSync(WALLETS_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
}

async function getBalance(address, rpcUrl) {
    const conn = getConnection(rpcUrl);
    const pubkey = new PublicKey(address);
    const balance = await conn.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
}

async function sendSol(fromKeypair, toAddress, amount, rpcUrl) {
    const conn = getConnection(rpcUrl);
    const toPubkey = new PublicKey(toAddress);
    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: toPubkey,
            lamports: Math.floor(amount * LAMPORTS_PER_SOL)
        })
    );
    const sig = await conn.sendTransaction(tx, [fromKeypair]);
    await conn.confirmTransaction(sig);
    return sig;
}

async function swap(fromKeypair, inputMint, outputMint, amount, rpcUrl) {
    const conn = getConnection(rpcUrl);
    const quoteUrl = 'https://quote-api.jup.ag/v6/quote?inputMint=' + inputMint + '&outputMint=' + outputMint + '&amount=' + amount + '&slippageBps=50';
    const quoteRes = await fetch(quoteUrl);
    const quote = await quoteRes.json();
    if (!quote || quote.error) throw new Error(quote.error || 'No quote');
    const swapUrl = 'https://quote-api.jup.ag/v6/swap';
    const swapRes = await fetch(swapUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: fromKeypair.publicKey.toBase58(),
            wrapAndUnwrapSol: true
        })
    });
    const swapData = await swapRes.json();
    if (!swapData.swapTransaction) throw new Error('No swap transaction');
    const txBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const tx = Transaction.from(txBuf);
    tx.sign(fromKeypair);
    const sig = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction(sig);
    return { signature: sig, inputAmount: quote.inAmount, outputAmount: quote.outAmount };
}

async function run(args) {
    const cmd = args[0];
    if (cmd === 'create') return createWallet(args[1], args[2]);
    if (cmd === 'list') return listWallets();
    if (cmd === 'balance') return await getBalance(args[1], args[2]);
    if (cmd === 'send') {
        const kp = loadWallet(args[1], args[2]);
        return await sendSol(kp, args[3], parseFloat(args[4]), args[5]);
    }
    if (cmd === 'swap') {
        const kp = loadWallet(args[1], args[2]);
        return await swap(kp, args[3], args[4], args[5], args[6]);
    }
    return help();
}

function help() {
    return 'Solana Power\n' +
        'Commands:\n' +
        '  create <name> <password> - Create new wallet\n' +
        '  list - List wallets\n' +
        '  balance <address> [rpc] - Get SOL balance\n' +
        '  send <wallet> <password> <to> <amount> [rpc] - Send SOL\n' +
        '  swap <wallet> <password> <inputMint> <outputMint> <amount> [rpc] - Swap tokens';
}

module.exports = { run, help, createWallet, loadWallet, listWallets, getBalance, sendSol, swap };