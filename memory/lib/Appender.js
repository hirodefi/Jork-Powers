'use strict';

const fs   = require('fs');
const path = require('path');
const { extractKeywords, classifyConcepts } = require('./Concepts');

class Appender {
    constructor(store, nucleusPath, config) {
        this.store        = store;
        this.dir          = path.join(nucleusPath, 'memory');
        this.historyPath  = path.join(nucleusPath, 'history.jsonl');
        this.offsetsPath  = path.join(this.dir, 'offsets.bin');
        this.keywordsPath = path.join(this.dir, 'keywords.json');
        this.conceptsPath = path.join(this.dir, 'concepts.json');
        this.walPath      = path.join(this.dir, 'wal.json');

        this.flushEvery   = (config && config.flushEvery)   || 5;
        this.compactEvery = (config && config.compactEvery) || 1000;
        this.walInterval  = (config && config.walFlushInterval) || 30000;

        this.walBuffer    = [];
        this._timer       = null;

        this._ensureDir();
        this._startTimer();
    }

    _ensureDir() {
        if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
        if (!fs.existsSync(this.walPath)) fs.writeFileSync(this.walPath, '[]');
    }

    write(role, msg) {
        const id  = this.store.nextId++;
        const ts  = Math.floor(Date.now() / 1000);
        const line = JSON.stringify({ id, ts, role, msg }) + '\n';
        const len  = Buffer.byteLength(line);

        // Step 1: Get current file size = byte offset for this message
        let offset = 0;
        if (fs.existsSync(this.historyPath)) {
            offset = fs.statSync(this.historyPath).size;
        }

        // Step 2: Append to history.jsonl (truth store first)
        fs.appendFileSync(this.historyPath, line);

        // Step 3: Re-open persistent read fd if this is the first message
        if (this.store._fd === null) {
            this.store._fd = fs.openSync(this.historyPath, 'r');
        }

        // Step 4: Append 12-byte record to offsets.bin
        const rec = Buffer.alloc(12);
        rec.writeBigUInt64LE(BigInt(offset), 0);
        rec.writeUInt32LE(len, 8);
        fs.appendFileSync(this.offsetsPath, rec);

        // Step 5: Update in-memory offsets
        this.store.offsets.push({ offset: BigInt(offset), len });

        // Step 6: Extract keywords + concepts
        const kw = extractKeywords(msg);
        const c  = classifyConcepts(msg);

        // Step 7: Update in-memory maps
        for (const k of kw) {
            if (!this.store.keywords[k]) this.store.keywords[k] = [];
            this.store.keywords[k].push(id);
        }
        for (const concept of c) {
            if (!this.store.concepts[concept]) this.store.concepts[concept] = [];
            this.store.concepts[concept].push(id);
        }

        // Step 8: Buffer WAL entry
        this.walBuffer.push({ id, kw, c });
        if (this.walBuffer.length >= this.flushEvery) this._flushWAL();

        // Step 9: Compact periodically
        if (id % this.compactEvery === 0) this._compact();

        return id;
    }

    _flushWAL() {
        if (this.walBuffer.length === 0) return;
        let existing = [];
        if (fs.existsSync(this.walPath)) {
            try { existing = JSON.parse(fs.readFileSync(this.walPath, 'utf8')); } catch(e) {}
        }
        existing.push(...this.walBuffer);
        fs.writeFileSync(this.walPath, JSON.stringify(existing));
        this.walBuffer = [];
    }

    _compact() {
        // Atomically write keywords + concepts from in-memory maps
        const tmpKw = this.keywordsPath + '.tmp';
        const tmpC  = this.conceptsPath + '.tmp';
        fs.writeFileSync(tmpKw, JSON.stringify(this.store.keywords));
        fs.writeFileSync(tmpC,  JSON.stringify(this.store.concepts));
        fs.renameSync(tmpKw, this.keywordsPath);
        fs.renameSync(tmpC,  this.conceptsPath);
        // Clear WAL
        fs.writeFileSync(this.walPath, '[]');
        this.walBuffer = [];
    }

    _startTimer() {
        this._timer = setInterval(() => this._flushWAL(), this.walInterval);
        if (this._timer.unref) this._timer.unref(); // don't block process exit
    }

    close() {
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
        this._flushWAL();
        this._compact();
    }
}

module.exports = Appender;
