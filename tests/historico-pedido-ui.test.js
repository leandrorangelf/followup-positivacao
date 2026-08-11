const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('ficha do pedido tem um placeholder de histórico com id fixo', () => {
  assert.match(html, /id="vd-det-historico"/);
});

test('badge de editado tem id fixo pra ser atualizado depois do fetch', () => {
  assert.match(html, /id="vd-det-badge-editado"/);
});

test('vdAbrirDet chama vdCarregarHistoricoPedido com o id do pedido', () => {
  const start = html.indexOf('function vdAbrirDet(id){');
  const fn = html.slice(start, start + 8000);
  assert.match(fn, /vdCarregarHistoricoPedido\(p\.id\)/);
});

test('vdCarregarHistoricoPedido busca /api/audit filtrado por pedido_id', () => {
  const start = html.indexOf('async function vdCarregarHistoricoPedido');
  assert.ok(start !== -1, 'vdCarregarHistoricoPedido não encontrada');
  const fn = html.slice(start, start + 1500);
  assert.match(fn, /\/api\/audit\?pedido_id=eq\./);
  assert.match(fn, /nEdits/);
  assert.match(fn, /vd-det-historico/);
  assert.match(fn, /vd-det-badge-editado/);
});
