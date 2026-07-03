# Follow-up Positivação — Clean Tobacco

Aplicação web interna da Clean Tobacco para acompanhamento de vendas, positivação de clientes, metas de coordenadores e faturamento.

## Estrutura do projeto

```text
.
├── index.html                    # Frontend: HTML + CSS + JS (SPA vanilla, ~5.600 linhas)
├── vercel.json                   # Rewrite SPA (exclui /api/*) para a Vercel
├── supabase-comentario-vagner.sql# Migração avulsa (colunas de comentário na tabela pedidos_vendas)
├── api/                          # Backend: Vercel Functions (Node, sem dependências)
│   ├── _lib/                     # Não roteável pela Vercel (prefixo "_"), nunca exposto ao navegador
│   │   ├── auth.js               # Sessão: HMAC (crypto nativo), cookie httpOnly
│   │   ├── senhas.js             # Hashes SHA-256 das senhas (movidos do client)
│   │   ├── authz.js              # Matriz de autorização por tabela/ação/role
│   │   └── supabase.js           # fetch ao Supabase usando SUPABASE_SERVICE_ROLE_KEY
│   ├── auth/{login,logout,me}.js # Autenticação e restauração de sessão
│   ├── db/[table].js             # Proxy autorizado para tabelas de regra simples
│   ├── pedidos-vendas/[acao].js  # Endpoints dedicados (salvar, faturar, origem, gnre, status...)
│   ├── audit.js                  # Log de auditoria (usuario sempre vem da sessão)
│   ├── gnre/{upload,sign}.js     # Upload e leitura (URL assinada) de anexos GNRE
│   └── tv-data.js                # Único endpoint deliberadamente público (painel de TV)
└── .claude/
    └── settings.json             # Hook: todo Write/Edit dispara git add+commit+push automático
```

Não há `package.json`/build step para o frontend — `index.html` é servido como está. As functions em `api/` são zero-config (Vercel detecta `.js` em `api/` automaticamente, runtime Node). As bibliotecas do frontend (jsPDF, jsPDF-AutoTable, D3 v3, topojson, Datamaps BR) são carregadas via CDN no `<head>`.

**Ponto de atenção:** o hook em `.claude/settings.json` faz commit + push automáticos a cada edição de arquivo — toda alteração já sobe pro remoto e a Vercel deploya sozinha. Cuidado ao editar em vários passos: cada `Write`/`Edit` já é público.

## Stack e arquitetura de segurança (migração 2026-07-03)

Até 2026-07-03 este app falava direto do navegador para a REST API do Supabase com uma chave `anon` hardcoded, sem RLS efetivo — qualquer pessoa lia/escrevia o banco inteiro sem login. Isso foi corrigido; a arquitetura atual é:

```text
index.html (fetch('/api/...') com cookie de sessão, mesma origem)
      │
      ▼
Vercel Functions (api/) — usam SUPABASE_SERVICE_ROLE_KEY (env, só no servidor)
      │
      ▼
Supabase — RLS ligado nas 8 tabelas, sem policy para anon/authenticated (deny total).
           service_role ignora RLS por padrão do Postgres/Supabase.
```

- **Autenticação:** `api/auth/login.js` verifica a senha (hash SHA-256 em `api/_lib/senhas.js`, nunca enviado ao client) e emite um cookie de sessão assinado (HMAC, `SESSION_SECRET`), httpOnly, 12h. `api/auth/me.js` restaura a sessão no reload.
- **Autorização:** `api/_lib/authz.js` replica as regras que antes eram só cosméticas no client (`vdPodeEditar`, `vdPodeFaturar`, `forecastPodeEditar` etc.) — agora aplicadas no servidor antes de qualquer chamada ao Supabase.
- **Tabelas com regra simples** (`clientes`, `pedidos`, `metas_mensais`, `pedidos_vendas` GET, `forecast_pedidos(+itens)`) passam pelo proxy genérico `api/db/[table].js`.
- **`pedidos_vendas`** tem múltiplas ações com permissões diferentes na mesma tabela (editar, faturar, origem, GNRE) — por isso usa endpoints dedicados em `api/pedidos-vendas/[acao].js`, não o proxy genérico.
- **Coordenadores** são restritos ao próprio nome em `pedidos`/`pedidos_vendas`/`forecast_pedidos` (`scopeQuery`/`enforceBodyOwnership` em `authz.js`), inclusive contra IDOR (ver `pedidoPertenceASessao`, usado nos endpoints de GNRE).
- **GNRE:** bucket `gnre-comprovantes` é privado; upload via `api/gnre/upload.js` (valida `id` como UUID e `tipo` como allow-list — evita path/URL malformada), leitura via `api/gnre/sign.js` (URL assinada, ~60s).
- **Painel de TV** (`index.html#tv`) é a única rota sem login por design (tela fixa de escritório) — serve dados agregados via `api/tv-data.js`, sem escrita, sem acesso a outras tabelas.

