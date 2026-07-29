# Notificações via Web Push + sininho in-app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Avisar quem precisa agir (prazo especial, faturamento, GNRE, pedido novo) em tempo real via Web Push do navegador, mesmo com o app fechado, com um sininho in-app como histórico/fallback.

**Architecture:** Um helper de servidor (`api/_lib/push.js`) grava a notificação numa tabela nova e dispara Web Push (via VAPID) pras subscriptions do(s) destinatário(s); é chamado a partir dos pontos de escrita que já existem em `api/pedidos-vendas/[acao].js`. O client registra um Service Worker (`sw.js`) que mostra a notificação do SO, e um sininho no topbar lista/pollinga as notificações via `/api/notificacoes`.

**Tech Stack:** Node 24 (Vercel Functions, sem framework), `web-push` (única dependência nova), Supabase/Postgres (2 tabelas novas, RLS sem policy), Service Worker API + Push API no client, `node:test`/`node:assert/strict` pros testes de backend, testes estruturais (regex sobre o HTML/JS) pro frontend — mesmo padrão de `tests/ui-copy.test.js` e `tests/design-system.test.js`.

## Global Constraints

- Spec de referência: [docs/superpowers/specs/2026-07-29-notificacoes-web-push-design.md](../specs/2026-07-29-notificacoes-web-push-design.md).
- Sem framework de testes — só `node:test`/`node:assert/strict` nativo do Node 24. Rode cada teste pelo caminho exato do arquivo (`node --test tests/arquivo.test.js`) — `node --test tests` ou `node --test tests/` (com ou sem barra, sem arquivo) quebra nesse ambiente (`MODULE_NOT_FOUND`), é um problema deste setup, não do projeto.
- A suíte já tem 4 testes falhando sem relação com esta feature (`tests/authz.test.js` — hash de senha desatualizado no teste; `tests/design-system.test.js` — literal de cor legada). Não são deste plano; não tente consertar. Rode só o arquivo de teste do seu próprio task pra verificar seu trabalho.
- Único pacote novo do projeto inteiro: `web-push` (`^3.6.7`). Hoje não existe `package.json` — o Task 2 cria um.
- **`.gitignore` não ignora `node_modules` hoje.** O hook em `.claude/settings.json` roda `git add -A` a cada Write/Edit — se `node_modules` existir sem estar no `.gitignore` no momento de um Write/Edit qualquer, ele é commitado e pushado inteiro. O Task 2 corrige isso ANTES de rodar `npm install` — nunca inverta essa ordem.
- **O hook de auto-save já commita e pusha sozinho após cada Write/Edit.** Passos "Write" ou "Edit" neste plano já disparam commit+push automaticamente — não rode `git commit` depois de um Write/Edit, isso já aconteceu. A exceção é quando o arquivo muda por `npm install` (não passa pelo hook, que só escuta Write/Edit) — aí sim o passo pede um `git add`/`commit` explícito.
- RLS ligado, sem nenhuma policy, nas tabelas novas — só `service_role` acessa (mesmo padrão das 8 tabelas existentes, ver `CLAUDE.md`).
- `usuario` em `push_subscriptions`/`notificacoes` sempre vem de `session.user` no servidor — nunca aceitar esse campo vindo do body do client.
- Toda chamada a `notificar(...)` dentro de `api/pedidos-vendas/[acao].js` só acontece DEPOIS da escrita principal ter sido confirmada (checando `.ok`), sempre com `await ... .catch(() => {})` — uma falha de notificação nunca pode derrubar nem atrasar indefinidamente a resposta da ação principal, mas precisa ser aguardada (sem `await`, o runtime serverless da Vercel pode matar a function antes do push sair).
- Ícone da notificação do SO: não existe nenhum asset de ícone no repo hoje — v1 não referencia nenhum (o navegador usa o ícone padrão dele). Não crie um arquivo de ícone novo pra isso.
- Não existe roteamento por URL nessa SPA (telas trocam via `show('s-x')`/funções `irX()`, não por path). O campo `url` das notificações serve só pro Service Worker abrir a aba (`clients.openWindow`) quando o app está fechado — dentro do app com a aba já aberta, o clique no sininho sempre chama `irVendas()` diretamente (os 5 eventos desta v1 são todos da tela de Vendas). Não construa um router novo pra isso.
- Copy visível ao usuário em PT-BR.

---

### Task 1: Schema — `push_subscriptions` e `notificacoes`

**Files:**
- Create: `supabase-notificacoes-push.sql`

**Interfaces:**
- Produces: tabelas Postgres `public.push_subscriptions(id, usuario, endpoint, p256dh, auth, created_at)` e `public.notificacoes(id, usuario, tipo, titulo, corpo, url, lida, created_at)`, usadas por todos os tasks de backend a seguir via `sbJson('/rest/v1/push_subscriptions...')` / `sbJson('/rest/v1/notificacoes...')`.

As duas tabelas já foram criadas manualmente no SQL Editor do Supabase durante o brainstorming desta feature (mesmo schema deste arquivo, RLS ligado, zero policy) — falta só documentar no repo (convenção do projeto: todo schema novo vira um arquivo `supabase-*.sql` solto, ver `supabase-prazo-aprovacao.sql`) e adicionar um índice que ficou de fora da primeira versão copiada. O SQL abaixo é idempotente (`if not exists` em tudo) — pode rodar de novo sem erro mesmo já aplicado.

- [ ] **Step 1: Escrever o arquivo de schema**

