// Movido de index.html (não é servido pelo navegador: arquivos sob api/_lib não são roteados pela Vercel).
const SENHAS_HASH = {
  'admin': '8d4192f769b4a1881a944d61538d8f3c55f7537e90725ffad52269addc7df318',
  'vagner': 'f4ec1b0e9ecf3baec9c32537f106e4004feb9a312773d6eeede18efdffbbe94c',
  'fabiano': '67b8957da97dc943f201dcb516de1081ad24e97f92ab4527f68162adf78eae09',
  'diretoria': '5fed8fa8c4a6813740e5cf8bc55c80e19028a44975f28acad227403d248e564c',
  'Igor Cater': 'b25e98ce13b7f156a575e694deda71bfafc239f9bf089c2fc5bd5b168faa0c8c',
  'Marcio Vit': 'dc032e109919fcb943652557512c3b7ae1ddf1a45ac2d9aa61ffab0df2c433e1',
  'Vitor Valle': '6bca70f7710697ed1cd0d259d2d42a43ee4ddbe405f7e520a5194fb1f2e366a9',
  'Rosana': '466f239431d1461a35bd44253b93b5c44801726fdd84c3c48ee9734c540b62be',
};

const COORD_KEYS = ['Igor Cater', 'Marcio Vit', 'Rosana', 'Vitor Valle'];

module.exports = { SENHAS_HASH, COORD_KEYS };
