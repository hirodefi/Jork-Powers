/**
 * Storage.js
 * Memory storage for Jork - designed for her single conversation
 */

import fs from 'fs';
import path from 'path';

export class Storage {
    constructor(nucleusPath) {
        this.nucleus = nucleusPath || path.join(process.cwd(), '.jork');
        this.memoryDir = path.join(this.nucleus, 'memory');
        this.layersFile = path.join(this.memoryDir, 'layers.json');
        this.historyFile = path.join(this.nucleus, 'history.jsonl');
        this.ensureDirs();
    }

    ensureDirs() {
        if (!fs.existsSync(this.memoryDir)) {
            fs.mkdirSync(this.memoryDir, { recursive: true });
        }
    }

    getHistoryStats() {
        if (!fs.existsSync(this.historyFile)) {
            return { exists: false, messages: 0, size: 0, tokens: 0 };
        }

        const stats = fs.statSync(this.historyFile);
        const content = fs.readFileSync(this.historyFile, 'utf8');
        const lines = content.trim().split('\n').filter(l => l.trim());

        return {
            exists: true,
            messages: lines.length,
            size: stats.size,
            tokens: Math.ceil(content.length / 4)
        };
    }

    readHistory(limit = null, offset = 0) {
        if (!fs.existsSync(this.historyFile)) return [];

        const content = fs.readFileSync(this.historyFile, 'utf8');
        let lines = content.trim().split('\n').filter(l => l.trim());

        if (offset > 0) lines = lines.slice(offset);
        if (limit !== null) lines = lines.slice(0, limit);

        return lines.map(line => {
            try { return JSON.parse(line); }
            catch { return null; }
        }).filter(m => m !== null);
    }

    truncateHistory(keepCount) {
        if (!fs.existsSync(this.historyFile)) return false;

        const content = fs.readFileSync(this.historyFile, 'utf8');
        const lines = content.trim().split('\n').filter(l => l.trim());

        if (lines.length <= keepCount) return false;

        const keepLines = lines.slice(-keepCount);
        fs.writeFileSync(this.historyFile, keepLines.join('\n') + '\n');
        return true;
    }

    saveLayers(layers) {
        fs.writeFileSync(this.layersFile, JSON.stringify(layers, null, 2));
    }

    loadLayers() {
        if (!fs.existsSync(this.layersFile)) return null;
        return JSON.parse(fs.readFileSync(this.layersFile, 'utf8'));
    }

    search(query) {
        const layers = this.loadLayers();
        if (!layers) return [];

        const results = [];
        const queryLower = query.toLowerCase();

        if (layers.L0?.summary?.toLowerCase().includes(queryLower)) {
            results.push({ layer: 'L0', text: layers.L0.summary.slice(0, 200) });
        }

        if (layers.L1) {
            for (const [idx, batch] of layers.L1.entries()) {
                if (batch.summary?.toLowerCase().includes(queryLower)) {
                    results.push({ layer: `L1-${idx}`, text: batch.summary.slice(0, 200) });
                }
            }
        }

        return results;
    }

    getStats() {
        const historyStats = this.getHistoryStats();
        const layers = this.loadLayers();
        const memoryTokens = layers ? Math.ceil(JSON.stringify(layers).length / 4) : 0;

        return {
            history: {
                exists: historyStats.exists,
                messages: historyStats.messages,
                tokens: historyStats.tokens
            },
            memory: {
                exists: !!layers,
                compressedTokens: memoryTokens,
                lastCompressed: layers?.L0?.compressedAt
                    ? new Date(layers.L0.compressedAt).toLocaleString()
                    : null
            },
            compressionRatio: historyStats.tokens > 0
                ? ((1 - memoryTokens / historyStats.tokens) * 100).toFixed(1)
                : 0
        };
    }
}
