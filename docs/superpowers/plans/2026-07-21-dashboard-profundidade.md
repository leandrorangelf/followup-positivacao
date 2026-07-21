# Dashboard Profundidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar os gráficos do Dashboard mais informativos e melhorar a leitura da tendência por coordenador e do mix de produtos.

**Architecture:** Manteremos o HTML/CSS inline de `index.html`, adicionando uma estrutura compartilhada de marcação para os dois gráficos mensais e uma mini-série CSS na tabela administrativa. Os dados de tendência serão calculados no próprio `renderAdminDash`/`renderCoordDash`, sem nova dependência.

**Tech Stack:** JavaScript embutido, HTML/CSS existente, Node.js para testes estáticos e `node --check`.

## Global Constraints

- Não adicionar biblioteca de gráficos ou outra dependência.
- Volume deve aparecer acima da porcentagem, conforme decisão do usuário.
- Preservar a responsividade existente e o comportamento das funções atuais.
- Não implementar painel de cliente nem fotos de produto nesta tarefa.

---

### Task 1: Criar teste estrutural do Dashboard

**Files:**
- Create: `tests/dashboard-profundidade.test.js`
- Read: `index.html`

**Interfaces:**
- Consome o HTML completo de `index.html`.
- Produz falhas claras quando as duas funções de Dashboard não contêm volume,
  linha de meta, mini-tendência ou estilos de layout exigidos.

- [ ] **Step 1: Write the failing test**

  Criar um teste Node sem dependências que leia `index.html` e use `assert` para
  verificar: `position:relative` em `.trend-bars`; classe `.trend-meta-line`;
  `t.vol` em ambos os templates; `vol` no retorno de `renderCoordDash`; coluna
  `Tendência`; classe de mini-barras; grade `1.3fr 1.1fr`; e fontes 13px para
  `.sku-qty-full`/`.sku-qty-numbers`.

- [ ] **Step 2: Run test to verify it fails**

  Run: `node tests/dashboard-profundidade.test.js`

  Expected: FAIL porque as estruturas ainda não existem no HTML atual.

- [ ] **Step 3: Commit test**

  ```bash
  git add tests/dashboard-profundidade.test.js
  git commit -m "test: cobrir profundidade dos graficos do dashboard"
  ```

### Task 2: Aprofundar os gráficos mensais

**Files:**
- Modify: `index.html:247-248, 301-302` (CSS dos gráficos)
- Modify: `index.html:2834-2851` (`renderAdminDash`)
- Modify: `index.html:2876-2893` (`renderCoordDash`)

**Interfaces:**
- Consome os arrays `trend` já calculados e `trendMax` existente.
- Produz marcação `.trend-meta-line`, `.trend-volume`, `t.vol` e linha de
  referência calculada para a escala atual.

- [ ] **Step 1: Implementar o volume no retorno do coordenador**

  Alterar o retorno para `return{label:m.slice(0,3),pct:...,vol};`, mantendo
  o mesmo cálculo de volume já usado para as barras.

- [ ] **Step 2: Implementar a linha de 100% e volume nos dois templates**

  Antes do `trend.map`, calcular `trendMax=Math.max(100,...trend.map(t=>t.pct),1)`
  e `trendMetaBottom=Math.round(100/trendMax*185)+18`. Dentro de cada
  `.trend-bars`, inserir `<div class="trend-meta-line" style="bottom:${trendMetaBottom}px"><span>100% meta</span></div>` e, em cada coluna, inserir
  `<div class="trend-volume">${t.vol.toLocaleString('pt-BR')} cx</div>` antes de
  `.trend-value`.

- [ ] **Step 3: Adicionar os estilos mínimos**

  Tornar `.trend-bars` `position:relative`; posicionar `.trend-meta-line`
  como linha absoluta tracejada, com texto pequeno; estilizar `.trend-volume`
  como texto compacto acima do percentual. Ajustar a altura da linha para não
  cobrir as barras e manter contraste em desktop e mobile.

