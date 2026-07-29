const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const auth = require('../api/_lib/auth');
mock.method(auth, 'getSession', (req) => req.__session);

const push = require('../api/_lib/push');
const notificarCalls = [];
mock.method(push, 'notificar', async (...args) => { notificarCalls.push(args); });

const handler = require('../api/pedidos-vendas/[acao]');

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

function req(session, acao, body) {
  return { method: 'POST', query: { acao }, headers: {}, body, __session: session };
}

test.beforeEach(() => {
  notificarCalls.length = 0;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

test('creating a new pedido notifies fabiano and admin', async () => {
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify([{ id: 'ped-1' }]) });
  const body = { ped: { cliente_nome: 'Cliente Teste', coordenador: 'Marcio Vit' }, itens: [] };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'salvar', body), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'pedido_criado');
  assert.ok(call, 'esperava notificar pedido_criado');
  assert.deepEqual(call[0].slice().sort(), ['admin', 'fabiano']);
});

test('creating a pedido with prazo pendente also notifies admin, vagner and diretoria', async () => {
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify([{ id: 'ped-2' }]) });
  const body = { ped: { cliente_nome: 'Cliente Teste', prazo_status: 'pendente', prazo_solicitado_dias: 60 }, itens: [] };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'salvar', body), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'prazo_solicitado');
  assert.ok(call);
  assert.deepEqual(call[0].slice().sort(), ['admin', 'diretoria', 'vagner']);
});

test('editing a pedido into prazo pendente also notifies admin, vagner and diretoria', async () => {
  global.fetch = async () => ({ ok: true, text: async () => '' });
  const body = { id: 'ped-3', ped: { cliente_nome: 'Cliente Edit', prazo_status: 'pendente', prazo_solicitado_dias: 45 }, itens: [] };
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'salvar', body), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'prazo_solicitado');
  assert.ok(call);
});

test('prazo-decidir notifies whoever requested it', async () => {
  global.fetch = async (url, opts) => {
    if (opts.method === 'GET') {
      return { ok: true, text: async () => JSON.stringify([{ prazo_status: 'pendente', prazo_solicitado_dias: 45, prazo_solicitado_por: 'Marcio Vit', cliente_nome: 'Cliente Prazo' }]) };
    }
    return { ok: true, text: async () => '' };
  };
  const res = mockRes();
  await handler(req({ user: 'vagner' }, 'prazo-decidir', { id: 'ped-6', aprovar: true }), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'prazo_decidido');
  assert.ok(call);
  assert.deepEqual(call[0], ['Marcio Vit']);
});

test('faturar completo notifies the pedido coordenador', async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('select=prazo_status')) return { ok: true, text: async () => JSON.stringify([{ prazo_status: null }]) };
    if (u.includes('select=coordenador,cliente_nome')) return { ok: true, text: async () => JSON.stringify([{ coordenador: 'Marcio Vit', cliente_nome: 'Cliente Fat' }]) };
    return { ok: true, text: async () => '' };
  };
  const body = { id: 'ped-4', itensRows: [], pedidoPatch: { status: 'faturado' } };
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'faturar', body), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'pedido_faturado');
  assert.ok(call);
  assert.deepEqual(call[0], ['Marcio Vit']);
});

test('faturar parcial does not notify pedido_faturado', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('select=prazo_status')) return { ok: true, text: async () => JSON.stringify([{ prazo_status: null }]) };
    return { ok: true, text: async () => '' };
  };
  const body = { id: 'ped-5', itensRows: [], pedidoPatch: { status: 'pedido' } };
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'faturar', body), res);
  assert.equal(res.statusCode, 200);
  assert.equal(notificarCalls.find((c) => c[1] === 'pedido_faturado'), undefined);
});

test('gnre-manage marking enviada notifies the coordenador', async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('select=prazo_status')) return { ok: true, text: async () => JSON.stringify([{ prazo_status: null }]) };
    if (u.includes('select=coordenador,cliente_nome')) return { ok: true, text: async () => JSON.stringify([{ coordenador: 'Rosana', cliente_nome: 'Cliente GNRE' }]) };
    return { ok: true, text: async () => '' };
  };
  const body = { id: 'ped-7', payload: { gnre_status: 'enviada', gnre_enviado_at: '2026-07-29T00:00:00.000Z' } };
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'gnre-manage', body), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'gnre');
  assert.ok(call);
  assert.deepEqual(call[0], ['Rosana']);
});

test('gnre-manage marking calculada (valor informado) does not notify', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('select=prazo_status')) return { ok: true, text: async () => JSON.stringify([{ prazo_status: null }]) };
    return { ok: true, text: async () => '' };
  };
  const body = { id: 'ped-8', payload: { gnre_status: 'calculada', gnre_valor: 120.5 } };
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'gnre-manage', body), res);
  assert.equal(res.statusCode, 200);
  assert.equal(notificarCalls.find((c) => c[1] === 'gnre'), undefined);
});
