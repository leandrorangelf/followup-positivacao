// Movido de index.html (não é servido pelo navegador: arquivos sob api/_lib não são roteados pela Vercel).
// Senhas rotacionadas em 2026-07-03 (as anteriores tinham ficado expostas no
// index.html publico antes da migracao de seguranca). Hash = sha256 hex da senha.
const SENHAS_HASH = {
  'admin': '09c55f52c01c22f8d0900ff427972f5b9d8f47898bb6107b6d0f7e1c95db26fb',
  'vagner': 'a244932f1cf5f4bbe247d7c2a166dc7bc4b3ffeb6f9f68fe5e9b496fab94a67a',
  'fabiano': '5a82d4e9ee886147c30d935f17fd9bae0944a9d220e68d08d4860596d29936e1',
  'diretoria': '153a02449256b5a603387daaa0d83c64455356efbedc558b0a5a1a2035db66de',
  'Igor Cater': '153ba23738336d51eb4e6a720baa10e03a43ebc1a8bcdefdfdd2ef4bdbfb7b93',
  'Marcio Vit': '621ab7287a1d296791c2e86a4cfda2139102cd452894c3e73bdb5abdc9976cd2',
  'Vitor Valle': '93814991afee4f2619b25fcc834118078ac0e1b13fbef87080df829070d3d085',
  'Rosana': '06fc87439b9313171aa9a9889e9666d5b48f8c1fa440100503d8465e40b9d0b8',
};

const COORD_KEYS = ['Igor Cater', 'Marcio Vit', 'Rosana', 'Vitor Valle'];

module.exports = { SENHAS_HASH, COORD_KEYS };
