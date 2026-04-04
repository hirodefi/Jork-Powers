'use strict';

const { extractKeywords, classifyConcepts, expandQuery } = require('./Concepts');

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
        const store = this.store;

        const rawTokens = (query || '')
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2);

        if (rawTokens.length === 0) return [];

        // Expand with synonyms for broader recall
        const tokens = expandQuery(rawTokens);

        // Collect all matching message IDs with hit count for scoring
        const idHits = {};
        for (const token of tokens) {
            const ids = store.getByKeyword(token);
            for (const id of ids) {
                idHits[id] = (idHits[id] || 0) + 1;
            }
        }

        if (Object.keys(idHits).length === 0) return [];

        // Score: keyword hits + recency bonus
        // Higher ID = more recent. Normalize recency to 0-1 range.
        const maxId = store.offsets.length;
        const scored = Object.entries(idHits).map(function([id, hits]) {
            const numId = parseInt(id);
            const recency = maxId > 0 ? numId / maxId : 0; // 0 = oldest, 1 = newest
            // Score = keyword hits (weight 2) + recency (weight 1)
            const score = (hits * 2) + recency;
            return { id: numId, score: score };
        });

        // Sort by score descending, take top N
        scored.sort(function(a, b) { return b.score - a.score; });
        const topIds = scored.slice(0, limit).map(function(s) { return s.id; });

        return store.seekMany(topIds);
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
