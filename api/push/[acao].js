const { getSession } = require('../_lib/auth');
const { sbJson } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const acao = req.query.acao;

  if (req.method === 'GET' && acao === 'vapid-public-key') {
    return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
  }

  if (req.method === 'POST' && acao === 'subscribe') {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) return res.status(400).json({ error: 'missing_fields' });
    const r = await sbJson('/rest/v1/push_subscriptions?on_conflict=endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ usuario: session.user, endpoint, p256dh: keys.p256dh, auth: keys.auth }),
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  }

  if (req.method === 'POST' && acao === 'unsubscribe') {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'missing_fields' });
    const r = await sbJson(`/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&usuario=eq.${encodeURIComponent(session.user)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  }

  return res.status(404).json({ error: 'unknown_acao' });
};
