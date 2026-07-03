const { getSession } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });
  const { user, isAdmin, isDiretoria, coordAtual, cliCoordAtual } = session;
  res.status(200).json({ user, isAdmin, isDiretoria, coordAtual, cliCoordAtual });
};
