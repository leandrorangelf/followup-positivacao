# Graph Report - .  (2026-08-13)

## Corpus Check
- Corpus is ~49,234 words - fits in a single context window. You may not need a graph.

## Summary
- 365 nodes · 499 edges · 43 communities (32 shown, 11 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.67)
- Token cost: 412,132 input · 0 output

## Community Hubs (Navigation)
- Autorização por Papel (authz.js)
- Sessão HMAC (auth.js)
- Proxy Genérico de Tabelas
- Carregamento do Dashboard
- Segurança e Consulta GNRE
- Premiação e Profundidade Visual
- Push Notifications Backend
- Prazo com Aprovação + Totalizador ES
- Auditoria (audit.js)
- Login e Hashes de Senha
- Design Tokens Visuais
- Fluxo de Decisão de Prazo
- Paleta de Cores do Sistema
- Arquitetura de Proxy de Tabelas
- Análise de Clientes no Dashboard
- Testes: Design System
- Faturamento Parcial Operacional
- Dependências (package.json)
- Testes: Auditoria por Pedido
- Testes: Dashboard
- Testes: Histórico de Pedido
- Testes: Push Frontend
- Testes: Sino de Notificações
- Testes: Copy da UI
- Testes: Dashboard Profundidade
- Testes: Contraste Claro
- Testes: Service Worker
- Navegação GNRE/Registro
- Faturamento de Vendas
- Atualização de Status GNRE
- Skill Observations (vazio)
- Ícones SVG Inline
- Decisão de Prazo do Coordenador
- Exportação de PDF
- Upload de GNRE (Storage)
- Config Vercel (rewrites)
- Perfis de Usuário
- KPIs Principais do Dashboard
- Visão Geral do Dashboard
- Seleção Global de Mês

