# Sistema Visual Híbrido Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar o visual de todas as telas do Follow-up Positivação conforme a direção híbrida aprovada.

**Architecture:** O trabalho permanece em `index.html`, preservando o aplicativo monolítico atual. Um único conjunto de tokens controla superfícies claras e ilhas estruturais escuras; aliases mantêm compatibilidade durante a migração e funções de render passam a emitir variáveis CSS em vez de uma segunda paleta literal.

**Tech Stack:** HTML, CSS e JavaScript client-side, sem bibliotecas novas.

## Global Constraints

- Cobrir as 15 telas e todos os componentes compartilhados.
- Manter TV escura e impressão autônoma.
- Usar roxo `#6547d9` apenas para ação e seleção.
- Preservar cores semânticas e séries de dados.
- Não adicionar dependências.

---

### Task 1: Guardas de cobertura

**Files:**
- Create: `tests/design-system.test.js`
- Modify: `index.html`

- [ ] Escrever teste que enumera todas as telas e exige tokens canônicos, apenas um `:root`, piso tipográfico e ausência dos literais antigos nos renders vivos.
- [ ] Executar `node tests/design-system.test.js` e confirmar a falha inicial.
- [ ] Manter o teste como guarda para as tarefas seguintes.

### Task 2: Código morto e estrutura duplicada

**Files:**
- Modify: `index.html`
- Test: `tests/design-system.test.js`

- [ ] Remover o header antigo do Dashboard e referências a `dash-mes`, `dash-greeting` e `dash-name`.
- [ ] Remover as versões sobrescritas de `renderCoordDash`, `renderAdminDash` e sua cadeia exclusiva de premiação.
- [ ] Remover regras globais órfãs de `select option`.
- [ ] Validar JavaScript inline e testes existentes relevantes.

### Task 3: Tokens e componentes compartilhados

**Files:**
- Modify: `index.html`
- Test: `tests/design-system.test.js`

- [ ] Fundir os blocos `:root` com aliases compatíveis.
- [ ] Padronizar botões, campos, cards, chips, tabs, modais, tabelas, foco, radius e sombras.
- [ ] Preservar overrides escuros de Dashboard/TV usando os mesmos nomes de tokens.
- [ ] Executar guarda de design e sintaxe inline.

### Task 4: Renders dinâmicos e todas as telas

**Files:**
- Modify: `index.html`
- Test: `tests/design-system.test.js`

- [ ] Migrar literais de superfície, texto e borda nas funções vivas para tokens.
- [ ] Elevar textos vivos abaixo de 11px, preservando TV e micrográficos.
- [ ] Aplicar roxo aos controles ativos sem alterar cores semânticas ou séries de dados.
- [ ] Auditar individualmente as 15 telas enumeradas no design.

### Task 5: Verificação final

**Files:**
- Modify only if verification exposes defects: `index.html`, `tests/design-system.test.js`

- [ ] Compilar todo JavaScript inline com Node.
- [ ] Executar `node tests/design-system.test.js` e a suíte de testes do repositório.
- [ ] Inspecionar diff e confirmar que impressão e TV preservam suas exceções.
- [ ] Verificar visualmente desktop e mobile nas telas acessíveis sem credenciais; solicitar ao usuário apenas a validação autenticada final.