```sql
-- Notificações via Web Push + sininho in-app (ver docs/superpowers/specs/2026-07-29-notificacoes-web-push-design.md)
-- RLS ligado, sem policy — só service_role acessa (mesmo padrão das outras 8 tabelas do projeto).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_usuario_idx on public.push_subscriptions (usuario);
alter table public.push_subscriptions enable row level security;

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  tipo text not null,
  titulo text not null,
  corpo text,
  url text,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notificacoes_usuario_lida_idx on public.notificacoes (usuario, lida);
alter table public.notificacoes enable row level security;
```

- [ ] **Step 2: Aplicar o índice que faltava (o resto já existe)**

Rode no SQL Editor do Supabase (projeto `rpxrjawzkkpnzancmcif`) ou via MCP do Supabase:

```sql
create index if not exists push_subscriptions_usuario_idx on public.push_subscriptions (usuario);
```

- [ ] **Step 3: Verificar**

```sql
select tablename, indexname from pg_indexes where tablename in ('push_subscriptions','notificacoes') and schemaname='public' order by tablename, indexname;
```

Expected: 5 linhas — `notificacoes_pkey`, `notificacoes_usuario_lida_idx`, `push_subscriptions_endpoint_key`, `push_subscriptions_pkey`, `push_subscriptions_usuario_idx`.

- [ ] **Step 4: Verificar que o hook commitou**

```bash
git log -1 --stat
```

Expected: último commit é o auto-save do hook, incluindo só `supabase-notificacoes-push.sql`.

---

### Task 2: Dependência `web-push` + chaves VAPID

**Files:**
- Modify: `.gitignore`
- Create: `package.json`
- Create: `package-lock.json` (gerado por `npm install`)

**Interfaces:**
- Produces: módulo `web-push` disponível pra `require('web-push')` em `api/_lib/push.js` (Task 3) e `api/push/[acao].js` (Task 4). Env vars `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` configuradas na Vercel.

- [ ] **Step 1: Adicionar `node_modules` ao `.gitignore` ANTES de instalar qualquer pacote**

Ler o `.gitignore` atual (só tem `.vercel` e `.worktrees/`) e adicionar `node_modules`:

```
.vercel
.worktrees/
node_modules
```

- [ ] **Step 2: Criar `package.json`**

```json
{
  "name": "followup-positivacao",
  "private": true,
  "dependencies": {
    "web-push": "^3.6.7"
  }
}
```

- [ ] **Step 3: Instalar**

Run: `npm install`
Expected: cria `node_modules/` e `package-lock.json`, sem erros.

- [ ] **Step 4: Confirmar que `node_modules` não entrou no git**

Run: `git status --short`
Expected: mostra só `package-lock.json` como novo arquivo (o hook já commitou `.gitignore` e `package.json` nos Steps 1 e 2) — **nenhuma linha mencionando `node_modules`**. Se aparecer, pare e corrija o `.gitignore` antes de continuar.

- [ ] **Step 5: Gerar as chaves VAPID**

Run: `node -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys(), null, 2))"`
Expected: imprime um JSON com `publicKey` e `privateKey` (strings base64url). Isso também confirma que `web-push` foi instalado corretamente.

- [ ] **Step 6: Configurar as env vars na Vercel (ação manual, fora do repo)**

Essa etapa não é automatizável por aqui — não existe Vercel CLI instalado nesta máquina e mexer em env vars de produção é uma ação que precisa de confirmação explícita do usuário. No painel da Vercel (Project Settings → Environment Variables), adicionar:
- `VAPID_PUBLIC_KEY` = `publicKey` do Step 5
- `VAPID_PRIVATE_KEY` = `privateKey` do Step 5
- `VAPID_SUBJECT` = `mailto:leandrorangelferreira@gmail.com`

Sem essas três env vars, `notificar()` (Task 3) grava a notificação no sininho normalmente e só pula o envio do push (comportamento seguro, sem erro).

- [ ] **Step 7: Commit do `package-lock.json`**

`npm install` não passa pelo hook (só Write/Edit disparam), então esse arquivo fica pendente:

```bash
git add package-lock.json
git commit -m "Adiciona package-lock.json da dependencia web-push"
git push
```

---

### Task 3: `api/_lib/push.js` — helper `notificar()`

**Files:**
- Create: `api/_lib/push.js`
- Test: `tests/push.test.js`

**Interfaces:**
- Consumes: `sbJson(path, opts)` de `api/_lib/supabase.js` (já existe — `{ok, status, json, text}`); `web-push` (Task 2).
- Produces: `notificar(usuarios: string[], tipo: string, titulo: string, corpo: string|null, url: string|null): Promise<void>`, exportado de `api/_lib/push.js`. Usado pelo Task 6 (`api/pedidos-vendas/[acao].js`).

- [ ] **Step 1: Escrever os testes (falhando)**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const webpush = require('web-push');

const { notificar } = require('../api/_lib/push');

test('notificar() with no destinatarios makes no requests', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let called = false;
  global.fetch = async () => { called = true; return { ok: true, text: async () => '[]' }; };
  await notificar([], 'pedido_criado', 'Titulo', 'Corpo', '/x');
  assert.equal(called, false);
});

test('notificar() inserts one row per usuario and skips push when VAPID is not configured', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url: String(url), body: opts && opts.body ? JSON.parse(opts.body) : null });
    return { ok: true, text: async () => '[]' };
  };
  await notificar(['admin', 'vagner'], 'prazo_solicitado', 'Prazo especial pedido', 'Cliente X quer 60 dias', '/vendas');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/notificacoes$/);
  assert.deepEqual(calls[0].body, [
    { usuario: 'admin', tipo: 'prazo_solicitado', titulo: 'Prazo especial pedido', corpo: 'Cliente X quer 60 dias', url: '/vendas' },
    { usuario: 'vagner', tipo: 'prazo_solicitado', titulo: 'Prazo especial pedido', corpo: 'Cliente X quer 60 dias', url: '/vendas' },
  ]);
});

