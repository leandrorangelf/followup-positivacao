const webpush = require('web-push');
const { sbJson } = require('./supabase');

function ensureVapid() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

async function notificar(usuarios, tipo, titulo, corpo, url) {
  const lista = [...new Set((usuarios || []).filter(Boolean))];
  if (!lista.length) return;

  const rows = lista.map((usuario) => ({ usuario, tipo, titulo, corpo: corpo || null, url: url || null }));
  await sbJson('/rest/v1/notificacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });

  if (!ensureVapid()) return;

  const filtro = lista.map((u) => `"${u.replace(/"/g, '\\"')}"`).join(',');
  const subsR = await sbJson(`/rest/v1/push_subscriptions?usuario=in.(${filtro})&select=id,endpoint,p256dh,auth`, {
    method: 'GET', headers: { 'Content-Type': 'application/json' },
  });
  const subs = subsR.ok && Array.isArray(subsR.json) ? subsR.json : [];
  const payload = JSON.stringify({ title: titulo, body: corpo || '', url: url || '/' });

  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
    } catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        await sbJson(`/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(sub.id)}`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }));
}

module.exports = { notificar };
