const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const auth = require('../api/_lib/auth');
mock.method(auth, 'getSession', () => ({ user: 'Marcio Vit' }));

const handler = require('../api/notificacoes');

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

test('GET returns the list and unread count for the session user', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let sentUrl = null;
  global.fetch = async (url) => {
    sentUrl = String(url);
    return { ok: true, text: async () => JSON.stringify([{ id: '1', lida: false }, { id: '2', lida: true }]) };
  };
  const res = mockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.naoLidas, 1);
  assert.equal(res.body.lista.length, 2);
  assert.match(sentUrl, /usuario=eq\.Marcio(%20|\+)Vit/);
});

test('POST with id marks only that notification as read, scoped to the session user', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let sentUrl = null;
  global.fetch = async (url) => { sentUrl = String(url); return { ok: true, text: async () => '' }; };
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: { id: 'notif-1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(sentUrl, /id=eq\.notif-1/);
  assert.match(sentUrl, /usuario=eq\.Marcio(%20|\+)Vit/);
});

test('POST with todas marks every unread notification as read', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let sentUrl = null;
  global.fetch = async (url) => { sentUrl = String(url); return { ok: true, text: async () => '' }; };
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: { todas: true } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(sentUrl, /lida=eq\.false/);
});

test('POST without id or todas returns 400', async () => {
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 400);
});
