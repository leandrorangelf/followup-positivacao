const { COORD_KEYS } = require('./senhas');
const { sbJson } = require('./supabase');

// Espelha 1:1 as funções cosméticas que já existiam no client (index.html).
const isFabiano = (s) => s.user === 'fabiano';
const isVagner = (s) => s.user === 'vagner';
const isDiretoria = (s) => !!s.isDiretoria;
const isCoordenador = (s) => COORD_KEYS.includes(s.user);
const isAdminLiteral = (s) => s.user === 'admin';

// vdPodeEditar() no client = user==='admin'. Continua controlando excluir/reverter-faturamento/origem.
const podeEditarPedidoVenda = isAdminLiteral;
// Editar pedido (ação "salvar" com id): admin sempre; Vagner ou coordenador só
// enquanto nada foi faturado (mesma condição que trava o botão "Editar" no client:
// faturadoCx===0). Vagner não é dono de coordenador, então pode editar qualquer um;
// coordenador só o próprio.
async function podeEditarPedidoVendaProprio(session, pedidoId) {
  if (podeEditarPedidoVenda(session)) return true;
  if (!isVagner(session) && !isCoordenador(session)) return false;
  const r = await sbJson(
    `/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(pedidoId)}&select=coordenador,pedidos_vendas_itens(qty_faturada)`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  if (!r.ok || !Array.isArray(r.json) || !r.json[0]) return false;
  const row = r.json[0];
  if (!isVagner(session) && row.coordenador !== session.user) return false;
  const itens = Array.isArray(row.pedidos_vendas_itens) ? row.pedidos_vendas_itens : [];
  return itens.every((i) => Number(i.qty_faturada || 0) === 0);
}
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
// Quem cria um pedido novo em Vendas: admin, Vagner e os 4 coordenadores.
const podeCriarPedidoVenda = (s) => isAdminLiteral(s) || isVagner(s) || isCoordenador(s);

// Papéis que enxergam todos os coordenadores (não ficam restritos ao próprio nome)
const vePrivilegiado = (s) => isAdminLiteral(s) || isVagner(s) || isDiretoria(s) || isFabiano(s);

// podeAnexarGnre() inclui os 4 coordenadores, que NÃO são privilegiados — sem essa
// checagem, um coordenador poderia anexar/ler GNRE de um pedido de outro coordenador
// só adivinhando/enumerando o id (IDOR). Toda ação de GNRE sobre um pedido específico
// precisa confirmar que o pedido é do próprio coordenador (ou que a sessão é privilegiada).
async function pedidoPertenceASessao(session, pedidoId) {
  if (vePrivilegiado(session)) return true;
  if (!pedidoId) return false;
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(pedidoId)}&select=coordenador`, {
    method: 'GET', headers: { 'Content-Type': 'application/json' },
  });
  if (!r.ok || !Array.isArray(r.json) || !r.json[0]) return false;
  return r.json[0].coordenador === session.user;
}

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
  podeEditarPedidoVendaProprio,
  podeFaturar,
  podeGerenciarGnre,
  podeAnexarGnre,
  podeComentarPedido,
  forecastPodeEditar,
  pedSomenteLeitura,
  podeCriarPedidoVenda,
  vePrivilegiado,
  pedidoPertenceASessao,
  GENERIC_TABLES,
  SCOPED_TABLES,
  scopeQuery,
  enforceBodyOwnership,
  ALLOWED_PREFER,
};
