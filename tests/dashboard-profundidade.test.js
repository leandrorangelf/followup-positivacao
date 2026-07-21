const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /\.trend-bars\{[^}]*position:relative/);
assert.match(html, /\.trend-meta-line/);
assert.match(html, /Evolução de vendas realizadas[\s\S]*trend-volume[\s\S]*t\.vol/);
assert.match(html, /Evolução de performance[\s\S]*trend-volume[\s\S]*t\.vol/);
assert.match(html, /return\{label:m\.slice\(0,3\),pct:[^}]*,vol\}/);
assert.match(html, /<th>Tendência<\/th>/);
assert.match(html, /coord-trend-bar/);
assert.match(html, /grid-template-columns:minmax\(0,1\.3fr\) minmax\(300px,1\.1fr\)/);
assert.match(html, /#s-dash \.sku-qty-full,#s-dash \.sku-qty-numbers\{font-size:13px/);

console.log('dashboard profundidade structure ok');