test('notificar() queries push_subscriptions and sends nothing when there are none', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const keys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, text: async () => '[]' };
  };
  await notificar(['fabiano'], 'pedido_criado', 'Novo pedido', 'Cliente Y', '/vendas');
  assert.equal(calls.length, 2);
  assert.match(calls[1], /\/rest\/v1\/push_subscriptions\?usuario=in\.\("fabiano"\)/);
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/push.test.js`
Expected: FAIL — `Cannot find module '../api/_lib/push'`.

- [ ] **Step 3: Implementar**

```js
const webpush = require('web-push');
const { sbJson } = require('./supabase');

function ensureVapid() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

async function notificar(usuarios, tipo, titulo, corpo, url) {
  const lista = [...new Set((usuarios || []).filter(Boolean))];
  if (!lista.length) return;

  const rows = lista.map((usuario) => ({ usuario, tipo, titulo, corpo: corpo || null, url: url || null }));
  await sbJson('/rest/v1/notificacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });

  if (!ensureVapid()) return;

  const filtro = lista.map((u) => `"${u.replace(/"/g, '\\"')}"`).join(',');
  const subsR = await sbJson(`/rest/v1/push_subscriptions?usuario=in.(${filtro})&select=id,endpoint,p256dh,auth`, {
    method: 'GET', headers: { 'Content-Type': 'application/json' },
  });
  const subs = subsR.ok && Array.isArray(subsR.json) ? subsR.json : [];
  const payload = JSON.stringify({ title: titulo, body: corpo || '', url: url || '/' });

  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
    } catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        await sbJson(`/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(sub.id)}`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }));
}

module.exports = { notificar };
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test tests/push.test.js`
Expected: PASS — `pass 3`, `fail 0`.

- [ ] **Step 5: Commit**

Já commitado pelo hook após o Write do Step 3 (e do Step 1). Confirme com `git log -3 --oneline`.

---

### Task 4: `api/push/[acao].js` — vapid-public-key / subscribe / unsubscribe

**Files:**
- Create: `api/push/[acao].js`
- Test: `tests/push-endpoint.test.js`

**Interfaces:**
- Consumes: `getSession(req)` de `api/_lib/auth.js`; `sbJson` de `api/_lib/supabase.js`.
- Produces: rotas `GET /api/push/vapid-public-key`, `POST /api/push/subscribe`, `POST /api/push/unsubscribe`. Consumidas pelo Task 8 (frontend).

- [ ] **Step 1: Escrever os testes (falhando)**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const auth = require('../api/_lib/auth');
mock.method(auth, 'getSession', () => ({ user: 'admin', isAdmin: true }));

const handler = require('../api/push/[acao]');

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

test('GET vapid-public-key returns the configured key', async () => {
  process.env.VAPID_PUBLIC_KEY = 'fake-public-key';
  const res = mockRes();
  await handler({ method: 'GET', query: { acao: 'vapid-public-key' }, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { publicKey: 'fake-public-key' });
  delete process.env.VAPID_PUBLIC_KEY;
});

test('POST subscribe stores the endpoint under the session user', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let sentUrl = null, sentBody = null;
  global.fetch = async (url, opts) => { sentUrl = String(url); sentBody = JSON.parse(opts.body); return { ok: true, text: async () => '' }; };
  const res = mockRes();
  await handler({ method: 'POST', query: { acao: 'subscribe' }, headers: {}, body: { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(sentUrl, /on_conflict=endpoint/);
  assert.equal(sentBody.usuario, 'admin');
  assert.equal(sentBody.endpoint, 'https://push.example/abc');
});

test('POST subscribe rejects a malformed body', async () => {
  const res = mockRes();
  await handler({ method: 'POST', query: { acao: 'subscribe' }, headers: {}, body: { endpoint: 'https://push.example/abc' } }, res);
  assert.equal(res.statusCode, 400);
});

test('POST unsubscribe deletes only the session user own subscription', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let sentUrl = null;
  global.fetch = async (url) => { sentUrl = String(url); return { ok: true, text: async () => '' }; };
  const res = mockRes();
  await handler({ method: 'POST', query: { acao: 'unsubscribe' }, headers: {}, body: { endpoint: 'https://push.example/abc' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(sentUrl, /usuario=eq\.admin/);
  assert.match(sentUrl, /endpoint=eq\.https%3A%2F%2Fpush\.example%2Fabc/);
});

test('unknown acao returns 404', async () => {
  const res = mockRes();
  await handler({ method: 'GET', query: { acao: 'nope' }, headers: {} }, res);
  assert.equal(res.statusCode, 404);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/push-endpoint.test.js`
Expected: FAIL — `Cannot find module '../api/push/[acao]'`.

- [ ] **Step 3: Implementar**

