'use strict';

const fs   = require('fs');
const path = require('path');

class Store {
    constructor(nucleusPath) {
        this.nucleusPath  = nucleusPath;
        this.dir          = path.join(nucleusPath, 'memory');
        this.historyPath  = path.join(nucleusPath, 'history.jsonl');
        this.offsetsPath  = path.join(this.dir, 'offsets.bin');
        this.keywordsPath = path.join(this.dir, 'keywords.json');
        this.conceptsPath = path.join(this.dir, 'concepts.json');
        this.walPath      = path.join(this.dir, 'wal.json');
        this.summaryPath  = path.join(this.dir, 'summary.md');

        // In-memory index
        this.nextId   = 1;
        this.offsets  = [];   // index = id-1, value = { offset: BigInt, len: Number }
        this.keywords = {};   // keyword → [ids]
        this.concepts = {};   // concept  → [ids]
        this.summary  = '';

        this._fd = null;      // persistent fd for history.jsonl reads
    }

    load() {
        if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });

        // 1. Load offsets.bin
        if (fs.existsSync(this.offsetsPath)) {
            const buf = fs.readFileSync(this.offsetsPath);
            for (let i = 0; i < buf.length; i += 12) {
                this.offsets.push({
                    offset: buf.readBigUInt64LE(i),
                    len:    buf.readUInt32LE(i + 8),
                });
            }
        }
        this.nextId = this.offsets.length + 1;

        // 2. Load keywords.json
        if (fs.existsSync(this.keywordsPath)) {
            this.keywords = JSON.parse(fs.readFileSync(this.keywordsPath, 'utf8'));
        }

        // 3. Load concepts.json
        if (fs.existsSync(this.conceptsPath)) {
            this.concepts = JSON.parse(fs.readFileSync(this.conceptsPath, 'utf8'));
        }

        // 4. Replay WAL into in-memory maps
        if (fs.existsSync(this.walPath)) {
            let wal = [];
            try { wal = JSON.parse(fs.readFileSync(this.walPath, 'utf8')); } catch(e) {}
            for (const entry of wal) {
                for (const kw of (entry.kw || [])) {
                    if (!this.keywords[kw]) this.keywords[kw] = [];
                    if (!this.keywords[kw].includes(entry.id)) this.keywords[kw].push(entry.id);
                }
                for (const c of (entry.c || [])) {
                    if (!this.concepts[c]) this.concepts[c] = [];
                    if (!this.concepts[c].includes(entry.id)) this.concepts[c].push(entry.id);
                }
            }
        }

        // 5. Load summary
        if (fs.existsSync(this.summaryPath)) {
            this.summary = fs.readFileSync(this.summaryPath, 'utf8');
        }

        // 6. Open persistent fd for history reads
        if (fs.existsSync(this.historyPath)) {
            this._fd = fs.openSync(this.historyPath, 'r');
        }
    }

    // Seek a single message by id — O(1)
    seek(id) {
        const rec = this.offsets[id - 1];
        if (!rec) return null;

        // Open fd if not yet open (history may have been created after load())
        if (this._fd === null && fs.existsSync(this.historyPath)) {
            this._fd = fs.openSync(this.historyPath, 'r');
        }
        if (this._fd === null) return null;

        const buf = Buffer.alloc(rec.len);
        fs.readSync(this._fd, buf, 0, rec.len, Number(rec.offset));
        try {
            return JSON.parse(buf.toString('utf8').trim());
        } catch(e) {
            return null;
        }
    }

    // Seek multiple messages — reuses the same open fd
    seekMany(ids) {
        return ids.map(id => this.seek(id)).filter(Boolean);
    }

    // Get last n message IDs by recency (most recent first)
    getRecentIds(n) {
        const ids = [];
        for (let i = this.offsets.length; i > 0 && ids.length < n; i--) {
            ids.push(i);
        }
        return ids;
    }

    getByKeyword(kw)  { return this.keywords[kw] || []; }
    getByConcept(c)   { return this.concepts[c]  || []; }

    // Rebuild entire index from history.jsonl (recovery / migration)
    rebuild() {
        const { extractKeywords, classifyConcepts } = require('./Concepts');

        if (!fs.existsSync(this.historyPath)) {
            console.log('No history.jsonl found — nothing to rebuild.');
            return;
        }

        console.log('Rebuilding index from history.jsonl...');

        // Reset
        this.offsets  = [];
        this.keywords = {};
        this.concepts = {};
        this.nextId   = 1;

        const content = fs.readFileSync(this.historyPath, 'utf8');
        const lines   = content.split('\n');

        let offset = 0;
        const offsetsBuf = [];

        for (const raw of lines) {
            const line = raw.trim();
            if (!line) { offset += Buffer.byteLength(raw + '\n'); continue; }

            let msg;
            try { msg = JSON.parse(line); } catch(e) { offset += Buffer.byteLength(raw + '\n'); continue; }

            const len = Buffer.byteLength(line + '\n');

            // offsets entry
            const rec = Buffer.alloc(12);
            rec.writeBigUInt64LE(BigInt(offset), 0);
            rec.writeUInt32LE(len, 8);
            offsetsBuf.push(rec);
            this.offsets.push({ offset: BigInt(offset), len });

            // keywords + concepts
            const kw = extractKeywords(msg.msg || '');
            const c  = classifyConcepts(msg.msg || '');
            const id = msg.id || this.nextId;

            for (const k of kw) {
                if (!this.keywords[k]) this.keywords[k] = [];
                this.keywords[k].push(id);
            }
            for (const concept of c) {
                if (!this.concepts[concept]) this.concepts[concept] = [];
                this.concepts[concept].push(id);
            }

            offset += len;
            this.nextId = id + 1;
        }

        if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });

        fs.writeFileSync(this.offsetsPath, Buffer.concat(offsetsBuf));
        fs.writeFileSync(this.keywordsPath, JSON.stringify(this.keywords));
        fs.writeFileSync(this.conceptsPath, JSON.stringify(this.concepts));
        fs.writeFileSync(this.walPath, '[]');

        console.log(`Rebuilt: ${this.offsets.length} messages indexed.`);
    }

    status() {
        const historyExists = fs.existsSync(this.historyPath);
        const historySize   = historyExists ? fs.statSync(this.historyPath).size : 0;
        return {
            messages:  this.offsets.length,
            nextId:    this.nextId,
            keywords:  Object.keys(this.keywords).length,
            concepts:  Object.keys(this.concepts).length,
            historyMB: (historySize / 1024 / 1024).toFixed(2),
            summary:   this.summary ? this.summary.trim().slice(0, 120) + '...' : '(none)',
        };
    }

    close() {
        if (this._fd !== null) {
            try { fs.closeSync(this._fd); } catch(e) {}
            this._fd = null;
        }
    }
}

module.exports = Store;
