'use strict';

const STOPWORDS = new Set([
    'the','this','that','with','from','have','been','just','like','about',
    'what','when','where','would','could','should','some','more','than',
    'them','then','into','also','does','done','back','were','will','each',
    'very','much','well','only','over','such','take','here','there','your',
    'they','their','which','being','because','these','those','after','before',
]);

const CONCEPTS = {
    radar:          /radar|grpc|pipeline|stream|websocket|monitor|feed/i,
    market_making:  /market.mak|mm\b|spread|liquidity|depth|order.book/i,
    token_ops:      /launch|mint|deploy|pump|snipe|token|ca\b|contract/i,
    wallet_ops:     /wallet|keypair|sign|transfer|balance|lamport/i,
    trading:        /trade|swap|buy|sell|entry|exit|pnl|profit|loss/i,
    goals:          /goal|plan|want to|going to|intend|focus|next step/i,
    issues:         /bug|fix|error|broke|fail|crash|wrong|problem/i,
    people:         /told me|he said|she said|team|partner|user|investor/i,
    identity:       /i am|i feel|my purpose|i think about myself/i,
    treasury:       /treasury|fund|budget|cost|revenue|earn|income/i,
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