```js
const { getSession } = require('../_lib/auth');
const { sbJson } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  const acao = req.query.acao;

  if (req.method === 'GET' && acao === 'vapid-public-key') {
    return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
  }

  if (req.method === 'POST' && acao === 'subscribe') {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) return res.status(400).json({ error: 'missing_fields' });
    const r = await sbJson('/rest/v1/push_subscriptions?on_conflict=endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ usuario: session.user, endpoint, p256dh: keys.p256dh, auth: keys.auth }),
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  }

  if (req.method === 'POST' && acao === 'unsubscribe') {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'missing_fields' });
    const r = await sbJson(`/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&usuario=eq.${encodeURIComponent(session.user)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  }

  return res.status(404).json({ error: 'unknown_acao' });
};
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test tests/push-endpoint.test.js`
Expected: PASS — `pass 5`, `fail 0`.

- [ ] **Step 5: Commit**

Já commitado pelo hook. Confirme com `git log -3 --oneline`.

---

### Task 5: `api/notificacoes.js` — listar e marcar como lida

**Files:**
- Create: `api/notificacoes.js`
- Test: `tests/notificacoes-endpoint.test.js`

**Interfaces:**
- Consumes: `getSession(req)`, `sbJson`.
- Produces: `GET /api/notificacoes` → `{lista, naoLidas}`; `POST /api/notificacoes` (body `{id}` ou `{todas:true}`) → `{ok}`. Consumido pelo Task 9 (frontend).

- [ ] **Step 1: Escrever os testes (falhando)**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const auth = require('../api/_lib/auth');
mock.method(auth, 'getSession', () => ({ user: 'Marcio Vit' }));

const handler = require('../api/notificacoes');

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

test('GET returns the list and unread count for the session user', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let sentUrl = null;
  global.fetch = async (url) => {
    sentUrl = String(url);
    return { ok: true, text: async () => JSON.stringify([{ id: '1', lida: false }, { id: '2', lida: true }]) };
  };
  const res = mockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.naoLidas, 1);
  assert.equal(res.body.lista.length, 2);
  assert.match(sentUrl, /usuario=eq\.Marcio(%20|\+)Vit/);
});

test('POST with id marks only that notification as read, scoped to the session user', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let sentUrl = null;
  global.fetch = async (url) => { sentUrl = String(url); return { ok: true, text: async () => '' }; };
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: { id: 'notif-1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(sentUrl, /id=eq\.notif-1/);
  assert.match(sentUrl, /usuario=eq\.Marcio(%20|\+)Vit/);
});

test('POST with todas marks every unread notification as read', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  let sentUrl = null;
  global.fetch = async (url) => { sentUrl = String(url); return { ok: true, text: async () => '' }; };
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: { todas: true } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(sentUrl, /lida=eq\.false/);
});

test('POST without id or todas returns 400', async () => {
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 400);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/notificacoes-endpoint.test.js`
Expected: FAIL — `Cannot find module '../api/notificacoes'`.

- [ ] **Step 3: Implementar**

