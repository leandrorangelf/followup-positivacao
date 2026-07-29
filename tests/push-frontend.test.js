const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('aplicarSessao triggers push opt-in after establishing the session', () => {
  const start = html.indexOf('function aplicarSessao');
  const fn = html.slice(start, start + 400);
  assert.match(fn, /initPush\(\)/);
});

test('initPush registers the service worker and subscribes through /api/push', () => {
  assert.match(html, /function initPush\(\)/);
  assert.match(html, /navigator\.serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(html, /\/api\/push\/vapid-public-key/);
  assert.match(html, /\/api\/push\/subscribe/);
});
