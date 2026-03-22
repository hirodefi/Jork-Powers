/**
 * Querier.js
 * Query and retrieve context from compressed memory
 */

export class Querier {
    constructor(storage) {
        this.storage = storage;
    }

    search(query, options = {}) {
        const results = this.storage.search(query);
        return options.limit ? results.slice(0, options.limit) : results;
    }

    getContext(options = {}) {
        const layers = this.storage.loadLayers();
        const stats = this.storage.getHistoryStats();

        if (!layers) {
            return {
                hasMemory: false,
                message: 'No compressed memory yet. Run compress first.',
                historyStats: stats
            };
        }

        const context = [];
        context.push('=== MEMORY CONTEXT ===\n');
        context.push('SUMMARY: ' + layers.L0.summary);

        if (layers.L0.topics?.length) {
            context.push('\nTOPICS: ' + layers.L0.topics.join(', '));
        }

        const maxBatches = options.maxBatches || 5;
        if (layers.L1?.length) {
            context.push('\n\nKEY PAST CONTEXT:');
            const recent = layers.L1.slice(-maxBatches);
            for (const [idx, batch] of recent.entries()) {
                context.push(`\n[Batch ${layers.L1.length - maxBatches + idx}] ${batch.summary.slice(0, 200)}...`);
            }
        }

        if (layers.L2?.previews?.length) {
            context.push('\n\nRECENT MESSAGES:');
            for (const p of layers.L2.previews.slice(-5)) {
                context.push(`  [${p.timestamp || 'recent'}] ${p.preview}...`);
            }
        }

        const memoryTokens = Math.ceil(JSON.stringify(layers).length / 4);
        const compressionRatio = stats.tokens > 0 ? ((1 - memoryTokens / stats.tokens) * 100).toFixed(1) : 0;

        context.push('\n\n=== STATS ===');
        context.push(`Total messages: ${layers.L0.totalMessages}`);
        context.push(`Compression: ${compressionRatio}%`);

        return { hasMemory: true, text: context.join('\n'), layers, stats };
    }
}
