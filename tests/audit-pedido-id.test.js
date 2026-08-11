const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const auth = require('../api/_lib/auth');
mock.method(auth, 'getSession', (req) => req.__session);

const handler = require('../api/audit');

function mockRes() {
  const res = { statusCode: 200, body: null, sent: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.send = (t) => { res.sent = t; return res; };
  return res;
}

function req(session, method, url, body) {
  return { method, url, headers: {}, body, __session: session };
}

test.beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

test('POST /api/audit grava pedido_id quando informado', async () => {
  let capturedBody = null;
  global.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, text: async () => '' };
  };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'POST', '/api/audit', {
    acao: 'editar', descricao: 'Pedido editado', detalhes: null, pedido_id: 'ped-123',
  }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(capturedBody.pedido_id, 'ped-123');
});

test('POST /api/audit grava pedido_id null quando omitido', async () => {
  let capturedBody = null;
  global.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, text: async () => '' };
  };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'POST', '/api/audit', {
    acao: 'criar', descricao: 'Novo pedido',
  }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(capturedBody.pedido_id, null);
});

test('GET com pedido_id permite coordenador dono do pedido', async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/rest/v1/pedidos_vendas')) {
      return { ok: true, status: 200, text: async () => JSON.stringify([{ coordenador: 'Marcio Vit' }]) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify([{ id: 1, acao: 'editar' }]) };
  };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'GET', '/api/audit?pedido_id=eq.ped-123', undefined), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.sent, /"acao":"editar"/);
});

test('GET com pedido_id bloqueia coordenador que nao e dono do pedido', async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/rest/v1/pedidos_vendas')) {
      return { ok: true, text: async () => JSON.stringify([{ coordenador: 'Igor Cater' }]) };
    }
    return { ok: true, text: async () => JSON.stringify([]) };
  };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'GET', '/api/audit?pedido_id=eq.ped-123', undefined), res);
  assert.equal(res.statusCode, 403);
});

test('GET sem pedido_id continua exigindo admin/diretoria', async () => {
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify([]) });
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'GET', '/api/audit', undefined), res);
  assert.equal(res.statusCode, 403);
});

test('GET sem pedido_id libera admin (comportamento atual preservado)', async () => {
  global.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify([]) });
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'GET', '/api/audit', undefined), res);
  assert.equal(res.statusCode, 200);
});
