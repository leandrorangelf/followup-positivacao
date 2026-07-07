const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('dashboard reload requested during loading is queued', () => {
  assert.match(html, /dashReloadPendente/);
  assert.match(html, /if\(dashCarregando\)\{dashReloadPendente=true;return;\}/);
});

test('dashboard can render from cached history without refetching on month changes', () => {
  assert.match(html, /dashCacheKey/);
  assert.match(html, /dashRenderHistorico\(dashHistoricoVendas,coordFiltro\);return;/);
});
