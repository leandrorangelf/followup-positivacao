const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('auditLog aceita pedidoId e manda pedido_id no body', () => {
  const start = html.indexOf('async function auditLog(');
  const fn = html.slice(start, start + 500);
  assert.match(fn, /async function auditLog\(acao, descricao, detalhes, pedidoId\)/);
  assert.match(fn, /pedido_id\s*:\s*pedidoId\s*\|\|\s*null/);
});

test('criar/editar pedido loga com pedidoId', () => {
  const start = html.indexOf("auditLog(acao,\n      (acao==='criar'");
  assert.ok(start !== -1, 'call site de criar/editar pedido não encontrado');
  const call = html.slice(start, start + 250);
  assert.match(call, /,\s*pedidoId\s*\)/);
});

test('comentário loga com pedido_id do pedido', () => {
  assert.match(html, /auditLog\('editar','Comentario do '\+autor\+' · '\+p\.cliente_nome,txt\|\|'Comentario removido',p\.id\)/);
});

test('faturar loga com pedido_id do pedido', () => {
  const start = html.indexOf("auditLog('faturar',");
  const call = html.slice(start, start + 200);
  assert.match(call, /,\s*p\.id\s*\)/);
});

test('reverter faturamento loga com pedido_id', () => {
  assert.match(html, /auditLog\('reverter_faturamento','Reversão de faturamento · '\+p\.cliente_nome,'Coordenador: '\+p\.coordenador\+' · '\+x\.faturadoCx\+' cx revertidas para pendente',p\.id\)/);
});

test('anexar GNRE loga com pedido_id', () => {
  const start = html.indexOf("auditLog('editar',(tipo==='gnre'");
  const call = html.slice(start, start + 200);
  assert.match(call, /,\s*id\s*\)/);
});

test('atualizar GNRE loga com pedido_id', () => {
  assert.match(html, /auditLog\('editar','GNRE atualizada · '\+p\.cliente_nome,'Status: '\+\(payload\.gnre_status\|\|vdGnreStatus\(p\)\)\+\(payload\.gnre_valor!=null\?' · Valor: '\+vdFmt\(payload\.gnre_valor\):''\),id\)/);
});

test('excluir pedido (ficha aberta) loga com pedido_id', () => {
  assert.match(html, /auditLog\('excluir','Pedido excluído · '\+vdDetAtual\.cliente_nome,'id:'\+vdDetAtual\.id\+.*,vdDetAtual\.id\)/);
});

test('excluir pedido (lista) loga com pedido_id', () => {
  const start = html.indexOf('async function vdExcluirPedidoPorId');
  const fn = html.slice(start, start + 700);
  assert.match(fn, /auditLog\('excluir','Pedido excluído · '\+p\.cliente_nome,'id:'\+id\+.*,id\)/);
});

test('restaurar pedido loga com pedido_id', () => {
  assert.match(html, /auditLog\('editar','Pedido restaurado','id:'\+id,id\)/);
});

test('decisão de prazo agora gera log com pedido_id', () => {
  const start = html.indexOf('async function vdDecidirPrazo');
  const fn = html.slice(start, start + 500);
  assert.match(fn, /auditLog\('editar'/);
  assert.match(fn, /,\s*id\s*\)/);
});
