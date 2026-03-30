'use strict';

const path = require('path');
const Store    = require('./lib/Store');
const Appender = require('./lib/Appender');
const Context  = require('./lib/Context');

const NUCLEUS = process.env.JORK_NUCLEUS ||
    (process.env.JORK_WORKSPACE ? path.join(process.env.JORK_WORKSPACE, '.jork') : null) ||
    path.join(process.cwd(), '.jork');

const config = (() => {
    try { return require('./CONFIG.json').settings; } catch(e) { return {}; }
})();

// Singleton instances (shared when require()'d)
const store    = new Store(NUCLEUS);
const appender = new Appender(store, NUCLEUS, config);
const ctx      = new Context(store, config);

store.load();

// ---- Module API (used when require()'d by jork.js) ----

module.exports = {
    context: ()          => ctx.build(),
    query:   (q, limit)  => ctx.search(q, limit),
    append:  (role, msg) => appender.write(role, msg),
    status:  ()          => store.status(),
    rebuild: ()          => { store.close(); store.rebuild(); store.load(); },
    close:   ()          => { appender.close(); store.close(); },
};

// ---- CLI (only runs when executed directly) ----

if (require.main === module) {
    const args       = process.argv.slice(2);
    const cmd        = args[0];
    const options    = {};
    const positional = [];

    for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
            options[key] = val;
        } else {
            positional.push(args[i]);
        }
    }

    switch (cmd) {

        case 'context':
            console.log(ctx.build());
            break;

        case 'query': {
            const q = positional.join(' ') || options.q;
            if (!q) { console.error('Usage: index.js query <query text>'); process.exit(1); }
            const results = ctx.search(q, options.limit);
            if (results.length === 0) {
                console.log('No results found.');
            } else {
                console.log(`Found ${results.length} result(s):\n`);
                results.forEach((m, i) => console.log(`${i + 1}. [${m.id}] ${m.role}: ${m.msg}`));
            }
            break;
        }

        case 'append': {
            const role = options.role || positional[0];
            const msg  = options.msg  || positional[1];
            if (!role || !msg) {
                console.error('Usage: index.js append --role <role> --msg <msg>');
                process.exit(1);
            }
            const id = appender.write(role, msg);
            console.log(`Appended message id=${id}`);
            appender.close();
            break;
        }

        case 'status': {
            const s = store.status();
            console.log('\nJork Memory Status\n');
            console.log(`Messages:  ${s.messages}`);
            console.log(`Keywords:  ${s.keywords}`);
            console.log(`Concepts:  ${s.concepts}`);
            console.log(`History:   ${s.historyMB} MB`);
            console.log(`Summary:   ${s.summary}`);
            console.log('');
            break;
        }

        case 'check': {
            const s = require('fs').existsSync(path.join(NUCLEUS, 'history.jsonl'))
                ? require('fs').statSync(path.join(NUCLEUS, 'history.jsonl'))
                : { size: 0 };
            console.log(JSON.stringify({
                messages:        store.status().messages,
                estimatedTokens: Math.ceil(s.size / 4),
                keywords:        store.status().keywords,
                concepts:        store.status().concepts,
            }));
            break;
        }

        case 'rebuild':
            store.close();
            store.rebuild();
            console.log('Rebuild complete.');
            break;

        default:
            console.log(`
Jork Memory Power

Commands:
  context              Build think-cycle context (summary + recent + relevant)
  query <text>         Search memory by keyword
  append --role <r> --msg <m>   Append a message
  status               Show memory stats
  check                Quick JSON stats
  rebuild              Rebuild full index from history.jsonl

Environment:
  JORK_NUCLEUS         Path to .jork directory (default: ./.jork)
  JORK_WORKSPACE       Alternative: path to workspace (uses workspace/.jork)
`);
            break;
    }

    appender.close();
    store.close();
}
