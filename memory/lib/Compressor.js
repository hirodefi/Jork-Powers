/**
 * Compressor.js
 * Single-conversation compressor for Jork
 */

import fs from 'fs';
import readline from 'readline';

export class Compressor {
    constructor(options = {}) {
        this.batchSize = options.batchSize || 50;
        this.rollingWindow = options.rollingWindow || 100;
        this.maxTokens = options.maxTokens || 100000;
    }

    estimateTokens(text) {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }

    async parseJSONL(filePath) {
        const messages = [];
        if (!fs.existsSync(filePath)) return messages;

        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        for await (const line of rl) {
            if (!line.trim()) continue;
            try { messages.push(JSON.parse(line)); }
            catch { /* skip */ }
        }

        return messages;
    }

    extractText(msg) {
        if (msg.text) return msg.text;
        if (typeof msg.content === 'string') return msg.content;
        if (Array.isArray(msg.content)) {
            return msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
        }
        return '';
    }

    extractTopics(text) {
        const topics = new Set();
        const patterns = [
            /\b(solana|ethereum|bitcoin|token|wallet|swap|trade|defi)\b/gi,
            /\b(api|server|database|bug|fix|deploy|build|code)\b/gi,
            /\b(ai|llm|model|agent|prompt|claude|gpt)\b/gi
        ];
        for (const p of patterns) {
            const m = text.toLowerCase().match(p);
            if (m) m.forEach(t => topics.add(t));
        }
        return Array.from(topics).slice(0, 15);
    }

    compressBatch(messages) {
        const texts = messages.map(m => this.extractText(m)).filter(t => t);
        const combined = texts.join('\n');

        return {
            messageCount: messages.length,
            tokenCount: this.estimateTokens(combined),
            topics: this.extractTopics(combined),
            summary: texts.slice(0, 3).map(t => t.slice(0, 200)).join(' ... '),
            timestamp: messages[0]?.timestamp || null
        };
    }

    async compress(messages) {
        if (messages.length === 0) {
            return {
                L0: { summary: 'No messages', topics: [] },
                L1: [],
                L2: { recentCount: 0 },
                stats: { originalMessages: 0, originalTokens: 0, compressedTokens: 0, compressionRatio: 0 }
            };
        }

        const recentCount = Math.min(this.rollingWindow, messages.length);
        const recentMessages = messages.slice(-recentCount);
        const oldMessages = messages.slice(0, -recentCount);

        const batches = [];
        for (let i = 0; i < oldMessages.length; i += this.batchSize) {
            batches.push(this.compressBatch(oldMessages.slice(i, i + this.batchSize)));
        }

        const allTopics = new Set();
        batches.forEach(b => b.topics.forEach(t => allTopics.add(t)));

        const L0 = {
            summary: `Conversation with ${messages.length} messages. Topics: ${Array.from(allTopics).slice(0, 10).join(', ')}`,
            topics: Array.from(allTopics),
            batchCount: batches.length,
            totalMessages: messages.length,
            compressedAt: Date.now()
        };

        const L2 = {
            recentCount: recentMessages.length,
            previews: recentMessages.slice(0, 10).map(m => ({
                timestamp: m.timestamp || m.date,
                preview: this.extractText(m).slice(0, 100)
            }))
        };

        const originalTokens = this.estimateTokens(messages.map(m => this.extractText(m)).join(' '));
        const compressedTokens = this.estimateTokens(JSON.stringify({ L0, L1: batches, L2 }));

        return {
            L0, L1: batches, L2,
            stats: {
                originalMessages: messages.length,
                originalTokens,
                compressedTokens,
                compressionRatio: originalTokens > 0 ? ((1 - compressedTokens / originalTokens) * 100).toFixed(1) : 0
            }
        };
    }
}
