#!/usr/bin/env node
/**
 * Memory Power for Jork
 *
 * Stealth memory management for Jork's single conversation.
 * Called by Jork during her think cycle - no separate daemon needed.
 */

import path from 'path';
import { Storage } from './lib/Storage.js';
import { Compressor } from './lib/Compressor.js';
import { Querier } from './lib/Querier.js';

// Default to Jork's nucleus directory
const NUCLEUS = process.env.JORK_NUCLEUS ||
                (process.env.JORK_WORKSPACE ? path.join(process.env.JORK_WORKSPACE, '.jork') : null) ||
                path.join(process.cwd(), '.jork');

function showHelp() {
    console.log(`
Memory Power - Stealth memory management for Jork

Commands:
  status      Show memory statistics

  compress    Compress history.jsonl into L0/L1/L2 layers
              Options: --force (compress even if small)

  context     Get full context (for Jork to use in thinking)
              Options: --format <text|json>

  query <q>   Search compressed memory
              Options: --limit <n>

  check       Quick check if compression needed (returns JSON)

  help        Show this help

Jork Integration:
  During think cycle, call:
    node powers/memory/index.js check     # Returns JSON with needsCompression
    node powers/memory/index.js compress  # Compresses if needed
    node powers/memory/index.js context   # Gets context to include in thinking
`);
}

function parseArgs(args) {
    const result = { command: null, args: [], options: {} };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = args[i + 1];
            if (value && !value.startsWith('--')) {
                result.options[key] = value;
                i++;
            } else {
                result.options[key] = true;
            }
        } else if (!result.command) {
            result.command = arg;
        } else {
            result.args.push(arg);
        }
    }

    return result;
}

async function main() {
    const { command, args, options } = parseArgs(process.argv.slice(2));

    const storage = new Storage(NUCLEUS);
    const compressor = new Compressor({
        batchSize: 50,
        rollingWindow: 100,
        maxTokens: 100000
    });
    const querier = new Querier(storage);

    switch (command) {
        case 'compress': {
            const stats = storage.getHistoryStats();

            if (!stats.exists) {
                console.log('No history file found.');
                process.exit(0);
            }

            if (!options.force && stats.tokens < compressor.maxTokens) {
                console.log(`History is small (${stats.tokens} tokens), no compression needed.`);
                console.log('Use --force to compress anyway.');
                process.exit(0);
            }

            console.log('\n🗜️  Compressing Jork\'s memory...\n');
            console.log(`History: ${stats.messages} messages, ${stats.tokens} tokens`);

            try {
                const messages = storage.readHistory();
                const result = await compressor.compress(messages);

                storage.saveLayers({
                    L0: result.L0,
                    L1: result.L1,
                    L2: result.L2
                });

                const truncated = storage.truncateHistory(compressor.rollingWindow);

                console.log(`\n✅ Memory compressed!\n`);
                console.log(`Original: ${result.stats.originalMessages} messages, ${result.stats.originalTokens} tokens`);
                console.log(`Compressed: ${result.stats.compressedTokens} tokens`);
                console.log(`Reduction: ${result.stats.compressionRatio}%`);
                console.log(`History truncated: ${truncated ? 'yes' : 'no'}`);
                console.log(`\nLayers saved to: ${NUCLEUS}/memory/\n`);

            } catch (e) {
                console.error('Error compressing:', e.message);
                process.exit(1);
            }
            break;
        }

        case 'status': {
            const stats = storage.getStats();
            const layers = storage.loadLayers();

            console.log('\n📊 Jork Memory Status\n');
            console.log(`Nucleus: ${NUCLEUS}`);
            console.log('');
            console.log('History:');
            console.log(`  Exists: ${stats.history.exists}`);
            console.log(`  Messages: ${stats.history.messages}`);
            console.log(`  Tokens: ${stats.history.tokens}`);
            console.log('');
            console.log('Compressed Memory:');
            console.log(`  Exists: ${!!layers}`);
            console.log(`  Tokens: ${stats.memory.compressedTokens || 0}`);
            console.log(`  Last compressed: ${stats.memory.lastCompressed || 'Never'}`);
            console.log('');
            console.log(`Compression ratio: ${stats.compressionRatio}%`);
            console.log(`Needs compression: ${stats.history.tokens > 100000 ? 'Yes' : 'No'}`);
            console.log('');
            break;
        }

        case 'check': {
            const stats = storage.getStats();
            const needsCompression = stats.history.tokens > 100000;

            console.log(JSON.stringify({
                needsCompression,
                historyTokens: stats.history.tokens,
                historyMessages: stats.history.messages,
                threshold: 100000
            }));
            break;
        }

        case 'context': {
            const ctx = querier.getContext({
                maxBatches: parseInt(options.maxBatches) || 5
            });

            if (options.format === 'json') {
                console.log(JSON.stringify(ctx, null, 2));
            } else {
                console.log(ctx.text || ctx.message || 'No context available');
            }
            break;
        }

        case 'query': {
            const query = args.join(' ');
            if (!query) {
                console.error('Error: No query specified');
                process.exit(1);
            }

            const results = querier.search(query, { limit: parseInt(options.limit) || 10 });

            if (results.length === 0) {
                console.log('\nNo results found.\n');
                return;
            }

            console.log(`\n🔍 Found ${results.length} result(s):\n`);
            for (const [idx, result] of results.entries()) {
                console.log(`${idx + 1}. [${result.layer}] ${result.text}...`);
            }
            console.log('');
            break;
        }

        case 'help':
        case '--help':
        case '-h':
        case undefined:
            showHelp();
            break;

        default:
            console.error(`Unknown command: ${command}`);
            showHelp();
            process.exit(1);
    }
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
