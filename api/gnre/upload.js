const { getSession } = require('../_lib/auth');
const { sbFetch } = require('../_lib/supabase');
const { podeAnexarGnre, pedidoPertenceASessao } = require('../_lib/authz');

const MAX_SIZE = 10 * 1024 * 1024;
const BUCKET = 'gnre-comprovantes';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPO_RE = /^[a-zA-Z0-9_-]{1,40}$/;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Nota: o limite de payload de Vercel Functions (~4.5MB por padrão) é menor que o
// limite de 10MB que o app sempre validou no client. Arquivos entre 4.5MB e 10MB
// podem falhar aqui mesmo estando dentro da regra antiga — se isso acontecer na
// prática, a solução é trocar para upload direto (signed upload URL) em vez de proxy.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });
  if (!podeAnexarGnre(session)) return res.status(403).json({ error: 'forbidden' });

  const { id, tipo, fileName } = req.query;
  if (!id || !tipo || !fileName) return res.status(400).json({ error: 'missing_fields' });
  if (!(await pedidoPertenceASessao(session, id))) return res.status(403).json({ error: 'forbidden' });

  const contentType = req.headers['content-type'] || 'application/octet-stream';
  const buf = await readRawBody(req);
  if (buf.length > MAX_SIZE) return res.status(413).json({ error: 'file_too_large' });

  const safeName = String(fileName).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 90);
  const path = `pedidos/${id}/${tipo}_${Date.now()}_${safeName}`;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');

  const upstream = await sbFetch(`/storage/v1/object/${BUCKET}/${encodedPath}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'x-upsert': 'true' },
    body: buf,
  });
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    console.error('Erro upload GNRE:', upstream.status, text);
    return res.status(502).json({ error: 'upload_failed' });
  }
  return res.status(200).json({ ok: true, path });
};
