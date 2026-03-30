'use strict';

const { extractKeywords, classifyConcepts } = require('./Concepts');

class Context {
    constructor(store, config) {
        this.store         = store;
        this.recentWindow  = (config && config.recentWindow)       || 20;
        this.conceptDepth  = (config && config.contextConceptDepth) || 5;
    }

    build() {
        const store = this.store;

        // Step 1: Summary (already in memory)
        const summary = store.summary;

        // Step 2: Recent N message IDs
        const recentIds = store.getRecentIds(this.recentWindow);
        const recent    = store.seekMany(recentIds);

        // Step 3: Identify active concepts from last 5 messages
        const lastFive      = recent.slice(0, 5);
        const activeConcepts = new Set();
        for (const m of lastFive) {
            classifyConcepts(m.msg || '').forEach(c => activeConcepts.add(c));
        }

        // Step 4: Fetch relevant messages per active concept
        const recentIdSet = new Set(recentIds);
        const relevantMap = {};

        for (const concept of activeConcepts) {
            const allIds = store.getByConcept(concept);
            // Most recent first, exclude already-in-recent
            const filtered = allIds
                .slice()
                .reverse()
                .filter(id => !recentIdSet.has(id))
                .slice(0, this.conceptDepth);
            if (filtered.length > 0) relevantMap[concept] = filtered;
        }

        // Step 5: Seek relevant messages
        const relevant = [];
        for (const [concept, ids] of Object.entries(relevantMap)) {
            const messages = store.seekMany(ids);
            for (const m of messages) {
                relevant.push({ concept, ...m });
            }
        }

        return this._format(summary, recent, relevant);
    }

    search(query, limit) {
        limit = parseInt(limit) || 10;
        const store  = this.store;

        const tokens = (query || '')
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2);

        if (tokens.length === 0) return [];

        // Try intersection first (all tokens must match)
        let resultIds = null;
        for (const token of tokens) {
            const ids = new Set(store.getByKeyword(token));
            if (resultIds === null) {
                resultIds = ids;
            } else {
                resultIds = new Set([...resultIds].filter(id => ids.has(id)));
            }
        }

        // Fallback to union if intersection empty
        if (!resultIds || resultIds.size === 0) {
            resultIds = new Set();
            for (const token of tokens) {
                store.getByKeyword(token).forEach(id => resultIds.add(id));
            }
        }

        const sorted = [...resultIds].sort((a, b) => b - a).slice(0, limit);
        return store.seekMany(sorted);
    }

    _format(summary, recent, relevant) {
        let out = '=== MEMORY CONTEXT ===\n\n';

        if (summary && summary.trim()) {
            out += 'SUMMARY:\n' + summary.trim() + '\n\n';
        }

        out += 'RECENT:\n';
        for (const m of recent) {
            out += `[${m.id}] ${m.role}: ${m.msg}\n`;
        }

        if (relevant.length > 0) {
            out += '\nRELEVANT:\n';
            for (const m of relevant) {
                out += `[${m.concept}] [${m.id}] ${m.role}: ${m.msg}\n`;
            }
        }

        out += '\n=== END ===';
        return out;
    }
}

module.exports = Context;