```js
const { getSession } = require('./_lib/auth');
const { sbJson } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  if (req.method === 'GET') {
    const r = await sbJson(`/rest/v1/notificacoes?usuario=eq.${encodeURIComponent(session.user)}&order=created_at.desc&limit=30`, {
      method: 'GET', headers: { 'Content-Type': 'application/json' },
    });
    const lista = r.ok && Array.isArray(r.json) ? r.json : [];
    const naoLidas = lista.filter((n) => !n.lida).length;
    return res.status(200).json({ lista, naoLidas });
  }

  if (req.method === 'POST') {
    const { id, todas } = req.body || {};
    if (todas) {
      const r = await sbJson(`/rest/v1/notificacoes?usuario=eq.${encodeURIComponent(session.user)}&lida=eq.false`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ lida: true }),
      });
      return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
    }
    if (!id) return res.status(400).json({ error: 'missing_fields' });
    const r = await sbJson(`/rest/v1/notificacoes?id=eq.${encodeURIComponent(id)}&usuario=eq.${encodeURIComponent(session.user)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ lida: true }),
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
};
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test tests/notificacoes-endpoint.test.js`
Expected: PASS — `pass 4`, `fail 0`.

- [ ] **Step 5: Commit**

Já commitado pelo hook. Confirme com `git log -3 --oneline`.

---

### Task 6: Disparar `notificar()` nos 5 eventos de `api/pedidos-vendas/[acao].js`

**Files:**
- Modify: `api/pedidos-vendas/[acao].js`
- Test: `tests/pedidos-vendas-notificacoes.test.js`

**Interfaces:**
- Consumes: `notificar(usuarios, tipo, titulo, corpo, url)` de `api/_lib/push.js` (Task 3).

- [ ] **Step 1: Escrever os testes (falhando)**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const auth = require('../api/_lib/auth');
mock.method(auth, 'getSession', (req) => req.__session);

const push = require('../api/_lib/push');
const notificarCalls = [];
mock.method(push, 'notificar', async (...args) => { notificarCalls.push(args); });

const handler = require('../api/pedidos-vendas/[acao]');

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

function req(session, acao, body) {
  return { method: 'POST', query: { acao }, headers: {}, body, __session: session };
}

test.beforeEach(() => {
  notificarCalls.length = 0;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

test('creating a new pedido notifies fabiano and admin', async () => {
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify([{ id: 'ped-1' }]) });
  const body = { ped: { cliente_nome: 'Cliente Teste', coordenador: 'Marcio Vit' }, itens: [] };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'salvar', body), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'pedido_criado');
  assert.ok(call, 'esperava notificar pedido_criado');
  assert.deepEqual(call[0].slice().sort(), ['admin', 'fabiano']);
});

test('creating a pedido with prazo pendente also notifies admin, vagner and diretoria', async () => {
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify([{ id: 'ped-2' }]) });
  const body = { ped: { cliente_nome: 'Cliente Teste', prazo_status: 'pendente', prazo_solicitado_dias: 60 }, itens: [] };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'salvar', body), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'prazo_solicitado');
  assert.ok(call);
  assert.deepEqual(call[0].slice().sort(), ['admin', 'diretoria', 'vagner']);
});

test('editing a pedido into prazo pendente also notifies admin, vagner and diretoria', async () => {
  global.fetch = async () => ({ ok: true, text: async () => '' });
  const body = { id: 'ped-3', ped: { cliente_nome: 'Cliente Edit', prazo_status: 'pendente', prazo_solicitado_dias: 45 }, itens: [] };
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'salvar', body), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'prazo_solicitado');
  assert.ok(call);
});

test('prazo-decidir notifies whoever requested it', async () => {
  global.fetch = async (url, opts) => {
    if (opts.method === 'GET') {
      return { ok: true, text: async () => JSON.stringify([{ prazo_status: 'pendente', prazo_solicitado_dias: 45, prazo_solicitado_por: 'Marcio Vit', cliente_nome: 'Cliente Prazo' }]) };
    }
    return { ok: true, text: async () => '' };
  };
  const res = mockRes();
  await handler(req({ user: 'vagner' }, 'prazo-decidir', { id: 'ped-6', aprovar: true }), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'prazo_decidido');
  assert.ok(call);
  assert.deepEqual(call[0], ['Marcio Vit']);
});

test('faturar completo notifies the pedido coordenador', async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('select=prazo_status')) return { ok: true, text: async () => JSON.stringify([{ prazo_status: null }]) };
    if (u.includes('select=coordenador,cliente_nome')) return { ok: true, text: async () => JSON.stringify([{ coordenador: 'Marcio Vit', cliente_nome: 'Cliente Fat' }]) };
    return { ok: true, text: async () => '' };
  };
  const body = { id: 'ped-4', itensRows: [], pedidoPatch: { status: 'faturado' } };
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'faturar', body), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'pedido_faturado');
  assert.ok(call);
  assert.deepEqual(call[0], ['Marcio Vit']);
});

test('faturar parcial does not notify pedido_faturado', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('select=prazo_status')) return { ok: true, text: async () => JSON.stringify([{ prazo_status: null }]) };
    return { ok: true, text: async () => '' };
  };
  const body = { id: 'ped-5', itensRows: [], pedidoPatch: { status: 'pedido' } };
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'faturar', body), res);
  assert.equal(res.statusCode, 200);
  assert.equal(notificarCalls.find((c) => c[1] === 'pedido_faturado'), undefined);
});

test('gnre-manage marking enviada notifies the coordenador', async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('select=prazo_status')) return { ok: true, text: async () => JSON.stringify([{ prazo_status: null }]) };
    if (u.includes('select=coordenador,cliente_nome')) return { ok: true, text: async () => JSON.stringify([{ coordenador: 'Rosana', cliente_nome: 'Cliente GNRE' }]) };
    return { ok: true, text: async () => '' };
  };
  const body = { id: 'ped-7', payload: { gnre_status: 'enviada', gnre_enviado_at: '2026-07-29T00:00:00.000Z' } };
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'gnre-manage', body), res);
  assert.equal(res.statusCode, 200);
  const call = notificarCalls.find((c) => c[1] === 'gnre');
  assert.ok(call);
  assert.deepEqual(call[0], ['Rosana']);
});

test('gnre-manage marking calculada (valor informado) does not notify', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('select=prazo_status')) return { ok: true, text: async () => JSON.stringify([{ prazo_status: null }]) };
    return { ok: true, text: async () => '' };
  };
  const body = { id: 'ped-8', payload: { gnre_status: 'calculada', gnre_valor: 120.5 } };
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'gnre-manage', body), res);
  assert.equal(res.statusCode, 200);
  assert.equal(notificarCalls.find((c) => c[1] === 'gnre'), undefined);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/pedidos-vendas-notificacoes.test.js`
Expected: FAIL — vários testes falham porque `notificarCalls` fica vazio (nada chama `notificar` ainda).

- [ ] **Step 3: Implementar — import**

Em `api/pedidos-vendas/[acao].js`, adicionar ao bloco de imports (linha 6-22):

```js
const { getSession } = require('../_lib/auth');
const { sbJson } = require('../_lib/supabase');
const { notificar } = require('../_lib/push');
const {
  isAdminLiteral,
  isFabiano,
  podeEditarPedidoVenda,
  podeEditarPedidoVendaProprio,
  podeCriarPedidoVenda,
  podeFaturar,
  podeGerenciarGnre,
  podeAnexarGnre,
  podeComentarPedido,
  vePrivilegiado,
  pedidoPertenceASessao,
  prazoLiberado,
  podeDecidirPrazo,
} = require('../_lib/authz');
```

- [ ] **Step 4: Implementar — `salvar()`, branch de edição**

Depois de `if (!r.ok) return res.status(502).json({ error: 'patch_pedido_failed' });` (dentro do bloco `if (id) {...}`), adicionar:

```js
    if (pedPatch.prazo_status === 'pendente') {
      await notificar(['admin', 'vagner', 'diretoria'], 'prazo_solicitado', 'Prazo especial solicitado',
        `${ped.cliente_nome || 'Pedido'} · ${pedPatch.prazo_solicitado_dias || '?'} dias`, '/vendas').catch(() => {});
    }
```

- [ ] **Step 5: Implementar — `salvar()`, branch de criação**

Depois do bloco `if (!insR.ok) {...}` (criação, antes de `let forecastConvertido = false;`), adicionar:

