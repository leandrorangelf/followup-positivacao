# Graph Report - .  (2026-07-29)

## Corpus Check
- Corpus is ~34,489 words - fits in a single context window. You may not need a graph.

## Summary
- 120 nodes · 244 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Pedidos de Vendas - Acoes (faturar, GNRE, comentario, prazo)
- Rotas Genericas & GNRE (db proxy, sign, upload, tv-data)
- Autorizacao (authz.js)
- Sessao & Autenticacao (auth.js, login/logout/me)
- Login & Senhas + Testes de Authz
- Teste: Design System
- Teste: Dashboard
- Teste: Copy da UI
- Teste: Dashboard Profundidade
- Teste: Contraste Sistema Claro
- Config Vercel

## God Nodes (most connected - your core abstractions)
1. `sbJson()` - 20 edges
2. `vePrivilegiado()` - 11 edges
3. `status()` - 11 edges
4. `isAdminLiteral()` - 10 edges
5. `getSession()` - 9 edges
6. `isFabiano()` - 9 edges
7. `isVagner()` - 9 edges
8. `isDiretoria()` - 7 edges
9. `podeEditarPedidoVendaProprio()` - 7 edges
10. `podeCriarPedidoVenda()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `renameCliente()` --calls--> `isAdminLiteral()`  [EXTRACTED]
  api/pedidos-vendas/[acao].js → api/_lib/authz.js
- `podeEditarPedidoVendaProprio()` --calls--> `sbJson()`  [EXTRACTED]
  api/_lib/authz.js → api/_lib/supabase.js
- `gnreAttach()` --calls--> `podeAnexarGnre()`  [EXTRACTED]
  api/pedidos-vendas/[acao].js → api/_lib/authz.js
- `pedidoPertenceASessao()` --calls--> `sbJson()`  [EXTRACTED]
  api/_lib/authz.js → api/_lib/supabase.js
- `gnreAttach()` --calls--> `pedidoPertenceASessao()`  [EXTRACTED]
  api/pedidos-vendas/[acao].js → api/_lib/authz.js

## Import Cycles
- None detected.

## Communities (11 total, 1 thin omitted)

### Community 0 - "Pedidos de Vendas - Acoes (faturar, GNRE, comentario, prazo)"
Cohesion: 0.19
Nodes (23): isFabiano(), podeComentarPedido(), podeFaturar(), podeGerenciarGnre(), prazoLiberado(), sbJson(), comentar(), faturar() (+15 more)

### Community 1 - "Rotas Genericas & GNRE (db proxy, sign, upload, tv-data)"
Cohesion: 0.12
Nodes (14): { GENERIC_TABLES, scopeQuery, enforceBodyOwnership, ALLOWED_PREFER }, { getSession }, { sbFetch }, { getSession }, { sbFetch, sbJson, SUPABASE_URL }, { vePrivilegiado }, { getSession }, { podeAnexarGnre, pedidoPertenceASessao } (+6 more)

### Community 2 - "Autorizacao (authz.js)"
Cohesion: 0.25
Nodes (18): { COORD_KEYS }, enforceBodyOwnership(), forecastPodeEditar(), isAdminLiteral(), isCoordenador(), isDiretoria(), isVagner(), pedidoPertenceASessao() (+10 more)

### Community 3 - "Sessao & Autenticacao (auth.js, login/logout/me)"
Cohesion: 0.18
Nodes (13): { getSession }, { isAdminLiteral, isDiretoria }, { sbJson }, { clearSessionCookie }, { getSession }, clearSessionCookie(), crypto, getSecret() (+5 more)

### Community 4 - "Login & Senhas + Testes de Authz"
Cohesion: 0.18
Nodes (10): attempts, { SENHAS_HASH, COORD_KEYS }, { sha256Hex, setSessionCookie }, sha256Hex(), COORD_KEYS, SENHAS_HASH, assert, { podeCriarPedidoVenda, podeEditarPedidoVendaProprio } (+2 more)

### Community 5 - "Teste: Design System"
Cohesion: 0.33
Nodes (5): assert, fs, html, screens, test

### Community 6 - "Teste: Dashboard"
Cohesion: 0.40
Nodes (4): assert, fs, html, test

### Community 7 - "Teste: Copy da UI"
Cohesion: 0.40
Nodes (4): assert, fs, html, test

### Community 8 - "Teste: Dashboard Profundidade"
Cohesion: 0.50
Nodes (3): assert, fs, html

### Community 9 - "Teste: Contraste Sistema Claro"
Cohesion: 0.50
Nodes (3): assert, fs, html

## Knowledge Gaps
- **52 isolated node(s):** `crypto`, `{ COORD_KEYS }`, `{ sbJson }`, `{ getSession }`, `{ sbJson }` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sbJson()` connect `Pedidos de Vendas - Acoes (faturar, GNRE, comentario, prazo)` to `Rotas Genericas & GNRE (db proxy, sign, upload, tv-data)`, `Autorizacao (authz.js)`, `Sessao & Autenticacao (auth.js, login/logout/me)`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `getSession()` connect `Sessao & Autenticacao (auth.js, login/logout/me)` to `Pedidos de Vendas - Acoes (faturar, GNRE, comentario, prazo)`, `Rotas Genericas & GNRE (db proxy, sign, upload, tv-data)`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `podeEditarPedidoVendaProprio()` connect `Autorizacao (authz.js)` to `Pedidos de Vendas - Acoes (faturar, GNRE, comentario, prazo)`, `Login & Senhas + Testes de Authz`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `crypto`, `{ COORD_KEYS }`, `{ sbJson }` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rotas Genericas & GNRE (db proxy, sign, upload, tv-data)` be split into smaller, more focused modules?**
  _Cohesion score 0.12105263157894737 - nodes in this community are weakly interconnected._