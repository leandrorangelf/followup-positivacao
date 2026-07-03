// Endpoints dedicados para as ações de pedidos_vendas que têm regra de permissão
// diferente por ação (um PATCH genérico não dá pra distinguir "editar" de "faturar"
// de "anexar GNRE" olhando só a tabela/método). Cada ação replica exatamente a
// sequência de chamadas que o client já fazia direto no Supabase, só que agora
// autenticada e autorizada no servidor, com a service_role key.
const { getSession } = require('../_lib/auth');
const { sbJson } = require('../_lib/supabase');
const {
  isAdminLiteral,
  isFabiano,
  podeEditarPedidoVenda,
  podeCriarPedidoVenda,
  podeFaturar,
  podeGerenciarGnre,
  podeAnexarGnre,
  podeComentarPedido,
  vePrivilegiado,
  pedidoPertenceASessao,
} = require('../_lib/authz');

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const MINIMAL = { ...JSON_HEADERS, Prefer: 'return=minimal' };
const REPRESENTATION = { ...JSON_HEADERS, Prefer: 'return=representation' };
const UPSERT_MINIMAL = { ...JSON_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' };

const GNRE_MANAGE_FIELDS = new Set(['gnre_status', 'gnre_enviado_at', 'gnre_valor', 'gnre_retornado_at', 'gnre_pago_at']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const acao = req.query.acao;
  const body = req.body || {};

  switch (acao) {
    case 'salvar': return salvar(session, body, res);
    case 'faturar': return faturar(session, body, res);
    case 'reverter-faturamento': return reverterFaturamento(session, body, res);
    case 'comentar': return comentar(session, body, res);
    case 'origem': return origem(session, body, res);
    case 'gnre-attach': return gnreAttach(session, body, res);
    case 'gnre-manage': return gnreManage(session, body, res);
    case 'status': return status(session, body, res);
    case 'rename-cliente': return renameCliente(session, body, res);
    default: return res.status(404).json({ error: 'unknown_acao' });
  }
};

async function salvar(session, body, res) {
  const { id, ped, itens, pedOriginal, itensOriginais, forecastOrigemId } = body;
  if (!ped || !Array.isArray(itens)) return res.status(400).json({ error: 'missing_fields' });

  if (id) {
    // Editar pedido existente — só admin (vdPodeEditar).
    if (!podeEditarPedidoVenda(session)) return res.status(403).json({ error: 'forbidden' });

    const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(ped) });
    if (!r.ok) return res.status(502).json({ error: 'patch_pedido_failed' });

    const del = await sbJson(`/rest/v1/pedidos_vendas_itens?pedido_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: JSON_HEADERS });
    if (!del.ok) {
      if (pedOriginal) await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(pedOriginal) });
      return res.status(502).json({ error: 'delete_itens_failed' });
    }

    const itensIns = itens.map((i) => ({ ...i, pedido_id: id }));
    const insR = await sbJson('/rest/v1/pedidos_vendas_itens', { method: 'POST', headers: MINIMAL, body: JSON.stringify(itensIns) });
    if (!insR.ok) {
      if (Array.isArray(itensOriginais) && itensOriginais.length) {
        await sbJson('/rest/v1/pedidos_vendas_itens', { method: 'POST', headers: MINIMAL, body: JSON.stringify(itensOriginais) });
      }
      if (pedOriginal) await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(pedOriginal) });
      return res.status(502).json({ error: 'insert_itens_failed' });
    }
    return res.status(200).json({ ok: true, id });
  }

  // Criar pedido novo — admin ou coordenador (botão "+", bloqueado para diretoria/vagner/fabiano).
  if (!podeCriarPedidoVenda(session)) return res.status(403).json({ error: 'forbidden' });

  const pedBody = { ...ped };
  if (!vePrivilegiado(session)) pedBody.coordenador = session.user; // coordenador só cria pro próprio nome
  pedBody.criado_por = session.user; // nunca confiar no client pra isso

  const createR = await sbJson('/rest/v1/pedidos_vendas', { method: 'POST', headers: REPRESENTATION, body: JSON.stringify(pedBody) });
  if (!createR.ok || !Array.isArray(createR.json) || !createR.json[0]) return res.status(502).json({ error: 'create_pedido_failed' });
  const newId = createR.json[0].id;

  const itensIns = itens.map((i) => ({ ...i, pedido_id: newId }));
  const insR = await sbJson('/rest/v1/pedidos_vendas_itens', { method: 'POST', headers: MINIMAL, body: JSON.stringify(itensIns) });
  if (!insR.ok) {
    await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(newId)}`, { method: 'DELETE', headers: JSON_HEADERS });
    return res.status(502).json({ error: 'insert_itens_failed' });
  }

  let forecastConvertido = false;
  if (forecastOrigemId) {
    const rf = await sbJson(`/rest/v1/forecast_pedidos?id=eq.${encodeURIComponent(forecastOrigemId)}`, {
      method: 'PATCH', headers: MINIMAL, body: JSON.stringify({ status: 'convertido', updated_at: new Date().toISOString() }),
    });
    forecastConvertido = rf.ok;
  }
  return res.status(200).json({ ok: true, id: newId, forecastConvertido });
}

