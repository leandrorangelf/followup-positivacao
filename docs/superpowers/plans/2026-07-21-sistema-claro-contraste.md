# Sistema claro e contraste semântico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar uma base clara e consistente ao sistema inteiro, com destaques semânticos vivos e textos legíveis em todas as telas.

**Architecture:** O projeto usa HTML único com CSS vanilla e tokens em `:root`. A implementação centraliza a paleta nesses tokens, corrige seletores de superfície/texto dos componentes compartilhados e adiciona classes semânticas apenas aos indicadores de desempenho do Dashboard. Nenhuma estrutura de dados ou dependência será alterada.

**Tech Stack:** HTML, CSS e JavaScript embutidos; Node.js para testes estáticos e `node --check`.

## Global Constraints

- Fundo geral claro `#f4f7fb` e superfícies de conteúdo brancas.
- Texto principal azul-escuro `#172136`, texto secundário `#52627a` e bordas `#d9e2ee`.
- Menu lateral e estruturas de navegação em azul-marinho contínuo.
- Ciano/teal como destaque operacional e roxo reservado para seleção e ação principal.
- Verde, âmbar e vermelho somente como estados semânticos de desempenho, pendência e erro.
- Nenhum texto claro sobre cartão claro.
- Preservar responsividade, funcionamento e dependências atuais.

---

### Task 1: Cobertura estrutural de contraste

**Files:**
- Create: `tests/sistema-claro-contraste.test.js`
- Read: `index.html`

**Interfaces:**
- Consome o conteúdo textual de `index.html`.
- Produz falhas quando os tokens claros, regras de contraste dos cartões SKU ou classes semânticas do Dashboard não estão presentes.

- [ ] **Step 1: Write the failing test**

  Criar teste Node com `assert.match` para verificar `--bg:#f4f7fb`,
  `--text:#172136`, `--muted:#52627a`, `--border:#d9e2ee`, regras explícitas
  de texto escuro em `.sku-qty-item`, e os seletores `.coord-row-good`,
  `.coord-row-warn` e `.coord-row-bad`.

- [ ] **Step 2: Run test to verify it fails**

  Run: `node tests/sistema-claro-contraste.test.js`

  Expected: FAIL porque a paleta atual ainda usa os tokens antigos e as classes semânticas ainda não existem.

- [ ] **Step 3: Commit test**

  ```bash
  git add tests/sistema-claro-contraste.test.js
  git commit -m "test: cobrir contraste e estados semanticos"
  ```

### Task 2: Atualizar tokens globais e componentes compartilhados

**Files:**
- Modify: `index.html:15-18` tokens `:root` e `body`
- Modify: `index.html:241-254` Dashboard, tabelas e cartões SKU
- Modify: `index.html:296-342` overrides do gestor desktop

**Interfaces:**
- Consome os mesmos nomes de variáveis CSS já usados pelas telas.
- Produz uma paleta clara compartilhada sem exigir mudanças em JavaScript.

- [ ] **Step 1: Trocar os tokens de base**

  Atualizar os valores para `--bg:#f4f7fb`, `--card:#ffffff`,
  `--border:#d9e2ee`, `--text:#172136`, `--muted:#52627a`,
  `--accent:#0f9fa8`, `--accent-light:#dff7f7`, `--navy:#10213f`,
  `--navy-2:#182d50`, `--purple:#5b4bd6`, `--purple-2:#7969e8`,
  `--purple-soft:#eeebff`, `--surface:#ffffff`, `--ink:#172136`,
  `--line:#d9e2ee`, `--soft:#f4f7fb` e `--gray-bg:#edf2f7`.

- [ ] **Step 2: Corrigir textos de baixa hierarquia**

  Garantir que `.panel-note`, `.data-table th`, `.sku-qty-pct`,
  `.sku-qty-numbers small`, `.trend-volume` e labels de navegação usem
  `var(--muted)` com a nova tonalidade, sem `opacity` que derrube o contraste.

- [ ] **Step 3: Corrigir cartões claros de produto**

  Adicionar regras específicas para `#s-dash .sku-qty-item`,
  `.sku-qty-full`, `.sku-qty-numbers` e `.sku-qty-code`: fundo branco,
  nome e números em `var(--text)`, informações secundárias em `var(--muted)`
  e código em `var(--navy)`. Preservar a barra teal de volume.

- [ ] **Step 4: Run syntax and focused test**

  Run: `node tests/sistema-claro-contraste.test.js` e `node --check` sobre os scripts extraídos de `index.html`.

### Task 3: Aplicar destaque semântico ao desempenho

**Files:**
- Modify: `index.html` CSS próximo de `.data-table` e `.mini-progress`
- Modify: `index.html` markup da tabela “Performance por coordenador” em `renderAdminDash`

**Interfaces:**
- Consome `r.pctMeta` já calculado por `coordRow`.
- Produz classes `coord-row-good`, `coord-row-warn` ou `coord-row-bad` no `<tr>` e barras/textos com a mesma semântica.

- [ ] **Step 1: Adicionar os estilos semânticos**

  Definir `.coord-row-good{background:rgba(22,163,74,.07)}`,
  `.coord-row-warn{background:rgba(217,119,6,.08)}` e
  `.coord-row-bad{background:rgba(220,38,38,.07)}`. Usar `color:#15803d`,
  `#b45309` e `#b91c1c` somente em `.coord-status` e manter o texto geral
  `var(--text)`.

- [ ] **Step 2: Classificar as linhas e o percentual**

  No `rows.map`, calcular `const perfCls=r.pctMeta>=100?'good':r.pctMeta>=80?'warn':'bad'` e aplicar `<tr class="coord-row-${perfCls}">` e `<strong class="coord-status coord-status-${perfCls}">${r.pctMeta}%</strong>`.

- [ ] **Step 3: Validar destaque semântico**

  Run: `node tests/sistema-claro-contraste.test.js` e `node tests/dashboard.test.js`.

### Task 4: Verificação visual e regressão

**Files:**
- Read: `index.html`
- Read: `tests/dashboard-profundidade.test.js`
- Read: `docs/superpowers/specs/2026-07-21-sistema-claro-contraste-design.md`

- [ ] **Step 1: Executar os testes focados**

  Run: `node tests/sistema-claro-contraste.test.js`,
  `node tests/dashboard-profundidade.test.js`, `node tests/dashboard.test.js`
  e `node tests/ui-copy.test.js`.

- [ ] **Step 2: Checar a sintaxe embutida**

  Extrair todos os blocos `<script>` de `index.html` para um arquivo temporário e executar `node --check` nesse arquivo.

- [ ] **Step 3: Revisar visualmente os estados principais**

  Conferir no Dashboard: títulos, notas, tabela de coordenadores, cartões de
  produtos, barras de progresso e linha de tendência. Confirmar que textos
  secundários continuam legíveis e que verde/âmbar/vermelho aparecem apenas
  nos estados correspondentes.

- [ ] **Step 4: Commit final**

  ```bash
  git add index.html tests/sistema-claro-contraste.test.js
  git commit -m "feat: padronizar tema claro e contraste do sistema"
  ```
