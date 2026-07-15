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

test('partial faturamento is operationally faturado and has its own continuation filter', () => {
  assert.match(html, /function vdPedidoFaturadoParcial\(p\)/);
  assert.match(html, /if\(vdFiltro==='parcial'\)/);
  assert.match(html, /if\(vdFiltro==='pendente'\).*vdPedidoPendente\(p\)/s);
  assert.match(html, /relStatusFiltro==='pendente'\)lista=lista\.filter\(vdPedidoPendente\)/);
  assert.match(html, /label:'Faturado \/ Entregue',key:'fim'/);
});
