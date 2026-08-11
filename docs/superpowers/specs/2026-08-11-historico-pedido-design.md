# Histórico de ações por pedido (Vendas)

## Problema

Hoje o log de auditoria (`audit_log`) registra ações do sistema (criar, editar, excluir, faturar pedidos de venda), mas:
- só é visível na tela `s-log`, restrita a admin;
- não tem vínculo estruturado com o pedido específico — não dá pra abrir a ficha de um pedido e ver o histórico dele;
- a coluna `editado_por`/`editado_em` em `pedidos_vendas` guarda só a última edição, sem contador nem lista de eventos.

## Objetivo

Na ficha de um pedido em Vendas (`s-vendas`/`s-vficha`), mostrar:
- histórico cronológico de ações do pedido (quem fez, o quê, quando);
- badge "Editado por X (Nx)" com contador de edições, substituindo o badge atual que só mostra o último editor.

Fora de escopo: tela `s-ped` (legada) e qualquer mudança na tela `s-log` além de continuar funcionando como está.

## Banco de dados

Novo arquivo solto `supabase-audit-pedido-id.sql` (mesmo padrão dos outros scripts soltos do repo):

```sql
alter table audit_log add column if not exists pedido_id uuid;
create index if not exists idx_audit_log_pedido_id on audit_log(pedido_id);
```

Aplicado manualmente no SQL Editor do Supabase, como as demais mudanças de schema do projeto.

## Backend — `api/audit.js`

**POST** (criação de log): aceitar `pedido_id` opcional no body e incluir na linha inserida. Continua sem validar contra a sessão (o campo é informativo, igual `acao`/`descricao`/`detalhes` hoje).

**GET** (listagem): comportamento atual (admin/diretoria only, log geral) preservado quando não há `pedido_id` na query. Quando `pedido_id` está presente:
- qualquer sessão autenticada pode chamar;
- valida que o pedido pertence ao escopo do usuário usando `pedidoPertenceASessao` (já existe em `api/_lib/authz.js`, usado hoje no fluxo de GNRE para evitar IDOR) — coordenador só vê histórico de pedido do próprio nome; admin/diretoria/vagner/fabiano veem qualquer pedido;
- se a validação falhar, `403`.

## Frontend — geração de eventos

`auditLog(acao, descricao, detalhes, pedidoId)` ganha um 4º parâmetro opcional, repassado no body do POST.

Chamadas existentes ligadas a `pedidos_vendas` passam a informar o `pedido_id`:
- criar/editar pedido (`vdSalvarPedido`)
- comentário (`vdSalvarComentario`)
- faturar (`vdSalvarFaturamento`)
- reverter faturamento (`vdReverterFaturamento`)
- anexar GNRE (`vdSalvarUploadGnre`)
- atualizar GNRE (`vdAtualizarGnre`)
- excluir (`vdExcluirPedido` e o outro call site de exclusão)
- restaurar (`logRestaurarPedido`)

Nova chamada de log (não existe hoje): decisão de prazo em `vdDecidirPrazo` (aprovar/rejeitar), registrando `acao:'editar'` com o resultado da decisão.

## Frontend — exibição

Em `vdAbrirDet`, além da renderização atual, disparar `GET /api/audit?pedido_id=eq.<id>&order=criado_em.desc` e:
- renderizar uma seção "Histórico" ao final da ficha, reaproveitando o CSS já existente da tela `s-log` (`log-item`, `log-icon`, `log-title`, `log-detail`, `log-user`);
- recalcular o badge de edição para "Editado por X (Nx)", onde `X` é `p.editado_por` (já vem no pedido) e `N` é a contagem de entradas do histórico carregado com `acao === 'editar'`. Como a ficha já renderiza antes desse fetch completar, o badge é atualizado assim que o histórico chega (mesmo padrão assíncrono que outras partes da ficha já usam).

## Fora de escopo / não fazer

- Não criar tabela nova — reaproveita `audit_log`.
- Não mudar a tela `s-log` (log geral continua como está).
- Não aplicar em `s-ped` (tela legada).
- Não validar pedido_id no POST (mesmo nível de confiança que os outros campos de log hoje).