- [ ] **Step 4: Run the focused test and syntax check**

  Run: `node tests/dashboard-profundidade.test.js`

  Expected: PASS.

  Run: `node -e "const fs=require('fs');const html=fs.readFileSync('index.html','utf8');const scripts=[...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]);fs.writeFileSync(require('os').tmpdir()+'/_check-dashboard.js',scripts.join('\\n;\\n'));"`

  Then run: `node --check "$env:TEMP\_check-dashboard.js"`

### Task 3: Adicionar tendência à tabela administrativa

**Files:**
- Modify: `index.html:2855` (tabela em `renderAdminDash`)
- Modify: `index.html` near the Dashboard CSS block (mini-sparkline)

**Interfaces:**
- Consome `COORD_KEYS`, `vdListaDashboard(anoData,i,'todos')` e `coordRow`.
- Produz `<td class="coord-trend">` com seis `<span class="coord-trend-bar">`.

- [ ] **Step 1: Pré-calcular os seis meses recentes**

  Criar `const trendMonths=Array.from({length:6},(_,offset)=>{const i=mesAtual-5+offset;const ano=i<0?anoAtual-1:anoAtual;const mes=(i+12)%12;return vdListaDashboard(ano,mes,'todos');});` e, para cada coordenador, mapear `coordRow(coord,lista)`.

- [ ] **Step 2: Renderizar a coluna e as mini-barras CSS**

  Adicionar `<th>Tendência</th>` depois de “Cumprimento”. Para cada linha,
  calcular `maxTrend=Math.max(1,...history.map(h=>h.volume))` e renderizar seis
  barras com `height:${Math.max(4,Math.round(h.volume/maxTrend*28))}px`, destacando
  a última com a classe `current`.

- [ ] **Step 3: Validar tabela em desktop e overflow mobile**

  Manter `.table-scroll` como contêiner de overflow e dar à coluna largura
  mínima suficiente para as seis barras; não alterar o breakpoint existente.

### Task 4: Dar espaço ao painel de produtos

**Files:**
- Modify: `index.html:250,254,341` (grid e tipografia do painel SKU)

**Interfaces:**
- Consome a marcação existente de `vdSkuQtdPanelHTML`.
- Produz layout inferior com proporção `1.3fr 1.1fr` e texto principal de 13px.

- [ ] **Step 1: Ajustar a proporção da grade**

  Alterar `.dash-lower` para `grid-template-columns:minmax(0,1.3fr) minmax(300px,1.1fr)` no bloco de Dashboard, preservando o override mobile `display:block`.

- [ ] **Step 2: Ajustar fontes do SKU**

  Definir `.sku-qty-full` e `.sku-qty-numbers` em 13px no bloco de Dashboard,
  mantendo `.sku-qty-numbers small` em 11px para a informação secundária.

- [ ] **Step 3: Run all focused checks**

  Run: `node tests/dashboard-profundidade.test.js` e `node --check "$env:TEMP\_check-dashboard.js"`.

### Task 5: Verificação final e documentação

**Files:**
- Read: `TODO_CODEX.md`
- Read: `docs/superpowers/specs/2026-07-21-dashboard-profundidade-design.md`
- Modify: `TODO_CODEX.md` somente após todas as verificações passarem

- [ ] **Step 1: Executar testes existentes relacionados ao Dashboard**

  Run: `node tests/dashboard.test.js`; se existir cobertura específica de
  performance/pacotes, executar também os testes listados no próprio diretório.

- [ ] **Step 2: Revisar diff e sintaxe**

  Run: `git diff --check`; repetir `node --check` sobre os scripts extraídos de
  `index.html`; confirmar que nenhum arquivo de Task 2 ou Task 3 foi alterado.

- [ ] **Step 3: Marcar Task 1 como concluída**

  Atualizar somente os itens correspondentes à Task 1 em `TODO_CODEX.md` após
  a validação; manter as tarefas bloqueadas intactas.

- [ ] **Step 4: Commit final**

  ```bash
  git add index.html tests/dashboard-profundidade.test.js TODO_CODEX.md
  git commit -m "feat: aprofundar graficos do dashboard"
  ```
