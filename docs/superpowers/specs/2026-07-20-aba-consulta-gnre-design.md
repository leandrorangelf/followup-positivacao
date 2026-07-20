# Aba de consulta de GNRE

## Contexto

Hoje o status e os anexos de GNRE (guia + comprovante em PDF) só são visíveis
abrindo o detalhe de cada pedido individualmente (`vdAbrirDet`). Não existe
uma visão consolidada para consultar rapidamente quais GNREs já foram pagas,
anexadas, ou em que data cada etapa aconteceu — informação que já existe no
banco (`pedidos_vendas.gnre_*`) mas não tem uma tela de consulta dedicada.

## Objetivo

Nova aba "GNRE" no menu principal, disponível para todos os perfis logados
(inclusive coordenadores, que continuam vendo só os próprios pedidos — regra
já aplicada no backend), listando os pedidos do ano atual com informações de
venda, cliente e do processo de GNRE (status, valores, datas, anexos),
filtrável por status e por nome do cliente.

## Escopo

- Tela nova `s-gnre`, com entrada em `renderNav`/`navTo`, seguindo o padrão
  das telas existentes (`s-gestao`, `s-relatorios`).
- Fonte de dados: fetch dedicado via `sb()` em
  `/rest/v1/pedidos_vendas?ano=eq.<anoAtual>&deleted_at=is.null&select=*,pedidos_vendas_itens(*)`,
  no mesmo padrão já usado em outras telas (ex.: linha 4534). O backend já
  aplica `scopeQuery` restringindo coordenador não-privilegiado ao próprio
  nome — nenhuma mudança de autorização é necessária.
- Exclui pedidos tipo `off` (GNRE não se aplica — mesma regra de
  `vdPedidoPrecisaGnre`).
- Cálculo de caixas/valor de venda via `vdResumoPedido` (já existente, sem
  mudanças).
- Status/label/badge de GNRE via `vdGnreStatus`/`vdGnreLabel`/
  `vdGnreBadgeHTML` (já existentes, sem mudanças).
- Abertura de PDF (guia/comprovante) via `vdAbrirGnreArquivo` (já existente,
  sem mudanças) — reaproveitado como link/ícone por linha da tabela.

### Filtros (client-side, sobre a lista já carregada do ano)

- **Status**: dropdown com "Todos" (default) + Pendente / Enviada /
  Calculada / Paga / Isenta.
- **Cliente**: campo de texto, filtra por `cliente_nome` (substring,
  case-insensitive).

### Colunas da tabela

| Coluna | Origem |
|---|---|
| Cliente + UF | `p.cliente_nome`, `p.cliente_uf` |
| Coordenador | `p.coordenador` |
| Competência | `MESES[p.mes]` + `p.ano` |
| Status GNRE | `vdGnreBadgeHTML(p)` |
| Valor GNRE | `p.gnre_valor` |
| Caixas / Valor da venda | `vdResumoPedido(p).pedidoCx` / `.pedidoValor` |
| Datas | `gnre_enviado_at`, `gnre_retornado_at` (calculada), `gnre_pago_at`, `gnre_arquivo_at` (anexo), `gnre_comprovante_at` — cada uma só aparece se preenchida |
| Anexos | link "📄 GNRE" se `gnre_arquivo_url`, link "✅ Comprovante" se `gnre_comprovante_url`, ambos chamando `vdAbrirGnreArquivo` |

### Fora de escopo

- Nenhuma mudança de backend/autorização (endpoints e regras de acesso já
  existentes cobrem o necessário).
- Nenhuma ação de escrita nessa tela (é só consulta) — editar/gerenciar GNRE
  continua nas telas atuais (Vendas, Gestão, detalhe do pedido).
- Sem paginação — mesmo padrão das outras telas (lista o ano inteiro de uma
  vez, `limit=5000`).
- Sem exportação (PDF/Excel) — pode virar um pedido futuro, não faz parte
  deste escopo.

## Testes

- Conferir manualmente no navegador: pedido com guia+comprovante anexados
  aparece com os dois links funcionando; pedido sem anexo não mostra links;
  filtro de status esconde/mostra corretamente; busca por cliente filtra em
  tempo real; coordenador logado só vê os próprios pedidos.
