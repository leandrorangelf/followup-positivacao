const { sha256Hex, setSessionCookie } = require('../_lib/auth');
const { SENHAS_HASH, COORD_KEYS } = require('../_lib/senhas');

// Rate limit best-effort (em memória por instância — ver limitações no plano de migração).
const attempts = new Map();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const { coord, senha } = req.body || {};
  if (!coord || !senha) return res.status(400).json({ error: 'missing_fields' });

  const now = Date.now();
  const rec = attempts.get(coord);
  if (rec && rec.count >= MAX_ATTEMPTS && now - rec.first < WINDOW_MS) {
    return res.status(429).json({ error: 'too_many_attempts' });
  }

  const hash = SENHAS_HASH[coord];
  if (!hash || sha256Hex(senha) !== hash) {
    const next = rec && now - rec.first < WINDOW_MS ? { count: rec.count + 1, first: rec.first } : { count: 1, first: now };
    attempts.set(coord, next);
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  attempts.delete(coord);

  const isAdmin = coord === 'admin' || coord === 'vagner';
  const isDiretoria = coord === 'diretoria';
  const isFabianoUser = coord === 'fabiano';
  const coordAtual = (isAdmin || isDiretoria || isFabianoUser) ? COORD_KEYS[0] : coord;
  const cliCoordAtual = isAdmin ? COORD_KEYS[0] : coordAtual;

  const session = { user: coord, isAdmin, isDiretoria, coordAtual, cliCoordAtual };
  setSessionCookie(res, session);
  res.status(200).json(session);
};
