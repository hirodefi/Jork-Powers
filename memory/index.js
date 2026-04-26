'use strict';

var Database = require('better-sqlite3');
var path = require('path');
var fs = require('fs');
var stopwords = require('./stopwords');

var DB_PATH = path.join(__dirname, '..', '..', '.jork', 'memory', 'memory.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

var db = new Database(DB_PATH);

db.exec(
  'CREATE TABLE IF NOT EXISTS messages (' +
  'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
  'ts TEXT NOT NULL, ' +
  'role TEXT NOT NULL, ' +
  'content TEXT NOT NULL, ' +
  'keywords TEXT' +
  ');' +
  'CREATE INDEX IF NOT EXISTS idx_ts ON messages(ts);'
);

var insert = db.prepare(
  'INSERT INTO messages (ts, role, content, keywords) VALUES (?, ?, ?, ?)'
);
var recent = db.prepare(
  'SELECT id, role, content, ts FROM messages ORDER BY id DESC LIMIT ?'
);
var search = db.prepare(
  'SELECT id, role, content, ts FROM messages WHERE keywords LIKE ? OR content LIKE ? ORDER BY id DESC LIMIT ?'
);

function extractKeywords(text) {
  if (!text) return '';
  var words = text.toLowerCase().split(/\W+/);
  return words
    .filter(function(w) { return w.length > 4 && stopwords.indexOf(w) === -1; })
    .join(' ');
}

function append(role, content) {
  var capped = (content || '').slice(0, 2000);
  var kw = extractKeywords(capped);
  var ts = new Date().toISOString();
  insert.run(ts, role, capped, kw);
}

function context() {
  var rows = recent.all(20);
  if (!rows || rows.length === 0) return '';
  return rows
    .reverse()
    .map(function(r) {
      return '[' + r.role + '] ' + (r.content || '').slice(0, 200);
    })
    .join('\n');
}

function countMatches(row, words) {
  var combined = ((row.keywords || '') + ' ' + (row.content || '')).toLowerCase();
  var count = 0;
  for (var i = 0; i < words.length; i++) {
    if (combined.indexOf(words[i]) !== -1) count++;
  }
  return count;
}

function query(text, n) {
  if (!text || !n) return [];

  var words = text.toLowerCase().split(/\W+/)
    .filter(function(w) { return w.length > 2 && stopwords.indexOf(w) === -1; });

  if (words.length === 0) {
    var fb = recent.all(n || 5);
    return (fb || []).map(function(r) {
      return { role: r.role, msg: r.content, ts: r.ts };
    });
  }

  var seen = {};
  var candidates = [];

  for (var i = 0; i < words.length; i++) {
    var pattern = '%' + words[i] + '%';
    var rows = search.all(pattern, pattern, n * 3);
    if (!rows) continue;
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      if (!seen[r.id]) {
        seen[r.id] = true;
        candidates.push(r);
      }
    }
  }

  if (candidates.length === 0) {
    var fallback = recent.all(5);
    if (fallback) {
      for (var k = 0; k < fallback.length; k++) {
        if (!seen[fallback[k].id]) {
          seen[fallback[k].id] = true;
          candidates.push(fallback[k]);
        }
      }
    }
  }

  candidates.forEach(function(c) { c._score = countMatches(c, words); });
  candidates.sort(function(a, b) { return b._score - a._score || b.id - a.id; });

  return candidates.slice(0, n).map(function(r) {
    return { role: r.role, msg: r.content, ts: r.ts };
  });
}

function close() {
  db.close();
}

module.exports = { append: append, context: context, query: query, close: close };
