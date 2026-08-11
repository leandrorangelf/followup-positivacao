const { getSession } = require('./_lib/auth');
const { sbJson } = require('./_lib/supabase');
const { isAdminLiteral, isDiretoria, pedidoPertenceASessao } = require('./_lib/authz');

module.exports = async function handler(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  if (req.method === 'GET') {
    const reqUrl = new URL(req.url, 'http://internal');
    const params = reqUrl.searchParams;
    const pedidoIdParam = params.get('pedido_id');
    if (pedidoIdParam) {
      const pedidoId = pedidoIdParam.startsWith('eq.') ? pedidoIdParam.slice(3) : pedidoIdParam;
      if (!(await pedidoPertenceASessao(session, pedidoId))) return res.status(403).json({ error: 'forbidden' });
    } else if (!isAdminLiteral(session) && !isDiretoria(session)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!params.has('order')) params.set('order', 'criado_em.desc');
    if (!params.has('limit')) params.set('limit', '200');
    const r = await sbJson(`/rest/v1/audit_log?${params.toString()}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    res.status(r.status);
    return res.send(r.text);
  }

  if (req.method === 'POST') {
    // Diretoria nunca gera linha de auditoria (preserva o comportamento atual).
    if (isDiretoria(session)) return res.status(200).json({ ok: true, skipped: true });
    const { acao, descricao, detalhes, pedido_id } = req.body || {};
    if (!acao || !descricao) return res.status(400).json({ error: 'missing_fields' });
    const row = { acao, descricao, detalhes: detalhes || null, pedido_id: pedido_id || null, usuario: session.user };
    const r = await sbJson('/rest/v1/audit_log', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row),
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
};