```js
  await notificar(['fabiano', 'admin'], 'pedido_criado', 'Novo pedido criado',
    `${pedBody.cliente_nome || 'Cliente'} · ${pedBody.coordenador || session.user}`, '/vendas').catch(() => {});
  if (pedBody.prazo_status === 'pendente') {
    await notificar(['admin', 'vagner', 'diretoria'], 'prazo_solicitado', 'Prazo especial solicitado',
      `${pedBody.cliente_nome || 'Pedido'} · ${pedBody.prazo_solicitado_dias || '?'} dias`, '/vendas').catch(() => {});
  }
```

- [ ] **Step 6: Implementar — `faturar()`**

Substituir o final da função (a partir de `const patch = { ...pedidoPatch, faturado_por: session.user };`):

```js
  const patch = { ...pedidoPatch, faturado_por: session.user };
  const r2 = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(patch) });
  if (r2.ok && (patch.status === 'faturado' || patch.status === 'entregue')) {
    const infoR = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}&select=coordenador,cliente_nome`, { method: 'GET', headers: JSON_HEADERS });
    if (infoR.ok && Array.isArray(infoR.json) && infoR.json[0]) {
      await notificar([infoR.json[0].coordenador], 'pedido_faturado', 'Pedido faturado', infoR.json[0].cliente_nome || 'Pedido', '/vendas').catch(() => {});
    }
  }
  return res.status(200).json({ ok: true, pedidoOk: r2.ok });
```

- [ ] **Step 7: Implementar — `gnreManage()`**

Substituir o final da função (a partir de `const r = await sbJson(\`/rest/v1/pedidos_vendas?id=eq...\`)`):

