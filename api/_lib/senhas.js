// Movido de index.html (não é servido pelo navegador: arquivos sob api/_lib não são roteados pela Vercel).
// Senhas rotacionadas em 2026-07-20 (as anteriores tinham ficado expostas no
// index.html publico antes da migracao de seguranca). Hash = sha256 hex da senha.
// 'diretoria' rotacionada em 2026-09-14 (saída do Glauco do time).
const SENHAS_HASH = {
  'admin': '5cb081011fc8b83e7c3f33c79136ce82720031f02d099889ab0f14e3eca935e4',
  'vagner': 'a244932f1cf5f4bbe247d7c2a166dc7bc4b3ffeb6f9f68fe5e9b496fab94a67a',
  'fabiano': '5a82d4e9ee886147c30d935f17fd9bae0944a9d220e68d08d4860596d29936e1',
  'diretoria': '1e445501d0145002f3ef483b97a75a5ad31fa61e8015d76103e2b359ac8ab780',
  'Igor Cater': '153ba23738336d51eb4e6a720baa10e03a43ebc1a8bcdefdfdd2ef4bdbfb7b93',
  'Junior': '790a8b50562e3cc833eac350b492139ab9ced509e67f8071f05413e10747181e',
  'Vitor Valle': '93814991afee4f2619b25fcc834118078ac0e1b13fbef87080df829070d3d085',
  'Rosana': '06fc87439b9313171aa9a9889e9666d5b48f8c1fa440100503d8465e40b9d0b8',
};

const COORD_KEYS = ['Igor Cater', 'Junior', 'Rosana', 'Vitor Valle'];

module.exports = { SENHAS_HASH, COORD_KEYS };