## God Nodes (most connected - your core abstractions)
1. `sbJson()` - 24 edges
2. `getSession()` - 11 edges
3. `vePrivilegiado()` - 11 edges
4. `status()` - 11 edges
5. `isAdminLiteral()` - 10 edges
6. `isFabiano()` - 9 edges
7. `isVagner()` - 9 edges
8. `notificar()` - 9 edges
9. `salvar()` - 8 edges
10. `isDiretoria()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `vdPodeEditar()` --semantically_similar_to--> `scopeQuery (authz.js)`  [INFERRED] [semantically similar]
  index.html → CLAUDE.md
- `Task 1 — profundidade dos gráficos + legibilidade do SKU no Dashboard` --conceptually_related_to--> `Hook .claude/settings.json (auto commit+push)`  [EXTRACTED]
  TODO_CODEX.md → CLAUDE.md
- `Notificações via Web Push + sininho in-app` --semantically_similar_to--> `Histórico de ações por pedido (Vendas)`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-07-29-notificacoes-web-push-design.md → docs/superpowers/specs/2026-08-11-historico-pedido-design.md
- `sb(path, opts) — fetch autenticado` --references--> `Helper sb(path, opts)`  [EXTRACTED]
  index.html → CLAUDE.md
- `Aba de Consulta GNRE (s-gnre)` --references--> `scopeQuery (authz.js)`  [EXTRACTED]
  docs/superpowers/specs/2026-07-20-aba-consulta-gnre-design.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fluxo de autenticação e sessão** — index_html_login, index_html_aplicarsessao, index_html_tentarrestaurarsessao, api_auth_login, api__lib_auth_sessao [INFERRED 0.85]
- **Arquitetura de autorização por tabela/ação** — claude_md_arquitetura_seguranca, api__lib_authz_generic_tables, api_db__table_, api_pedidos_vendas__acao_, index_html_sb [EXTRACTED 1.00]
- **Fluxo de anexos GNRE (upload, status, assinatura de URL)** — index_html_vduploadgnrestorage, index_html_vdatualizargnre, index_html_vdmarcargnreenviada, index_html_vdmarcargnrepaga, api_gnre_upload, api_gnre_sign, api__lib_authz_pedidopertencaasessao [INFERRED 0.85]
- **Performance por Coordenador Table Evolution** — docs_superpowers_plans_2026_07_21_dashboard_profundidade_coord_trend_sparkline, docs_superpowers_plans_2026_07_21_sistema_claro_contraste_semantic_performance_highlight, docs_superpowers_plans_2026_07_28_diretoria_vendas_diretas_dashboard_expandable_coord_row [INFERRED 0.85]
- **Prazo Approval, Notification & Audit Pipeline** — docs_superpowers_plans_2026_07_27_prazo_aprovacao_totalizador_es_prazo_aprovacao_feature, docs_superpowers_plans_2026_07_29_notificacoes_web_push_push_notification_system, docs_superpowers_plans_2026_08_11_historico_pedido_audit_log_pedido_id [INFERRED 0.75]
- **index.html Visual Design System Overhaul** — docs_superpowers_plans_2026_07_20_sistema_visual_hibrido_plan, docs_superpowers_plans_2026_07_21_sistema_claro_contraste_plan, docs_superpowers_plans_2026_07_21_dashboard_profundidade_plan [INFERRED 0.75]
- **Duas features independentes bundladas na tela de Vendas** — docs_superpowers_specs_2026_07_27_prazo_e_totalizador_es_design_prazo_com_aprovacao, docs_superpowers_specs_2026_07_27_prazo_e_totalizador_es_design_totalizador_estoque_es, docs_superpowers_specs_2026_07_27_prazo_e_totalizador_es_design_prazo_status_colunas [INFERRED 0.75]
- **Padrão de disparo best-effort de notificação após escrita confirmada** — api_pedidos_vendas__acao__prazo_decidir, api_pedidos_vendas__acao__salvar, api__lib_push_notificar, docs_superpowers_specs_2026_07_29_notificacoes_web_push_design_notificacoes_web_push [INFERRED 0.80]
- **Sistema de tokens visuais compartilhado entre specs de UI (híbrido e contraste)** — docs_superpowers_specs_2026_07_20_sistema_visual_hibrido_design_sistema_visual_hibrido, docs_superpowers_specs_2026_07_21_sistema_claro_contraste_design_sistema_claro_contraste_semantico, docs_superpowers_specs_2026_07_20_sistema_visual_hibrido_design_cor_roxo_acao, docs_superpowers_specs_2026_07_21_sistema_claro_contraste_design_cor_roxo_selecao [INFERRED 0.75]

## Communities (43 total, 11 thin omitted)

### Community 0 - "Autorização por Papel (authz.js)"
Cohesion: 0.13
Nodes (43): { COORD_KEYS }, enforceBodyOwnership(), forecastPodeEditar(), isAdminLiteral(), isCoordenador(), isDiretoria(), isFabiano(), isVagner() (+35 more)

### Community 1 - "Sessão HMAC (auth.js)"
Cohesion: 0.08
Nodes (25): Sessão HMAC (auth.js), { clearSessionCookie }, { getSession }, clearSessionCookie(), crypto, getSecret(), getSession(), parseCookies() (+17 more)

### Community 2 - "Proxy Genérico de Tabelas"
Cohesion: 0.11
Nodes (16): pedidoPertenceASessao (authz.js), { GENERIC_TABLES, scopeQuery, enforceBodyOwnership, ALLOWED_PREFER }, { getSession }, { sbFetch }, { getSession }, { sbFetch, sbJson, SUPABASE_URL }, { vePrivilegiado }, { getSession } (+8 more)

### Community 3 - "Carregamento do Dashboard"
Cohesion: 0.10
Nodes (20): aplicarSessao(sessao), carregarDashboard(silencioso), carregarTv(silencioso), coordRow(coord, listaTodoMes), dashMapColor(cx, max), dashRenderMapaBrasil(containerId, rows), irDash(skipClientes), irTv() — painel de TV público (+12 more)

### Community 4 - "Segurança e Consulta GNRE"
Cohesion: 0.10
Nodes (20): enforceBodyOwnership (authz.js), scopeQuery (authz.js), Arquitetura de segurança (migração 2026-07-03), Hook .claude/settings.json (auto commit+push), GNRE Consulta Tab, gnreCarregar(), gnreRender(), irGnre() (+12 more)

### Community 5 - "Premiação e Profundidade Visual"
Cohesion: 0.10
Nodes (19): Aba Premiação (s-premiacao), COORD_SALARIO_FIXO (Marcio Vit), Coluna Tendência (mini-barras CSS), Profundidade dos gráficos do Dashboard, trendMax (linha 100% da meta), Linha expansível de mix de SKU (dashboard), Pseudo-coordenador "Diretoria", audit_log.pedido_id (nova coluna) (+11 more)

### Community 6 - "Push Notifications Backend"
Cohesion: 0.11
Nodes (14): ensureVapid(), { sbJson }, webpush, assert, auth, handler, { mock }, notificarCalls (+6 more)

### Community 7 - "Prazo com Aprovação + Totalizador ES"
Cohesion: 0.12
Nodes (16): Prazo com Aprovação + Totalizador ES Plan, Prazo com Aprovação do Renan (Feature), prazoDecidir() (backend action), supabase-prazo-aprovacao.sql, Totalizador de Estoque ES (Feature), vdDecidirPrazo() (frontend), notificar(), Notificações via Web Push + Sininho Plan (+8 more)

### Community 8 - "Auditoria (audit.js)"
Cohesion: 0.13
Nodes (11): pedidoPertenceASessao (api/_lib/authz.js), { getSession }, { isAdminLiteral, isDiretoria, pedidoPertenceASessao }, { sbJson }, auditLog(acao, descricao, detalhes, pedidoId), registrarAtividade(tipo, descricao, detalhes), assert, auth (+3 more)

### Community 9 - "Login e Hashes de Senha"
Cohesion: 0.16
Nodes (11): COORD_KEYS / senhas.js hashes, attempts, { SENHAS_HASH, COORD_KEYS }, { sha256Hex, setSessionCookie }, sha256Hex(), COORD_KEYS, SENHAS_HASH, assert (+3 more)

### Community 10 - "Design Tokens Visuais"
Cohesion: 0.14
Nodes (14): Unified Design Tokens (Light Surfaces + Dark Islands), Sistema Visual Híbrido Plan, tests/design-system.test.js, Coordinator Trend Sparkline Column, Dashboard Profundidade Plan, tests/dashboard-profundidade.test.js, Trend Meta Line + Volume Above Percentage, Light Base Tokens (#f4f7fb / #172136 / #d9e2ee) (+6 more)

### Community 11 - "Fluxo de Decisão de Prazo"
Cohesion: 0.19
Nodes (13): isDiretoria(session), prazoLiberado(pedidoId), notificar(usuarios,tipo,titulo,corpo,url) (api/_lib/push.js), case 'prazo-decidir' (api/pedidos-vendas/[acao].js), case 'salvar' (api/pedidos-vendas/[acao].js), Filtro "Aguardando aprovação de prazo", Prazo com Aprovação (28/35 / solicitar maior), pedidos_vendas.prazo_status e colunas relacionadas (+5 more)

### Community 12 - "Paleta de Cores do Sistema"
Cohesion: 0.33
Nodes (7): Roxo #6547d9 como cor de ação, Sistema Visual Híbrido, Bloco :root único de tokens CSS, TV como exceção deliberada (escura, clamp()), Roxo como seleção e ação principal, Cores semânticas (verde/âmbar/vermelho), Sistema Claro e Contraste Semântico

### Community 13 - "Arquitetura de Proxy de Tabelas"
Cohesion: 0.40
Nodes (6): GENERIC_TABLES (authz.js), fetch ao Supabase via service_role (supabase.js), api/db/[table].js proxy genérico, api/pedidos-vendas/[acao].js endpoints dedicados, Helper sb(path, opts), sb(path, opts) — fetch autenticado

### Community 14 - "Análise de Clientes no Dashboard"
Cohesion: 0.40
Nodes (6): dashAnaliseClientes(hist, coordFiltro), dashInteligenciaHTML(coordFiltro) — não mais chamada pelo Dashboard, dashIntelKpisHTML(hist, analise), dashStatusRecompra(c), Task 2 — Painel de cliente (histórico + produtos + prazos), Task 3 — Fotos de produto (bloqueada)

### Community 15 - "Testes: Design System"
Cohesion: 0.33
Nodes (5): assert, fs, html, screens, test

### Community 16 - "Faturamento Parcial Operacional"
Cohesion: 0.40
Nodes (5): Faturamento Parcial como Faturado Operacional, Filtro Faturados Parciais, Filtro Pendentes (sem caixa faturada), Kanban Faturado/Entregue, pedidos_vendas.qty_faturada

### Community 17 - "Dependências (package.json)"
Cohesion: 0.40
Nodes (4): dependencies, web-push, name, private

### Community 18 - "Testes: Auditoria por Pedido"
Cohesion: 0.40
Nodes (4): assert, fs, html, test

### Community 19 - "Testes: Dashboard"
Cohesion: 0.40
Nodes (4): assert, fs, html, test

### Community 20 - "Testes: Histórico de Pedido"
Cohesion: 0.40
Nodes (4): assert, fs, html, test

### Community 21 - "Testes: Push Frontend"
Cohesion: 0.40
Nodes (4): assert, fs, html, test

### Community 22 - "Testes: Sino de Notificações"
Cohesion: 0.40
Nodes (4): assert, fs, html, test

### Community 23 - "Testes: Copy da UI"
Cohesion: 0.40
Nodes (4): assert, fs, html, test

### Community 24 - "Testes: Dashboard Profundidade"
Cohesion: 0.50
Nodes (3): assert, fs, html

### Community 25 - "Testes: Contraste Claro"
Cohesion: 0.50
Nodes (3): assert, fs, html

### Community 26 - "Testes: Service Worker"
Cohesion: 0.50
Nodes (3): assert, fs, test

### Community 29 - "Atualização de Status GNRE"
Cohesion: 0.67
Nodes (3): vdAtualizarGnre(id, payload, msg), vdMarcarGnreEnviada(id), vdMarcarGnrePaga(id)

### Community 30 - "Skill Observations (vazio)"
Cohesion: 0.67
Nodes (3): skill-observations/cross-cutting-principles.md (checklist vazio), skill-observations/last-review-date.txt (2026-07-21), skill-observations/log.md (Skill Observation Log, vazio)

## Ambiguous Edges - Review These
- `Arquitetura de segurança (migração 2026-07-03)` → `Hook .claude/settings.json (auto commit+push)`  [AMBIGUOUS]
  CLAUDE.md · relation: conceptually_related_to
- `Task 2 — Painel de cliente (histórico + produtos + prazos)` → `Task 3 — Fotos de produto (bloqueada)`  [AMBIGUOUS]
  TODO_CODEX.md · relation: conceptually_related_to

## Knowledge Gaps
- **170 isolated node(s):** `crypto`, `{ COORD_KEYS }`, `{ sbJson }`, `webpush`, `{ sbJson }` (+165 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Arquitetura de segurança (migração 2026-07-03)` and `Hook .claude/settings.json (auto commit+push)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Task 2 — Painel de cliente (histórico + produtos + prazos)` and `Task 3 — Fotos de produto (bloqueada)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Histórico de ações por pedido (Vendas)` connect `Premiação e Profundidade Visual` to `Auditoria (audit.js)`, `Fluxo de Decisão de Prazo`, `Segurança e Consulta GNRE`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Why does `vdAbrirDet` connect `Segurança e Consulta GNRE` to `Premiação e Profundidade Visual`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **What connects `crypto`, `{ COORD_KEYS }`, `{ sbJson }` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Autorização por Papel (authz.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.13232323232323231 - nodes in this community are weakly interconnected._
- **Should `Sessão HMAC (auth.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.0784313725490196 - nodes in this community are weakly interconnected._