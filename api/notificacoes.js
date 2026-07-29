const { getSession } = require('./_lib/auth');
const { sbJson } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  if (req.method === 'GET') {
    const r = await sbJson(`/rest/v1/notificacoes?usuario=eq.${encodeURIComponent(session.user)}&order=created_at.desc&limit=30`, {
      method: 'GET', headers: { 'Content-Type': 'application/json' },
    });
    const lista = r.ok && Array.isArray(r.json) ? r.json : [];
    const naoLidas = lista.filter((n) => !n.lida).length;
    return res.status(200).json({ lista, naoLidas });
  }

  if (req.method === 'POST') {
    const { id, todas } = req.body || {};
    if (todas) {
      const r = await sbJson(`/rest/v1/notificacoes?usuario=eq.${encodeURIComponent(session.user)}&lida=eq.false`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ lida: true }),
      });
      return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
    }
    if (!id) return res.status(400).json({ error: 'missing_fields' });
    const r = await sbJson(`/rest/v1/notificacoes?id=eq.${encodeURIComponent(id)}&usuario=eq.${encodeURIComponent(session.user)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ lida: true }),
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
};
