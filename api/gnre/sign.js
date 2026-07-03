const { getSession } = require('../_lib/auth');
const { sbFetch, sbJson, SUPABASE_URL } = require('../_lib/supabase');
const { vePrivilegiado } = require('../_lib/authz');

const BUCKET = 'gnre-comprovantes';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const path = req.query.path;
  if (!path) return res.status(400).json({ error: 'missing_path' });

  // path é sempre "pedidos/<id>/<arquivo>" (ver api/gnre/upload.js). Confirma que o
  // pedido existe, pertence à sessão (ou a sessão é privilegiada) e que o path pedido
  // é exatamente o que está gravado no pedido — evita assinar URL pra qualquer path
  // arbitrário do bucket (IDOR).
  const match = /^pedidos\/([^/]+)\//.exec(String(path));
  if (!match) return res.status(400).json({ error: 'invalid_path' });
  const pedidoId = match[1];
  const check = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(pedidoId)}&select=coordenador,gnre_arquivo_url,gnre_comprovante_url`, {
    method: 'GET', headers: { 'Content-Type': 'application/json' },
  });
  const row = check.ok && Array.isArray(check.json) ? check.json[0] : null;
  if (!row) return res.status(404).json({ error: 'pedido_not_found' });
  if (!vePrivilegiado(session) && row.coordenador !== session.user) return res.status(403).json({ error: 'forbidden' });
  if (row.gnre_arquivo_url !== path && row.gnre_comprovante_url !== path) return res.status(403).json({ error: 'path_mismatch' });

  const encodedPath = String(path).split('/').map(encodeURIComponent).join('/');

  const upstream = await sbFetch(`/storage/v1/object/sign/${BUCKET}/${encodedPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60 }),
  });
  if (!upstream.ok) return res.status(502).json({ error: 'sign_failed' });
  const data = await upstream.json().catch(() => null);
  if (!data || !data.signedURL) return res.status(502).json({ error: 'sign_failed' });
  return res.status(200).json({ url: `${SUPABASE_URL}/storage/v1${data.signedURL}` });
};
