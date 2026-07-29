# Graph Report - .  (2026-07-29)

## Corpus Check
- Corpus is ~34,489 words - fits in a single context window. You may not need a graph.

## Summary
- 120 nodes · 244 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10

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

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (23): isFabiano(), podeComentarPedido(), podeFaturar(), podeGerenciarGnre(), prazoLiberado(), sbJson(), comentar(), faturar() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (14): { GENERIC_TABLES, scopeQuery, enforceBodyOwnership, ALLOWED_PREFER }, { getSession }, { sbFetch }, { getSession }, { sbFetch, sbJson, SUPABASE_URL }, { vePrivilegiado }, { getSession }, { podeAnexarGnre, pedidoPertenceASessao } (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.25
Nodes (18): { COORD_KEYS }, enforceBodyOwnership(), forecastPodeEditar(), isAdminLiteral(), isCoordenador(), isDiretoria(), isVagner(), pedidoPertenceASessao() (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (13): { getSession }, { isAdminLiteral, isDiretoria }, { sbJson }, { clearSessionCookie }, { getSession }, clearSessionCookie(), crypto, getSecret() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (10): attempts, { SENHAS_HASH, COORD_KEYS }, { sha256Hex, setSessionCookie }, sha256Hex(), COORD_KEYS, SENHAS_HASH, assert, { podeCriarPedidoVenda, podeEditarPedidoVendaProprio } (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (5): assert, fs, html, screens, test

### Community 6 - "Community 6"
Cohesion: 0.40
Nodes (4): assert, fs, html, test

### Community 7 - "Community 7"
Cohesion: 0.40
Nodes (4): assert, fs, html, test

### Community 8 - "Community 8"
Cohesion: 0.50
Nodes (3): assert, fs, html

### Community 9 - "Community 9"
Cohesion: 0.50
Nodes (3): assert, fs, html

## Knowledge Gaps
- **52 isolated node(s):** `crypto`, `{ COORD_KEYS }`, `{ sbJson }`, `{ getSession }`, `{ sbJson }` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sbJson()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `getSession()` connect `Community 3` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `podeEditarPedidoVendaProprio()` connect `Community 2` to `Community 0`, `Community 4`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `crypto`, `{ COORD_KEYS }`, `{ sbJson }` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12105263157894737 - nodes in this community are weakly interconnected._