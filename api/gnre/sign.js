const { getSession } = require('../_lib/auth');
const { sbFetch, SUPABASE_URL } = require('../_lib/supabase');

const BUCKET = 'gnre-comprovantes';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const path = req.query.path;
  if (!path) return res.status(400).json({ error: 'missing_path' });
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