```js
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(safePayload) });
  if (r.ok && ['enviada', 'paga', 'isenta'].includes(safePayload.gnre_status)) {
    const infoR = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}&select=coordenador,cliente_nome`, { method: 'GET', headers: JSON_HEADERS });
    if (infoR.ok && Array.isArray(infoR.json) && infoR.json[0]) {
      const labels = { enviada: 'GNRE enviada', paga: 'GNRE paga', isenta: 'GNRE isenta' };
      await notificar([infoR.json[0].coordenador], 'gnre', labels[safePayload.gnre_status], infoR.json[0].cliente_nome || 'Pedido', '/vendas').catch(() => {});
    }
  }
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
```

- [ ] **Step 8: Implementar — `prazoDecidir()`**

Trocar o `select` do GET inicial e adicionar a notificação antes do `return` final:

```js
async function prazoDecidir(session, body, res) {
  if (!podeDecidirPrazo(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, aprovar } = body;
  if (!id || typeof aprovar !== 'boolean') return res.status(400).json({ error: 'missing_fields' });
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}&select=prazo_status,prazo_solicitado_dias,prazo_solicitado_por,cliente_nome`, { method: 'GET', headers: JSON_HEADERS });
  if (!r.ok || !Array.isArray(r.json) || !r.json[0]) return res.status(404).json({ error: 'not_found' });
  if (r.json[0].prazo_status !== 'pendente') return res.status(409).json({ error: 'not_pending' });
  const agora = new Date().toISOString();
  const payload = aprovar
    ? { prazo_status: 'aprovado', prazo_tipo: 'parcelado', parcela_1_dias: r.json[0].prazo_solicitado_dias, parcela_2_dias: null, parcela_3_dias: null, prazo_decidido_por: session.user, prazo_decidido_em: agora }
    : { prazo_status: 'rejeitado', prazo_tipo: 'avista', parcela_1_dias: null, parcela_2_dias: null, parcela_3_dias: null, prazo_decidido_por: session.user, prazo_decidido_em: agora };
  const r2 = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(payload) });
  if (r2.ok && r.json[0].prazo_solicitado_por) {
    const titulo = aprovar ? 'Prazo especial aprovado' : 'Prazo especial rejeitado';
    await notificar([r.json[0].prazo_solicitado_por], 'prazo_decidido', titulo,
      `${r.json[0].cliente_nome || 'Pedido'} · ${r.json[0].prazo_solicitado_dias || '?'} dias`, '/vendas').catch(() => {});
  }
  return res.status(r2.ok ? 200 : 502).json({ ok: r2.ok });
}
```

- [ ] **Step 9: Rodar e confirmar que passa**

Run: `node --test tests/pedidos-vendas-notificacoes.test.js`
Expected: PASS — `pass 8`, `fail 0`.

- [ ] **Step 10: Commit**

Já commitado pelo hook. Confirme com `git log -3 --oneline`.

---

### Task 7: `sw.js` — Service Worker

**Files:**
- Create: `sw.js`
- Test: `tests/sw.test.js`

**Interfaces:**
- Produces: arquivo estático `/sw.js` na raiz do site, registrado pelo Task 8.

- [ ] **Step 1: Escrever o teste (falhando)**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('sw.js exists at the site root', () => {
  assert.ok(fs.existsSync('sw.js'));
});

test('sw.js handles push and notificationclick', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(sw, /addEventListener\('push'/);
  assert.match(sw, /addEventListener\('notificationclick'/);
  assert.match(sw, /showNotification/);
  assert.match(sw, /clients\.openWindow|\.focus\(\)/);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/sw.test.js`
Expected: FAIL — `sw.js` não existe.

- [ ] **Step 3: Implementar**

```js
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || 'Follow-up Positivação';
  const options = { body: data.body || '', data: { url: data.url || '/' } };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test tests/sw.test.js`
Expected: PASS — `pass 2`, `fail 0`.

- [ ] **Step 5: Commit**

Já commitado pelo hook. Confirme com `git log -3 --oneline`.

---

### Task 8: Frontend — opt-in de push + registro do Service Worker

**Files:**
- Modify: `index.html`
- Test: `tests/push-frontend.test.js`

**Interfaces:**
- Consumes: `GET /api/push/vapid-public-key`, `POST /api/push/subscribe` (Task 4); `sw.js` (Task 7); função global `aplicarSessao(sessao)` já existente (linha ~1802).
- Produces: `initPush()` global, chamada a partir de `aplicarSessao`.

- [ ] **Step 1: Escrever o teste (falhando)**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('aplicarSessao triggers push opt-in after establishing the session', () => {
  const start = html.indexOf('function aplicarSessao');
  const fn = html.slice(start, start + 400);
  assert.match(fn, /initPush\(\)/);
});

test('initPush registers the service worker and subscribes through /api/push', () => {
  assert.match(html, /function initPush\(\)/);
  assert.match(html, /navigator\.serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(html, /\/api\/push\/vapid-public-key/);
  assert.match(html, /\/api\/push\/subscribe/);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/push-frontend.test.js`
Expected: FAIL — `initPush` não existe ainda.

- [ ] **Step 3: Implementar — hook em `aplicarSessao`**

Trocar (por volta da linha 1802):

```js
function aplicarSessao(sessao){
  user=sessao.user;isAdmin=sessao.isAdmin;isDiretoria=sessao.isDiretoria;
  coordAtual=sessao.coordAtual;cliCoordAtual=sessao.cliCoordAtual;
}
```

por:

```js
function aplicarSessao(sessao){
  user=sessao.user;isAdmin=sessao.isAdmin;isDiretoria=sessao.isDiretoria;
  coordAtual=sessao.coordAtual;cliCoordAtual=sessao.cliCoordAtual;
  initPush();
}
```

- [ ] **Step 4: Implementar — `initPush()` e o helper de conversão de chave**

Adicionar logo depois da função `aplicarSessao` no `<script>` final do `index.html`:

```js
function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData=atob(base64);
  const outputArray=new Uint8Array(rawData.length);
  for(let i=0;i<rawData.length;i++)outputArray[i]=rawData.charCodeAt(i);
  return outputArray;
}
async function initPush(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window))return;
  if(localStorage.getItem('push_decidido'))return;
  if(!confirm('Ativar notificações do navegador? Você recebe avisos de prazo, faturamento e GNRE mesmo com o app fechado.')){
    localStorage.setItem('push_decidido','1');
    return;
  }
  try{
    const reg=await navigator.serviceWorker.register('/sw.js');
    const keyResp=await fetch('/api/push/vapid-public-key',{credentials:'same-origin'});
    const {publicKey}=await keyResp.json();
    if(!publicKey){localStorage.setItem('push_decidido','1');return}
    const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(publicKey)});
    const json=sub.toJSON();
    await fetch('/api/push/subscribe',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:json.endpoint,keys:json.keys})});
    localStorage.setItem('push_decidido','1');
  }catch(e){
    localStorage.setItem('push_decidido','1');
  }
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `node --test tests/push-frontend.test.js`
Expected: PASS — `pass 2`, `fail 0`.

- [ ] **Step 6: Commit**

Já commitado pelo hook. Confirme com `git log -3 --oneline`.

---

### Task 9: Frontend — sininho no topbar

**Files:**
- Modify: `index.html`
- Test: `tests/sino-notificacoes.test.js`

**Interfaces:**
- Consumes: `GET /api/notificacoes`, `POST /api/notificacoes` (Task 5); `irVendas()` já existente; `aplicarSessao(sessao)` (já modificada no Task 8).
- Produces: elementos `#sino-badge`/`#sino-dropdown` no topbar; funções globais `carregarNotificacoes()`, `sinoToggle()`, `sinoClicarNotif(id)`, `iniciarPollNotificacoes()`.

- [ ] **Step 1: Escrever o teste (falhando)**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('topbar has a sino element with unread badge and dropdown', () => {
  assert.match(html, /id="sino-badge"/);
  assert.match(html, /id="sino-dropdown"/);
  assert.match(html, /onclick="sinoToggle\(\)"/);
});

test('sino polls /api/notificacoes and marks read on click', () => {
  assert.match(html, /function carregarNotificacoes\(\)/);
  assert.match(html, /fetch\('\/api\/notificacoes'/);
  assert.match(html, /function sinoClicarNotif\(id\)/);
  assert.match(html, /setInterval\(carregarNotificacoes,\s*60000\)/);
});

test('aplicarSessao starts the notification poll', () => {
  const start = html.indexOf('function aplicarSessao');
  const fn = html.slice(start, start + 400);
  assert.match(fn, /iniciarPollNotificacoes\(\)/);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/sino-notificacoes.test.js`
Expected: FAIL — nenhum desses elementos/funções existe ainda.

- [ ] **Step 3: Implementar — markup no topbar**

Trocar (por volta da linha 848-852):

```html
  <header class="topbar">
    <button class="menu-toggle" onclick="toggleMenu()" aria-label="Abrir menu">Menu</button>
    <div class="topbar-title" id="topbar-title">Visão geral</div>
    <div class="topbar-period"><span>Período</span><select id="shell-mes" onchange="setMesGlobal(this.value)"></select></div>
  </header>
```

por:

```html
  <header class="topbar">
    <button class="menu-toggle" onclick="toggleMenu()" aria-label="Abrir menu">Menu</button>
    <div class="topbar-title" id="topbar-title">Visão geral</div>
    <div class="topbar-period"><span>Período</span><select id="shell-mes" onchange="setMesGlobal(this.value)"></select></div>
    <div class="topbar-sino">
      <button class="sino-btn" onclick="sinoToggle()" aria-label="Notificações">🔔<span class="sino-badge" id="sino-badge" style="display:none">0</span></button>
      <div class="sino-dropdown" id="sino-dropdown" style="display:none"></div>
    </div>
  </header>
```

- [ ] **Step 4: Implementar — CSS**

Adicionar no `<style>` do `<head>`, perto das regras `.topbar*` (linha ~220):

```css
.topbar-sino{position:relative}
.sino-btn{position:relative;width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:var(--card);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
.sino-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:var(--r-pill);background:var(--red);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center}
.sino-dropdown{position:absolute;top:46px;right:0;width:320px;max-height:60vh;overflow-y:auto;background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:0 12px 32px rgba(0,0,0,.14);z-index:80}
.sino-item{display:block;width:100%;text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);background:none;border-left:none;border-right:none;border-top:none;cursor:pointer;font-size:12.5px;color:var(--ink)}
.sino-item:last-child{border-bottom:0}
.sino-item.nao-lida{background:var(--soft);font-weight:700}
.sino-vazio{padding:20px 14px;color:var(--muted);font-size:12.5px;text-align:center}
```

- [ ] **Step 5: Implementar — JS**

Adicionar no `<script>` final, perto de `initPush()` (Task 8):

```js
let sinoNotifs=[];
let sinoPollStarted=false;
function iniciarPollNotificacoes(){
  if(sinoPollStarted)return;
  sinoPollStarted=true;
  carregarNotificacoes();
  setInterval(carregarNotificacoes,60000);
}
async function carregarNotificacoes(){
  const r=await fetch('/api/notificacoes',{credentials:'same-origin'});
  if(!r.ok)return;
  const {lista,naoLidas}=await r.json();
  sinoNotifs=Array.isArray(lista)?lista:[];
  const badge=g('sino-badge');
  if(naoLidas>0){badge.style.display='flex';badge.textContent=naoLidas>9?'9+':String(naoLidas);}
  else badge.style.display='none';
  sinoRenderDropdown();
}
function sinoRenderDropdown(){
  const el=g('sino-dropdown');
  if(!sinoNotifs.length){el.innerHTML='<div class="sino-vazio">Sem notificações</div>';return}
  el.innerHTML=sinoNotifs.map(n=>
    '<button class="sino-item'+(n.lida?'':' nao-lida')+'" onclick="sinoClicarNotif(\''+n.id+'\')">'+
    '<div>'+vdEsc(n.titulo)+'</div>'+
    (n.corpo?'<div style="color:var(--muted);font-weight:400;margin-top:2px">'+vdEsc(n.corpo)+'</div>':'')+
    '</button>'
  ).join('');
}
function sinoToggle(){
  const el=g('sino-dropdown');
  const abrindo=el.style.display==='none';
  el.style.display=abrindo?'block':'none';
  if(abrindo)carregarNotificacoes();
}
async function sinoClicarNotif(id){
  g('sino-dropdown').style.display='none';
  await fetch('/api/notificacoes',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
  carregarNotificacoes();
  irVendas();
}
```

- [ ] **Step 6: Implementar — hook em `aplicarSessao`**

Trocar (já modificada no Task 8):

```js
function aplicarSessao(sessao){
  user=sessao.user;isAdmin=sessao.isAdmin;isDiretoria=sessao.isDiretoria;
  coordAtual=sessao.coordAtual;cliCoordAtual=sessao.cliCoordAtual;
  initPush();
}
```

por:

```js
function aplicarSessao(sessao){
  user=sessao.user;isAdmin=sessao.isAdmin;isDiretoria=sessao.isDiretoria;
  coordAtual=sessao.coordAtual;cliCoordAtual=sessao.cliCoordAtual;
  initPush();
  iniciarPollNotificacoes();
}
```

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `node --test tests/sino-notificacoes.test.js`
Expected: PASS — `pass 3`, `fail 0`.

- [ ] **Step 8: Rodar todos os testes novos do plano juntos**

Run: `node --test tests/push.test.js tests/push-endpoint.test.js tests/notificacoes-endpoint.test.js tests/pedidos-vendas-notificacoes.test.js tests/sw.test.js tests/push-frontend.test.js tests/sino-notificacoes.test.js`
Expected: PASS — `pass 27`, `fail 0` (3+5+4+8+2+2+3).

- [ ] **Step 9: Commit**

Já commitado pelo hook. Confirme com `git log -5 --oneline`.

---

## Verificação manual final (fora do escopo dos testes automatizados)

`node:test` cobre a lógica; o fluxo de ponta a ponta (permissão do navegador, push real chegando, clique abrindo a aba) só dá pra confirmar rodando o app de verdade:

1. `vercel dev` local (ou o deploy de preview da Vercel) com as env vars `VAPID_*` configuradas (Task 2, Step 6).
2. Logar com dois perfis diferentes em duas abas/navegadores (ex: coordenador `Marcio Vit` numa aba, `admin` noutra).
3. Aceitar o prompt de notificação em ambas.
4. Como `Marcio Vit`: criar um pedido com "Solicitar prazo maior" → a aba do `admin` deve receber a notificação do SO (mesmo minimizada) e o sininho deve contar +1.
5. Como `admin`: abrir o sininho, clicar na notificação → deve marcar como lida, o contador zera, e a tela vai pra Vendas.
6. Como `admin`: aprovar o prazo → a aba do `Marcio Vit` deve receber a notificação.