async function faturar(session, body, res) {
  if (!podeFaturar(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, itensRows, pedidoPatch } = body;
  if (!id || !Array.isArray(itensRows) || !pedidoPatch) return res.status(400).json({ error: 'missing_fields' });

  const r = await sbJson('/rest/v1/pedidos_vendas_itens', { method: 'POST', headers: UPSERT_MINIMAL, body: JSON.stringify(itensRows) });
  if (!r.ok) return res.status(502).json({ error: 'itens_failed' });

  const patch = { ...pedidoPatch, faturado_por: session.user };
  const r2 = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(patch) });
  return res.status(200).json({ ok: true, pedidoOk: r2.ok });
}

async function reverterFaturamento(session, body, res) {
  if (!podeEditarPedidoVenda(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, itensRows, pedidoPatch } = body;
  if (!id || !Array.isArray(itensRows) || !pedidoPatch) return res.status(400).json({ error: 'missing_fields' });

  const r = await sbJson('/rest/v1/pedidos_vendas_itens', { method: 'POST', headers: UPSERT_MINIMAL, body: JSON.stringify(itensRows) });
  if (!r.ok) return res.status(502).json({ error: 'itens_failed' });

  const r2 = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(pedidoPatch) });
  return res.status(200).json({ ok: true, pedidoOk: r2.ok });
}

async function comentar(session, body, res) {
  if (!podeComentarPedido(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, texto } = body;
  if (!id) return res.status(400).json({ error: 'missing_fields' });
  const campo = isFabiano(session) ? 'comentario_fabiano' : 'comentario_vagner';
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify({ [campo]: texto || null }) });
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok, campo });
}

async function origem(session, body, res) {
  if (!podeEditarPedidoVenda(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, origem: origemVal, itens } = body;
  if (!id) return res.status(400).json({ error: 'missing_fields' });
  const ehDist = origemVal && origemVal !== 'Fábrica';

  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify({ origem: ehDist ? origemVal : null }) });
  if (!r.ok) return res.status(502).json({ error: 'patch_origem_failed' });

  if (ehDist && Array.isArray(itens)) {
    await Promise.all(itens.map((i) => sbJson(`/rest/v1/pedidos_vendas_itens?id=eq.${encodeURIComponent(i.id)}`, {
      method: 'PATCH', headers: MINIMAL, body: JSON.stringify({ qty_faturada: Number(i.qty_caixas || 0) }),
    })));
  }
  return res.status(200).json({ ok: true });
}

async function gnreAttach(session, body, res) {
  if (!podeAnexarGnre(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, tipo, path, fileName, gnrePendente } = body;
  if (!id || !path) return res.status(400).json({ error: 'missing_fields' });
  const agora = new Date().toISOString();
  let payload;
  if (tipo === 'gnre') {
    payload = { gnre_arquivo_url: path, gnre_arquivo_nome: fileName || null, gnre_arquivo_at: agora, gnre_arquivo_por: session.user };
    if (gnrePendente) payload.gnre_status = 'enviada';
  } else {
    payload = {
      gnre_comprovante_url: path, gnre_comprovante_nome: fileName || null, gnre_comprovante_at: agora,
      gnre_comprovante_por: session.user, gnre_pagamento_informado_at: agora, gnre_pagamento_informado_por: session.user,
    };
  }
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(payload) });
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
}

async function gnreManage(session, body, res) {
  if (!podeGerenciarGnre(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, payload } = body;
  if (!id || !payload || typeof payload !== 'object') return res.status(400).json({ error: 'missing_fields' });
  const safePayload = {};
  for (const k of Object.keys(payload)) if (GNRE_MANAGE_FIELDS.has(k)) safePayload[k] = payload[k];
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(safePayload) });
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
}

async function status(session, body, res) {
  if (!podeEditarPedidoVenda(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, tipo, novoStatus } = body;
  if (!id || !tipo) return res.status(400).json({ error: 'missing_fields' });
  let payload;
  if (tipo === 'mover-status') payload = { status: novoStatus };
  else if (tipo === 'excluir') payload = { deleted_at: new Date().toISOString() };
  else if (tipo === 'restaurar') payload = { deleted_at: null };
  else return res.status(400).json({ error: 'unknown_tipo' });
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(payload) });
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
}

async function renameCliente(session, body, res) {
  if (!isAdminLiteral(session)) return res.status(403).json({ error: 'forbidden' });
  const { clienteId, novoNome } = body;
  if (!clienteId || !novoNome) return res.status(400).json({ error: 'missing_fields' });
  const r = await sbJson(`/rest/v1/pedidos_vendas?cliente_id=eq.${encodeURIComponent(clienteId)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify({ cliente_nome: novoNome }) });
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
}
