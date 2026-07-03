const { getSession } = require('../_lib/auth');
const { sbFetch } = require('../_lib/supabase');
const { GENERIC_TABLES, scopeQuery, enforceBodyOwnership, ALLOWED_PREFER } = require('../_lib/authz');

module.exports = async function handler(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const table = req.query.table;
  const rules = GENERIC_TABLES[table];
  if (!rules) return res.status(404).json({ error: 'unknown_table' });

  const rule = rules[req.method];
  if (!rule || !rule(session)) return res.status(403).json({ error: 'forbidden' });

  const reqUrl = new URL(req.url, 'http://internal');
  reqUrl.searchParams.delete('table'); // Vercel injeta o segmento dinâmico [table] na querystring
  const params = scopeQuery(table, session, reqUrl.searchParams);

  let bodyToSend;
  if (req.method === 'POST' || req.method === 'PATCH') {
    bodyToSend = enforceBodyOwnership(table, session, req.body);
  }

  const headers = { 'Content-Type': 'application/json' };
  const prefer = req.headers['prefer'];
  if (prefer && ALLOWED_PREFER.has(prefer)) headers.Prefer = prefer;

  const qs = params.toString();
  const path = `/rest/v1/${table}${qs ? `?${qs}` : ''}`;

  const upstream = await sbFetch(path, {
    method: req.method,
    headers,
    body: bodyToSend !== undefined ? JSON.stringify(bodyToSend) : undefined,
  });

  const text = await upstream.text();
  res.status(upstream.status);
  if (text) {
    res.setHeader('Content-Type', 'application/json');
    return res.send(text);
  }
  return res.end();
};
