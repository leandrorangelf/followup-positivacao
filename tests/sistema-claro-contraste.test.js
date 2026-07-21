const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /--bg:#f4f7fb/);
assert.match(html, /--text:#172136/);
assert.match(html, /--muted:#52627a/);
assert.match(html, /--border:#d9e2ee/);
assert.match(html, /\.sku-qty-item\{[^}]*background:var\(--card\)/);
assert.match(html, /\.coord-row-good/);
assert.match(html, /\.coord-row-warn/);
assert.match(html, /\.coord-row-bad/);

console.log('sistema claro e contraste structure ok');
