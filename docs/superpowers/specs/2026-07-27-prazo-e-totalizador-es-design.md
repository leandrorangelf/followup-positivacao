# Prazo com aprovação (28/35 / solicitar prazo maior) + Totalizador ES

Data: 2026-07-27

## Contexto

Duas features independentes na tela de Vendas (`s-vendas` / ficha de pedido `s-vfn`/`s-vficha`):

1. Hoje o prazo de pagamento de um pedido é um toggle livre "À vista / Parcelado", com campos livres de dias (`parcela_1_dias`, `parcela_2_dias`, `parcela_3_dias`) sem nenhuma aprovação. Isso vai ser substituído por três opções: **À vista**, **28/35** (prazo padrão fixo) e **Solicitar prazo maior** (prazo customizado, que precisa de aprovação do Renan, login `diretoria`).
2. O Fabiano precisa saber, por produto (SKU), quantas caixas ainda precisam ser movidas para o estoque de ES — soma de pedidos com origem Fábrica que ainda não tiveram nada faturado.

## Feature 1 — Prazo com aprovação

### Modelo de dados

Novas colunas em `pedidos_vendas` (migração manual, SQL Editor do Supabase, seguindo o padrão de `supabase-comentario-vagner.sql`):

```sql
alter table public.pedidos_vendas
add column if not exists prazo_status text,              -- null | 'pendente' | 'aprovado' | 'rejeitado'
add column if not exists prazo_solicitado_dias integer,
add column if not exists prazo_solicitado_por text,
add column if not exists prazo_solicitado_em timestamptz,
add column if not exists prazo_decidido_por text,
add column if not exists prazo_decidido_em timestamptz;
```

`prazo_tipo` / `parcela_1_dias` / `parcela_2_dias` / `parcela_3_dias` (já existentes) continuam sendo a fonte de verdade do prazo efetivo do pedido. As colunas novas só guardam o estado da solicitação/aprovação.

### Frontend — formulário do pedido (linha ~1105 do `index.html`)

Troca o toggle "À vista / Parcelado" por três botões:

- **À vista** → `prazo_tipo='avista'`, `prazo_status=null`, `parcela_*_dias=null`. Comportamento atual, sem mudança.
- **28/35** → `prazo_tipo='parcelado'`, `parcela_1_dias=28`, `parcela_2_dias=35`, `parcela_3_dias=null`, `prazo_status=null`. Salva direto, sem aprovação — é o mesmo caminho de código que "Parcelado" já usa hoje, só com os dias fixos.
- **Solicitar prazo maior** → mostra um campo numérico "dias desejados". Ao salvar, o pedido vai com `prazo_status='pendente'` e `prazo_solicitado_dias=<valor digitado>`. `prazo_tipo`/`parcela_1_dias` ficam como estavam antes (sem efeito) até a decisão do Renan.

Os campos livres `vf-p1`/`vf-p2`/`vf-p3` de parcelamento customizado deixam de existir na tela — restam só os três botões acima.

### Backend — `api/pedidos-vendas/[acao].js`

- `salvar`: sem mudança na função em si — o `ped` body passado pelo client já pode incluir `prazo_status`/`prazo_solicitado_dias`. O servidor carimba `prazo_solicitado_por = session.user` e `prazo_solicitado_em = now()` sempre que `ped.prazo_status === 'pendente'` está presente no body (nunca confiar no client pra esses dois campos), do mesmo jeito que já faz com `criado_por`/`editado_por`.
- Nova função `prazoLiberado(pedidoId)` em `api/_lib/authz.js`: busca `prazo_status` do pedido; retorna `false` só se for `'pendente'`.
- `faturar`, `gnre-attach` e `gnre-manage`: cada uma passa a chamar `prazoLiberado(id)` antes de agir; se `false`, responde `409 { error: 'prazo_pendente' }`.
- Nova ação `prazo-decidir` (`case 'prazo-decidir'`), restrita a `isDiretoria(session)`:
  - Body: `{ id, aprovar: boolean }`.
  - `aprovar=true` → PATCH `{ prazo_status:'aprovado', prazo_tipo:'parcelado', parcela_1_dias: <prazo_solicitado_dias do pedido>, parcela_2_dias:null, parcela_3_dias:null, prazo_decidido_por:session.user, prazo_decidido_em:now() }`. Precisa ler `prazo_solicitado_dias` do banco antes de montar o PATCH (não vem no body).
  - `aprovar=false` → PATCH `{ prazo_status:'rejeitado', prazo_tipo:'avista', parcela_1_dias:null, parcela_2_dias:null, parcela_3_dias:null, prazo_decidido_por:session.user, prazo_decidido_em:now() }` — o prazo do pedido volta pra "À vista" automaticamente; o coordenador pode reabrir e escolher outro prazo depois.
