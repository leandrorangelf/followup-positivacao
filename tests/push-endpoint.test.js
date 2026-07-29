const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const auth = require('../api/_lib/auth');
mock.method(auth, 'getSession', () => ({ user: 'admin', isAdmin: true }));

const handler = require('../api/push/[acao]');

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

test('GET vapid-public-key returns the configured key', async () => {
  process.env.VAPID_PUBLIC_KEY = 'fake-public-key';
  const res = mockRes();
  await handler({ method: 'GET', query: { acao: 'vapid-public-key' }, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { publicKey: 'fake-public-key' });
  delete process.env.VAPID_PUBLIC_KEY;
});

test('POST subscribe stores the endpoint under the session user', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let sentUrl = null, sentBody = null;
  global.fetch = async (url, opts) => { sentUrl = String(url); sentBody = JSON.parse(opts.body); return { ok: true, text: async () => '' }; };
  const res = mockRes();
  await handler({ method: 'POST', query: { acao: 'subscribe' }, headers: {}, body: { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(sentUrl, /on_conflict=endpoint/);
  assert.equal(sentBody.usuario, 'admin');
  assert.equal(sentBody.endpoint, 'https://push.example/abc');
});

test('POST subscribe rejects a malformed body', async () => {
  const res = mockRes();
  await handler({ method: 'POST', query: { acao: 'subscribe' }, headers: {}, body: { endpoint: 'https://push.example/abc' } }, res);
  assert.equal(res.statusCode, 400);
});

test('POST unsubscribe deletes only the session user own subscription', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let sentUrl = null;
  global.fetch = async (url) => { sentUrl = String(url); return { ok: true, text: async () => '' }; };
  const res = mockRes();
  await handler({ method: 'POST', query: { acao: 'unsubscribe' }, headers: {}, body: { endpoint: 'https://push.example/abc' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(sentUrl, /usuario=eq\.admin/);
  assert.match(sentUrl, /endpoint=eq\.https%3A%2F%2Fpush\.example%2Fabc/);
});

test('unknown acao returns 404', async () => {
  const res = mockRes();
  await handler({ method: 'GET', query: { acao: 'nope' }, headers: {} }, res);
  assert.equal(res.statusCode, 404);
});
