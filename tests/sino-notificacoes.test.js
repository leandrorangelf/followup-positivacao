const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('topbar has a sino element with unread badge and dropdown', () => {
  assert.match(html, /id="sino-badge"/);
  assert.match(html, /id="sino-dropdown"/);
  assert.match(html, /onclick="sinoToggle\(\)"/);
});

test('sino polls /api/notificacoes and marks read on click', () => {
  assert.match(html, /function carregarNotificacoes\(\)/);
  assert.match(html, /fetch\('\/api\/notificacoes'/);
  assert.match(html, /function sinoClicarNotif\(id\)/);
  assert.match(html, /setInterval\(carregarNotificacoes,\s*60000\)/);
});

test('aplicarSessao starts the notification poll', () => {
  const start = html.indexOf('function aplicarSessao');
  const fn = html.slice(start, start + 400);
  assert.match(fn, /iniciarPollNotificacoes\(\)/);
});