- `isDiretoria` hoje só tem leitura em todo o sistema (`pedSomenteLeitura`, `podeEditarPedidoVenda=false`) — essa é a primeira e única escrita liberada pra esse perfil, e só nessa ação específica.

### Frontend — lista de pendências

Novo filtro/aba "Aguardando aprovação de prazo" na tela `s-vendas`, junto aos filtros já existentes (Fábrica/Distribuidoras/etc). Lista pedidos com `prazo_status==='pendente'`, mostrando `prazo_solicitado_dias`, quem pediu e quando (badge reaproveitando o esquema `vd-b-*` já usado para outros badges de status).

Botões **Aprovar** / **Rejeitar** só renderizam quando `user.isDiretoria` é verdadeiro (mesmo padrão de `vdPodeGerenciarGnre()` etc. — checagem cosmética no client, autorização real fica no backend). Chamam a nova ação `prazo-decidir`.

### Erros

Quando o Fabiano tentar faturar ou mexer em GNRE de um pedido com `prazo_status==='pendente'` e receber `409 prazo_pendente`, o toast do client mostra algo como "Prazo aguardando aprovação do Renan — não é possível seguir."

## Feature 2 — Totalizador de estoque ES

### Cálculo (100% derivado, sem campo novo no banco)

```js
const SKU_COLORS={GR:'#DC2626',GM:'#16A34A',CM:'#16A34A',CC:'#9F1239',GTWIN:'#2563EB',CK:'#6B7280'};
function vdTotalizadorES(){
  const tot={};VD_SKUS.forEach(s=>tot[s]=0);
  vdPedidos.filter(p=>!vdEhDistribuidora(p)&&vdResumoPedido(p).status==='pedido')
    .forEach(p=>(p.pedidos_vendas_itens||[]).forEach(i=>{if(tot[i.sku]!=null)tot[i.sku]+=Number(i.qty_caixas||0);}));
  return tot;
}
```

- `!vdEhDistribuidora(p)` já cobre "origem Fábrica" (origem nula ou `'Fábrica'` — função existente linha 2940).
- `vdResumoPedido(p).status==='pedido'` já cobre "nada faturado, nada parcial" (função existente linha 2993-3006) — pedidos `'parcial'`, `'faturado'` e `'entregue'` ficam de fora automaticamente.

### UI

Painel fixo no topo de `s-vendas`, com 6 mini-cards (um por SKU em `VD_SKUS`), cada um com uma bolinha colorida (`SKU_COLORS`) + código (`vdSkuLabel`) + total em caixas. Visível pra qualquer perfil que acesse a tela de Vendas.

### Atualização em runtime

`vdTotalizadorES()` é chamada dentro da função de render da lista de pedidos que já roda toda vez que `vdPedidos` é recarregado/alterado (após faturar, reverter, editar, etc.) — não precisa de listener novo, só mais uma chamada no fluxo de render existente.

## Fora de escopo

- Não altera o fluxo de aprovação/rejeição de GNRE em si, só adiciona uma trava adicional condicionada a `prazo_status`.
- Não migra pedidos antigos que já tinham parcelamento livre (`parcela_1/2/3_dias` fora do padrão 28/35) — eles continuam existindo no banco e sendo exibidos normalmente, só não é mais possível criar novos assim pela UI.
- Não adiciona notificação (e-mail/push) para o Renan quando uma solicitação de prazo entra — ele vê ao acessar a aba de pendências.
