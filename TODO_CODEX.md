# TODO — handoff pro Codex terminar

Contexto geral: `CLAUDE.md` na raiz tem a arquitetura completa. Hook em
`.claude/settings.json` faz commit+push automático a cada edição de arquivo —
qualquer mudança já sobe e a Vercel deploya sozinha, não precisa (nem dá pra
evitar) rodar git manualmente.

Apagar este arquivo (`TODO_CODEX.md`) quando tudo abaixo estiver concluído.

## ✅ Já feito e commitado (não refazer)

- [x] Shell: logo do sidebar em chip branco, filtro de período em pílula, bug de
      travamento ao trocar mês 2x corrigido (`setMesGlobal`).
- [x] Coordenador pode editar o próprio pedido não faturado, com tag "Editado
      por {nome}" (`api/_lib/authz.js`, `api/pedidos-vendas/[acao].js`).
- [x] Campo UF no cadastro e na edição de cliente (tela Gestão de clientes).
- [x] Origens "GB CE"/"GB MA" reativadas (não são mais "somente histórico").
- [x] Botão "⬇ PDF pro cliente" no modal de detalhe do pedido
      (`vdExportarPedidoPDF`) — PDF completo via jsPDF+autoTable.
- [x] Fabiano não vê mais pedidos com origem != Fábrica nas telas Registro e
      GNRE (`irRegistro`, `gnreCarregar`, `vdExportarPDF`).
- [x] Dashboard: removido card de Premiação e seção "Inteligência de
      clientes" (as funções `dashAnaliseClientes`/`dashStatusRecompra`
      continuam no código, não deletar — serão reaproveitadas na task 2).
- [x] Mapa do Brasil: `dashMapColor()` corrigido pra usar a mesma paleta
      azul/teal que a legenda `.state-map-scale` já usava (antes a legenda
      era azul e o mapa pintava roxo — não batiam).
- [x] Dashboard: `dashMainKpisHTML` reduzido de 4→2 cards (tirou "Volume
      vendido"/"Meta do mês", redundantes com o hero). `dashOverviewHTML`
      juntou "Fábrica"+"Distribuidoras" num card só (5→4 cards,
      `.dash-snapshot` ajustada pra grid de 4 colunas).

## 🔲 Falta fazer

### Task 1 — Terminar profundidade dos gráficos + legibilidade do SKU no Dashboard

Arquivo: `index.html`. Sem lib de gráfico nova (projeto não usa nenhuma, só
CSS/divs pra essas barras — manter esse padrão, não adicionar dependência).

1. **Gráfico de evolução mensal** — duas funções usam a mesma estrutura
   `.trend-bars`/`.trend-col` (CSS ~linha 247-248): `renderAdminDash` (busca a
   string `Evolução de vendas realizadas`) e `renderCoordDash` (busca
   `Evolução de performance`). Hoje só mostram `%` de cumprimento da meta por
   mês.
   - No `renderCoordDash`, o array `trend` calcula `vol` mas **não** inclui no
     objeto retornado (`return{label:...,pct:...}` — falta `,vol`). Corrigir
     isso primeiro (no `renderAdminDash` já está certo, `vol` já vem no
     objeto).
   - Adicionar `position:relative` em `.trend-bars` (CSS).
   - Criar uma linha de referência tracejada horizontal na altura de 100% da
     meta (nova classe `.trend-meta-line`, posicionada via `bottom` calculado
     a partir de `trendMax` no JS, ex.: `bottom:${Math.round(100/trendMax*185)+18}px`).
   - Mostrar o volume real em caixas (`t.vol`) como texto pequeno, além do
     `%` que já aparece em `.trend-value`.
   - Aplicar a mesma mudança nas duas funções (admin e coordenador) pra
     manter consistência.

2. **Tabela "Performance por coordenador"** (dentro de `renderAdminDash`,
   busca a string `Performance por coordenador`) — só 4 linhas, sem
   tendência. Adicionar uma coluna "Tendência" com um mini-sparkline (barras
   CSS pequenas, sem lib) dos últimos ~6 meses por coordenador. Dá pra
   computar chamando `coordRow(coord, vdListaDashboard(anoData,i,'todos'))`
   pra cada um dos últimos meses, dentro do loop que já monta `rows`.

3. **Painel "Qtd por produto vendido"** (`vdSkuQtdPanelHTML`, renderizado
   dentro do `.dash-lower`) — fica espremido porque a grid `.dash-lower`
   (CSS, buscar `.dash-lower{display:grid`) reserva só `.85fr` pra esse
   painel, e nomes completos de produto (ex. "GUDANG TWIN TEN") não cabem
   bem. Ajustar a proporção da grid (ex. `1.3fr 1.1fr` em vez de
   `1.55fr .85fr`) e/ou aumentar um pouco as fontes de `.sku-qty-full` e
   `.sku-qty-numbers` (hoje 12px).

**Verificação**: sem test runner. Checar sintaxe do JS embutido:
```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
fs.writeFileSync('/tmp/_check.js', scripts.join('\n;\n'));
"
node --check /tmp/_check.js
```
Pra ver visualmente sem precisar da API/login: abrir o `index.html` local no
browser, forçar via console (populando `COORD_KEYS`, `METAS`, `clientesDB`
com dados fake) e chamar `renderAdminDash([])` / `renderCoordDash([])`
diretamente.

### Task 2 — Painel de cliente (histórico + produtos + prazos)

**Bloqueado até o usuário decidir**: perguntar antes de implementar se ele
quer **modal** (janela sobre a lista, mais rápido de navegar) ou **tela
dedicada** (mais espaço pra gráficos, como a tela de Vendas). Ele já
respondeu as outras perguntas relacionadas:
- "Prazos" = previsão de recompra **e** prazo de pagamento, os dois juntos.
- Fotos de produto: NÃO fazer nada ainda (task 3, bloqueada).

Quando o formato estiver decidido:
- Reaproveitar `dashAnaliseClientes(hist, coordFiltro)` e
  `dashStatusRecompra(c)` (ainda existem no código, só não são mais chamadas
  pelo Dashboard) pra calcular a previsão de recompra.
- Fonte de dados: `dashHistoricoVendas` (já carregado por `carregarDashboard`).
- Entrada natural: clicar num cliente na tela "Gestão de clientes" (`s-cli`).

### Task 3 — Fotos de produto (GR/GM/CM/CC/GTwin/CK)

**Bloqueada.** Usuário vai mandar os arquivos reais depois. Não criar
placeholder, não mexer em nada disso até ele enviar as imagens.
