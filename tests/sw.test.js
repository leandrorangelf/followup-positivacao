const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('sw.js exists at the site root', () => {
  assert.ok(fs.existsSync('sw.js'));
});

test('sw.js handles push and notificationclick', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(sw, /addEventListener\('push'/);
  assert.match(sw, /addEventListener\('notificationclick'/);
  assert.match(sw, /showNotification/);
  assert.match(sw, /clients\.openWindow|\.focus\(\)/);
});
