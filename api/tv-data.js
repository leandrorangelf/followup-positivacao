// Endpoint deliberadamente público (sem sessão): alimenta o painel "TV externa"
// (index.html, tela fixa de escritório acessada via #tv, sem login). Só leitura,
// mesmos dados que a tela já exibia hoje via chamada direta ao Supabase — a
// diferença é que agora passa pela service_role no servidor em vez de expor uma
// chave no navegador.
const { sbJson } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const mes = parseInt(req.query.mes, 10);
  const ano = parseInt(req.query.ano, 10);
  if (Number.isNaN(mes) || Number.isNaN(ano)) return res.status(400).json({ error: 'missing_fields' });

  const headers = { 'Content-Type': 'application/json' };
  const [clientesR, metasR, vendasR] = await Promise.all([
    sbJson('/rest/v1/clientes?select=*&order=nome', { method: 'GET', headers }),
    sbJson(`/rest/v1/metas_mensais?ano=eq.${ano}&select=coordenador,mes,meta_cx`, { method: 'GET', headers }),
    sbJson(`/rest/v1/pedidos_vendas?mes=eq.${mes}&ano=eq.${ano}&deleted_at=is.null&select=*,pedidos_vendas_itens(*)&limit=3000`, { method: 'GET', headers }),
  ]);

  res.status(200).json({
    clientes: clientesR.ok ? clientesR.json : [],
    metas: metasR.ok ? metasR.json : [],
    vendas: vendasR.ok ? vendasR.json : [],
  });
};
