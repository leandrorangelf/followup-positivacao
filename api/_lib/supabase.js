const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rpxrjawzkkpnzancmcif.supabase.co';

function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado');
  return key;
}

// Mesma forma de chamada que o antigo helper sb() do client, mas com a service_role key
// só disponível no servidor.
async function sbFetch(path, opts = {}) {
  const key = serviceKey();
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(opts.headers || {}),
  };
  return fetch(`${SUPABASE_URL}${path}`, { ...opts, headers });
}

async function sbJson(path, opts = {}) {
  const res = await sbFetch(path, opts);
  const text = await res.text();
  let json = null;
  if (text) {
    try { json = JSON.parse(text); } catch { json = null; }
  }
  return { ok: res.ok, status: res.status, json, text };
}

module.exports = { SUPABASE_URL, sbFetch, sbJson };
