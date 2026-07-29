const test = require('node:test');
const assert = require('node:assert/strict');
const webpush = require('web-push');

const { notificar } = require('../api/_lib/push');

test('notificar() with no destinatarios makes no requests', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let called = false;
  global.fetch = async () => { called = true; return { ok: true, text: async () => '[]' }; };
  await notificar([], 'pedido_criado', 'Titulo', 'Corpo', '/x');
  assert.equal(called, false);
});

test('notificar() inserts one row per usuario and skips push when VAPID is not configured', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url: String(url), body: opts && opts.body ? JSON.parse(opts.body) : null });
    return { ok: true, text: async () => '[]' };
  };
  await notificar(['admin', 'vagner'], 'prazo_solicitado', 'Prazo especial pedido', 'Cliente X quer 60 dias', '/vendas');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/notificacoes$/);
  assert.deepEqual(calls[0].body, [
    { usuario: 'admin', tipo: 'prazo_solicitado', titulo: 'Prazo especial pedido', corpo: 'Cliente X quer 60 dias', url: '/vendas' },
    { usuario: 'vagner', tipo: 'prazo_solicitado', titulo: 'Prazo especial pedido', corpo: 'Cliente X quer 60 dias', url: '/vendas' },
  ]);
});

test('notificar() queries push_subscriptions and sends nothing when there are none', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const keys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, text: async () => '[]' };
  };
  await notificar(['fabiano'], 'pedido_criado', 'Novo pedido', 'Cliente Y', '/vendas');
  assert.equal(calls.length, 2);
  assert.match(calls[1], /\/rest\/v1\/push_subscriptions\?usuario=in\.\("fabiano"\)/);
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
});
