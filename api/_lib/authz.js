const { COORD_KEYS } = require('./senhas');

// Espelha 1:1 as funções cosméticas que já existiam no client (index.html).
const isFabiano = (s) => s.user === 'fabiano';
const isVagner = (s) => s.user === 'vagner';
const isDiretoria = (s) => !!s.isDiretoria;
const isCoordenador = (s) => COORD_KEYS.includes(s.user);
const isAdminLiteral = (s) => s.user === 'admin';

// vdPodeEditar() no client = user==='admin'
const podeEditarPedidoVenda = isAdminLiteral;
// vdPodeFaturar() = admin ou fabiano
const podeFaturar = (s) => isAdminLiteral(s) || isFabiano(s);
// vdPodeGerenciarGnre() = admin ou fabiano
const podeGerenciarGnre = (s) => isAdminLiteral(s) || isFabiano(s);
// vdPodeAnexarGnre() = qualquer um exceto diretoria e vagner
const podeAnexarGnre = (s) => !isDiretoria(s) && !isVagner(s);
// vdPodeComentarPedido() = vagner ou fabiano
const podeComentarPedido = (s) => isVagner(s) || isFabiano(s);
// forecastPodeEditar() = todos exceto diretoria, fabiano e vagner
const forecastPodeEditar = (s) => !isDiretoria(s) && !isFabiano(s) && !isVagner(s);
// pedSomenteLeitura() = vagner, fabiano ou diretoria
const pedSomenteLeitura = (s) => isVagner(s) || isFabiano(s) || isDiretoria(s);
// Quem cria um pedido novo em Vendas: admin + os 4 coordenadores (botão "+" tem
// classes no-diretoria/no-vagner/no-fabiano); vagner também é bloqueado explicitamente
// dentro de vdSalvarPedido.
const podeCriarPedidoVenda = (s) => isAdminLiteral(s) || isCoordenador(s);

// Papéis que enxergam todos os coordenadores (não ficam restritos ao próprio nome)
const vePrivilegiado = (s) => isAdminLiteral(s) || isVagner(s) || isDiretoria(s) || isFabiano(s);

// Tabelas de acesso simples (uma única regra por método), servidas pelo proxy genérico
// api/db/[table].js. pedidos_vendas fica aqui só para leitura — toda escrita passa
// pelos endpoints dedicados em api/pedidos-vendas/[acao].js por ter regras por-ação.
const GENERIC_TABLES = {
  clientes: {
    GET: () => true,
    POST: isAdminLiteral,
    PATCH: isAdminLiteral,
    DELETE: isAdminLiteral,
  },
  pedidos: {
    GET: () => true,
    POST: (s) => !pedSomenteLeitura(s),
    PATCH: (s) => !pedSomenteLeitura(s),
    DELETE: (s) => !pedSomenteLeitura(s),
  },
  metas_mensais: {
    GET: () => true,
    POST: isAdminLiteral,
    PATCH: isAdminLiteral,
  },
  pedidos_vendas: {
    GET: () => true,
  },
  forecast_pedidos: {
    GET: () => true,
    POST: forecastPodeEditar,
    PATCH: forecastPodeEditar,
    DELETE: forecastPodeEditar,
  },
  forecast_pedidos_itens: {
    GET: () => true,
    POST: forecastPodeEditar,
    PATCH: forecastPodeEditar,
    DELETE: forecastPodeEditar,
  },
};

// Tabelas cujas linhas pertencem a um coordenador e devem ser restritas para quem
// não é "privilegiado" (só vê/edita o próprio coordenador).
const SCOPED_TABLES = new Set(['pedidos', 'pedidos_vendas', 'forecast_pedidos']);

function scopeQuery(table, session, params) {
  if (!SCOPED_TABLES.has(table) || vePrivilegiado(session)) return params;
  params.delete('coordenador');
  params.set('coordenador', `eq.${session.user}`);
  return params;
}

function enforceBodyOwnership(table, session, body) {
  if (!SCOPED_TABLES.has(table) || vePrivilegiado(session)) return body;
  const stamp = (row) => (row && typeof row === 'object' ? { ...row, coordenador: session.user } : row);
  return Array.isArray(body) ? body.map(stamp) : stamp(body);
}

const ALLOWED_PREFER = new Set([
  'return=minimal',
  'return=representation',
  'resolution=merge-duplicates,return=minimal',
  'resolution=merge-duplicates,return=representation',
]);

module.exports = {
  isFabiano,
  isVagner,
  isDiretoria,
  isCoordenador,
  isAdminLiteral,
  podeEditarPedidoVenda,
  podeFaturar,
  podeGerenciarGnre,
  podeAnexarGnre,
  podeComentarPedido,
  forecastPodeEditar,
  pedSomenteLeitura,
  podeCriarPedidoVenda,
  vePrivilegiado,
  GENERIC_TABLES,
  SCOPED_TABLES,
  scopeQuery,
  enforceBodyOwnership,
  ALLOWED_PREFER,
};