**Env vars necessárias na Vercel** (nunca commitadas): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`.

## Perfis de usuário

Definidos em `api/_lib/senhas.js` / `COORD_KEYS`:

- `admin` (Leandro, Gestor) — acesso completo
- `vagner` (Gerente) — `isAdmin=true` mas somente leitura na tela de Pedidos legada
- `diretoria` — somente leitura
- `fabiano` (Faturamento) — gerencia GNRE e faturamento
- Coordenadores: `Igor Cater`, `Marcio Vit`, `Vitor Valle`, `Rosana` — só veem/editam o próprio nome

Senhas foram rotacionadas em 2026-07-03 (as anteriores ficaram expostas publicamente antes da migração). Se precisar trocar de novo, gerar novo hash SHA-256 e atualizar `api/_lib/senhas.js` — nunca voltar a colocar hashes no `index.html`.

## Telas principais (`id="s-*"` em index.html)

| id | Tela |
| --- | --- |
| `s-login` | Login (seleção de perfil + senha) |
| `s-dash` | Dashboard / visão geral |
| `s-ped` | Pedidos (lançamento de vendas por SKU) |
| `s-cli` | Gestão de clientes |
| `s-metas` | Metas por coordenador/mês |
| `s-vendas` | Vendas & faturamento |
| `s-vfn` / `s-vficha` | Ficha/detalhe de venda |
| `s-forecast` | Previsão comercial |
| `s-relatorios` | Relatórios / análise |
| `s-registro` | Registro de faturamento (histórico) |
| `s-log` | Log de atividades |
| `s-tv` | Painel para TV externa (sem login, ver acima) |

## Banco de dados (Supabase)

Projeto: `rpxrjawzkkpnzancmcif.supabase.co`. RLS ligado em todas as 8 tabelas (`clientes`, `pedidos`, `pedidos_vendas`, `pedidos_vendas_itens`, `metas_mensais`, `forecast_pedidos`, `forecast_pedidos_itens`, `audit_log`), sem policies — só `service_role` acessa. Não há migrations versionadas no repo além do arquivo solto `supabase-comentario-vagner.sql` — mudanças de schema aplicadas manualmente no SQL Editor do Supabase.

## Convenções ao editar

- Frontend: editar `index.html` diretamente, sem build. CSS em `<style>` no `<head>`; JS em `<script>` no final, escopo global (`user`, `dadosLocais`, `coordAtual`, `mesAtual` etc. são globais compartilhadas).
- Novas telas seguem o padrão `<div id="s-nome" class="screen" style="display:none">` + entrada em `renderNav`/`navTo`.
- Chamadas ao backend passam pelo helper `sb(path, opts)` (linha ~1350), que hoje reescreve `/rest/v1/<tabela>` para `/api/db/<tabela>` — **nunca** reintroduzir uma chave do Supabase no client.
- Nova ação de escrita em `pedidos_vendas`: criar um `case` novo em `api/pedidos-vendas/[acao].js` com sua própria checagem de role, não usar o proxy genérico (ele só permite GET nessa tabela, de propósito).
- Nova tabela de regra simples: adicionar em `GENERIC_TABLES` (`api/_lib/authz.js`) — por padrão tudo é negado (fail closed) até ser explicitamente liberado ali.
- Toda edição salva localmente já dispara push automático pro Git remoto (hook acima) — evitar deixar o app ou o backend em estado quebrado no meio de uma sequência de edições.
