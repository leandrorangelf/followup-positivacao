// Endpoints dedicados para as ações de pedidos_vendas que têm regra de permissão
// diferente por ação (um PATCH genérico não dá pra distinguir "editar" de "faturar"
// de "anexar GNRE" olhando só a tabela/método). Cada ação replica exatamente a
// sequência de chamadas que o client já fazia direto no Supabase, só que agora
// autenticada e autorizada no servidor, com a service_role key.
const { getSession } = require('../_lib/auth');
const { sbJson } = require('../_lib/supabase');
const { notificar } = require('../_lib/push');
const {
  isAdminLiteral,
  isFabiano,
  podeEditarPedidoVenda,
  podeEditarPedidoVendaProprio,
  podeCriarPedidoVenda,
  podeFaturar,
  podeGerenciarGnre,
  podeAnexarGnre,
  podeComentarPedido,
  vePrivilegiado,
  pedidoPertenceASessao,
  prazoLiberado,
  podeDecidirPrazo,
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
    case 'prazo-decidir': return prazoDecidir(session, body, res);
    default: return res.status(404).json({ error: 'unknown_acao' });
  }
};

async function salvar(session, body, res) {
  const { id, ped, itens, pedOriginal, itensOriginais, forecastOrigemId } = body;
  if (!ped || !Array.isArray(itens)) return res.status(400).json({ error: 'missing_fields' });

  if (id) {
    // Editar pedido existente — admin sempre; coordenador só o próprio pedido
    // e só enquanto nada foi faturado (checagem contra o banco, não confia no client).
    if (!(await podeEditarPedidoVendaProprio(session, id))) return res.status(403).json({ error: 'forbidden' });
    let pedPatch = isAdminLiteral(session) ? ped : { ...ped, editado_por: session.user, editado_em: new Date().toISOString() };
    if (pedPatch.prazo_status === 'pendente') {
      pedPatch = { ...pedPatch, prazo_solicitado_por: session.user, prazo_solicitado_em: new Date().toISOString() };
    }

    const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(pedPatch) });
    if (!r.ok) return res.status(502).json({ error: 'patch_pedido_failed' });
    if (pedPatch.prazo_status === 'pendente') {
      await notificar(['admin', 'vagner', 'diretoria'], 'prazo_solicitado', 'Prazo especial solicitado',
        `${ped.cliente_nome || 'Pedido'} · ${pedPatch.prazo_solicitado_dias || '?'} dias`, '/vendas').catch(() => {});
    }

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

  let pedBody = { ...ped };
  if (!vePrivilegiado(session)) pedBody.coordenador = session.user; // coordenador só cria pro próprio nome
  pedBody.criado_por = session.user; // nunca confiar no client pra isso
  if (pedBody.prazo_status === 'pendente') {
    pedBody = { ...pedBody, prazo_solicitado_por: session.user, prazo_solicitado_em: new Date().toISOString() };
  }

  const createR = await sbJson('/rest/v1/pedidos_vendas', { method: 'POST', headers: REPRESENTATION, body: JSON.stringify(pedBody) });
  if (!createR.ok || !Array.isArray(createR.json) || !createR.json[0]) return res.status(502).json({ error: 'create_pedido_failed' });
  const newId = createR.json[0].id;

  const itensIns = itens.map((i) => ({ ...i, pedido_id: newId }));
  const insR = await sbJson('/rest/v1/pedidos_vendas_itens', { method: 'POST', headers: MINIMAL, body: JSON.stringify(itensIns) });
  if (!insR.ok) {
    await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(newId)}`, { method: 'DELETE', headers: JSON_HEADERS });
    return res.status(502).json({ error: 'insert_itens_failed' });
  }

  await notificar(['fabiano', 'admin'], 'pedido_criado', 'Novo pedido criado',
    `${pedBody.cliente_nome || 'Cliente'} · ${pedBody.coordenador || session.user}`, '/vendas').catch(() => {});
  if (pedBody.prazo_status === 'pendente') {
    await notificar(['admin', 'vagner', 'diretoria'], 'prazo_solicitado', 'Prazo especial solicitado',
      `${pedBody.cliente_nome || 'Pedido'} · ${pedBody.prazo_solicitado_dias || '?'} dias`, '/vendas').catch(() => {});
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

const FAT_SNAPSHOT_FIELDS = 'status,is_parcial,faturado_at,faturado_por,faturamento_observacao,origem,fat_gr,fat_gm,fat_cm,fat_cc,fat_gtwin,fat_ck,fat_click,faturamento_historico';
const FAT_SNAPSHOT_KEYS = ['status', 'is_parcial', 'faturado_at', 'faturado_por', 'faturamento_observacao', 'origem', 'fat_gr', 'fat_gm', 'fat_cm', 'fat_cc', 'fat_gtwin', 'fat_ck', 'fat_click'];

async function faturar(session, body, res) {
  if (!podeFaturar(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, itensRows, pedidoPatch } = body;
  if (!id || !Array.isArray(itensRows) || !pedidoPatch) return res.status(400).json({ error: 'missing_fields' });
  if (!(await prazoLiberado(id))) return res.status(409).json({ error: 'prazo_pendente' });

  // Snapshot do estado ANTES desta ação — empilhado em faturamento_historico pra dar pra
  // reverter só esta etapa depois (não zerar tudo de uma vez), mesmo com faturamento parcial em várias etapas.
  const [preR, preItensR] = await Promise.all([
    sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}&select=${FAT_SNAPSHOT_FIELDS}`, { method: 'GET', headers: JSON_HEADERS }),
    sbJson(`/rest/v1/pedidos_vendas_itens?pedido_id=eq.${encodeURIComponent(id)}&select=id,qty_faturada`, { method: 'GET', headers: JSON_HEADERS }),
  ]);
  const pre = preR.ok && Array.isArray(preR.json) ? preR.json[0] : null;
  const preItens = preItensR.ok && Array.isArray(preItensR.json) ? preItensR.json : [];

  const r = await sbJson('/rest/v1/pedidos_vendas_itens', { method: 'POST', headers: UPSERT_MINIMAL, body: JSON.stringify(itensRows) });
  if (!r.ok) return res.status(502).json({ error: 'itens_failed' });

  const patch = { ...pedidoPatch, faturado_por: session.user };
  if (pre) {
    const historicoAnterior = Array.isArray(pre.faturamento_historico) ? pre.faturamento_historico : [];
    const snapshot = { ts: new Date().toISOString(), itens: preItens.map((i) => ({ id: i.id, qty_faturada: i.qty_faturada })) };
    FAT_SNAPSHOT_KEYS.forEach((k) => { snapshot[k] = pre[k]; });
    patch.faturamento_historico = [...historicoAnterior, snapshot];
  }
  const r2 = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(patch) });
  if (r2.ok && (patch.status === 'faturado' || patch.status === 'entregue')) {
    const infoR = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}&select=coordenador,cliente_nome`, { method: 'GET', headers: JSON_HEADERS });
    if (infoR.ok && Array.isArray(infoR.json) && infoR.json[0]) {
      await notificar([infoR.json[0].coordenador], 'pedido_faturado', 'Pedido faturado', infoR.json[0].cliente_nome || 'Pedido', '/vendas').catch(() => {});
    }
  }
  return res.status(200).json({ ok: true, pedidoOk: r2.ok });
}

async function reverterFaturamento(session, body, res) {
  if (!podeEditarPedidoVenda(session)) return res.status(403).json({ error: 'forbidden' });
  const { id } = body;
  if (!id) return res.status(400).json({ error: 'missing_fields' });

  const pedR = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}&select=faturamento_historico`, { method: 'GET', headers: JSON_HEADERS });
  if (!pedR.ok || !Array.isArray(pedR.json) || !pedR.json[0]) return res.status(404).json({ error: 'not_found' });
  const historico = Array.isArray(pedR.json[0].faturamento_historico) ? pedR.json[0].faturamento_historico : [];

  if (!historico.length) {
    // Pedido faturado antes desse recurso existir (sem histórico) — não dá pra reverter etapa a
    // etapa, então zera tudo (comportamento antigo) como último recurso.
    const itensR = await sbJson(`/rest/v1/pedidos_vendas_itens?pedido_id=eq.${encodeURIComponent(id)}&select=id`, { method: 'GET', headers: JSON_HEADERS });
    const itens = itensR.ok && Array.isArray(itensR.json) ? itensR.json : [];
    const rItens = await Promise.all(itens.map((i) => sbJson(`/rest/v1/pedidos_vendas_itens?id=eq.${encodeURIComponent(i.id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify({ qty_faturada: 0 }) })));
    if (rItens.some((x) => !x.ok)) return res.status(502).json({ error: 'itens_failed' });
    const r2 = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: MINIMAL,
      body: JSON.stringify({ status: 'pedido', faturado_at: null, is_parcial: false, fat_gr: 0, fat_gm: 0, fat_cm: 0, fat_cc: 0, fat_gtwin: 0, fat_ck: 0, fat_click: 0 }),
    });
    return res.status(200).json({ ok: true, pedidoOk: r2.ok, restante: 0, zerouTudo: true });
  }

  const ultimo = historico[historico.length - 1];
  const novoHistorico = historico.slice(0, -1);
  const rItens = await Promise.all((ultimo.itens || []).map((i) => sbJson(`/rest/v1/pedidos_vendas_itens?id=eq.${encodeURIComponent(i.id)}`, {
    method: 'PATCH', headers: MINIMAL, body: JSON.stringify({ qty_faturada: i.qty_faturada }),
  })));
  if (rItens.some((x) => !x.ok)) return res.status(502).json({ error: 'itens_failed' });

  const restorePatch = { faturamento_historico: novoHistorico };
  FAT_SNAPSHOT_KEYS.forEach((k) => { restorePatch[k] = ultimo[k]; });
  const r2 = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(restorePatch) });
  return res.status(200).json({ ok: true, pedidoOk: r2.ok, restante: novoHistorico.length, zerouTudo: false });
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
  if (!(await pedidoPertenceASessao(session, id))) return res.status(403).json({ error: 'forbidden' });
  if (!(await prazoLiberado(id))) return res.status(409).json({ error: 'prazo_pendente' });
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
  if (!(await prazoLiberado(id))) return res.status(409).json({ error: 'prazo_pendente' });
  const safePayload = {};
  for (const k of Object.keys(payload)) if (GNRE_MANAGE_FIELDS.has(k)) safePayload[k] = payload[k];
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(safePayload) });
  if (r.ok && ['enviada', 'paga', 'isenta'].includes(safePayload.gnre_status)) {
    const infoR = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}&select=coordenador,cliente_nome`, { method: 'GET', headers: JSON_HEADERS });
    if (infoR.ok && Array.isArray(infoR.json) && infoR.json[0]) {
      const labels = { enviada: 'GNRE enviada', paga: 'GNRE paga', isenta: 'GNRE isenta' };
      await notificar([infoR.json[0].coordenador], 'gnre', labels[safePayload.gnre_status], infoR.json[0].cliente_nome || 'Pedido', '/vendas').catch(() => {});
    }
  }
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

async function prazoDecidir(session, body, res) {
  if (!podeDecidirPrazo(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, aprovar } = body;
  if (!id || typeof aprovar !== 'boolean') return res.status(400).json({ error: 'missing_fields' });
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}&select=prazo_status,prazo_solicitado_dias,prazo_solicitado_por,cliente_nome`, { method: 'GET', headers: JSON_HEADERS });
  if (!r.ok || !Array.isArray(r.json) || !r.json[0]) return res.status(404).json({ error: 'not_found' });
  if (r.json[0].prazo_status !== 'pendente') return res.status(409).json({ error: 'not_pending' });
  const agora = new Date().toISOString();
  const payload = aprovar
    ? { prazo_status: 'aprovado', prazo_tipo: 'parcelado', parcela_1_dias: r.json[0].prazo_solicitado_dias, parcela_2_dias: null, parcela_3_dias: null, prazo_decidido_por: session.user, prazo_decidido_em: agora }
    : { prazo_status: 'rejeitado', prazo_tipo: 'avista', parcela_1_dias: null, parcela_2_dias: null, parcela_3_dias: null, prazo_decidido_por: session.user, prazo_decidido_em: agora };
  const r2 = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(payload) });
  if (r2.ok && r.json[0].prazo_solicitado_por) {
    const titulo = aprovar ? 'Prazo especial aprovado' : 'Prazo especial rejeitado';
    await notificar([r.json[0].prazo_solicitado_por], 'prazo_decidido', titulo,
      `${r.json[0].cliente_nome || 'Pedido'} · ${r.json[0].prazo_solicitado_dias || '?'} dias`, '/vendas').catch(() => {});
  }
  return res.status(r2.ok ? 200 : 502).json({ ok: r2.ok });
}

async function renameCliente(session, body, res) {
  // Duas variantes que já existiam no client: renomear pedidos de UM cliente por id
  // (editarCliente, admin só — vagner é bloqueado antes de chegar aqui) e o utilitário
  // corrigirNomeClientePedidos que corrige em massa por nome antigo (isAdmin inclui vagner).
  const { clienteId, novoNome, nomeAntigo, nomeNovo } = body;
  if (clienteId && novoNome) {
    if (!isAdminLiteral(session)) return res.status(403).json({ error: 'forbidden' });
    const r = await sbJson(`/rest/v1/pedidos_vendas?cliente_id=eq.${encodeURIComponent(clienteId)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify({ cliente_nome: novoNome }) });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  }
  if (nomeAntigo && nomeNovo) {
    if (!session.isAdmin) return res.status(403).json({ error: 'forbidden' });
    const r = await sbJson(`/rest/v1/pedidos_vendas?cliente_nome=eq.${encodeURIComponent(nomeAntigo)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify({ cliente_nome: nomeNovo }) });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  }
  return res.status(400).json({ error: 'missing_fields' });
}
