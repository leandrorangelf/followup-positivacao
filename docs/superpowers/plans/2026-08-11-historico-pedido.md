# Histórico de ações por pedido (Vendas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar, na ficha de um pedido em Vendas, o histórico cronológico de ações (quem, o quê, quando) e um badge "Editado por X (Nx)" com contador de edições.

**Architecture:** Reaproveita a tabela `audit_log` já existente (hoje só visível na tela admin `s-log`), adicionando uma coluna `pedido_id` para vincular cada linha de log ao pedido que originou a ação. O endpoint `api/audit.js` passa a aceitar um filtro `pedido_id` liberado para qualquer sessão dona do pedido (não só admin), e o frontend passa a mandar esse `pedido_id` em toda chamada de log ligada a `pedidos_vendas`, além de buscar e renderizar o histórico ao abrir a ficha do pedido.

**Tech Stack:** Node.js (Vercel Functions, sem framework), Supabase REST (PostgREST), frontend vanilla JS em `index.html`, testes com `node:test`/`node:assert/strict` nativo (sem framework externo).

## Global Constraints

- Sem tabela nova — reaproveita `audit_log` (ver spec `docs/superpowers/specs/2026-08-11-historico-pedido-design.md`).
- Escopo só na tela `s-vendas`/`s-vficha`; `s-ped` (legada) e `s-log` (tela admin) não mudam de comportamento.
- Migração de schema é um arquivo `.sql` solto aplicado manualmente no Supabase (padrão do repo) — não há migration runner.
- Rodar cada teste pelo caminho exato: `node --test tests/<arquivo>.test.js` (`node --test tests/` sem arquivo quebra nesse ambiente).
- O hook do projeto já faz commit+push automático a cada `Write`/`Edit` — toda alteração já sobe pro remoto.

---

### Task 1: Coluna `pedido_id` em `audit_log` + `api/audit.js` aceita e filtra por ela

**Files:**
- Create: `supabase-audit-pedido-id.sql`
- Modify: `api/audit.js`
- Test: `tests/audit-pedido-id.test.js`

**Interfaces:**
- Consumes: `getSession(req)` de `api/_lib/auth.js`; `sbJson(path, opts)` de `api/_lib/supabase.js`; `isAdminLiteral(session)`, `isDiretoria(session)`, `pedidoPertenceASessao(session, pedidoId)` de `api/_lib/authz.js` (todas já existem).
- Produces: `POST /api/audit` aceita `pedido_id` (string ou `null`) no body e grava na linha. `GET /api/audit?pedido_id=eq.<id>` retorna as linhas daquele pedido para qualquer sessão autenticada cujo `pedidoPertenceASessao` retorne `true`; sem `pedido_id` na query, mantém o comportamento atual (só admin/diretoria, log geral).

- [ ] **Step 1: Criar o arquivo de migração SQL**

```sql
alter table audit_log add column if not exists pedido_id uuid;
create index if not exists idx_audit_log_pedido_id on audit_log(pedido_id);
```

Salvar em `supabase-audit-pedido-id.sql` na raiz do repo (mesmo padrão de `supabase-comentario-vagner.sql` e `supabase-editado-por-coord.sql`, que também são scripts soltos aplicados manualmente no SQL Editor do Supabase).

- [ ] **Step 2: Escrever os testes (falhando) para `api/audit.js`**

Criar `tests/audit-pedido-id.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const auth = require('../api/_lib/auth');
mock.method(auth, 'getSession', (req) => req.__session);

const authz = require('../api/_lib/authz');

const handler = require('../api/audit');

function mockRes() {
  const res = { statusCode: 200, body: null, sent: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.send = (t) => { res.sent = t; return res; };
  return res;
}

function req(session, method, url, body) {
  return { method, url, headers: {}, body, __session: session };
}

test.beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

test('POST /api/audit grava pedido_id quando informado', async () => {
  let capturedBody = null;
  global.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, text: async () => '' };
  };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'POST', '/api/audit', {
    acao: 'editar', descricao: 'Pedido editado', detalhes: null, pedido_id: 'ped-123',
  }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(capturedBody.pedido_id, 'ped-123');
});

test('POST /api/audit grava pedido_id null quando omitido', async () => {
  let capturedBody = null;
  global.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, text: async () => '' };
  };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'POST', '/api/audit', {
    acao: 'criar', descricao: 'Novo pedido',
  }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(capturedBody.pedido_id, null);
});

test('GET com pedido_id permite coordenador dono do pedido', async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/rest/v1/pedidos_vendas')) {
      return { ok: true, text: async () => JSON.stringify([{ coordenador: 'Marcio Vit' }]) };
    }
    return { ok: true, text: async () => JSON.stringify([{ id: 1, acao: 'editar' }]) };
  };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'GET', '/api/audit?pedido_id=eq.ped-123', undefined), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.sent, /"acao":"editar"/);
});

test('GET com pedido_id bloqueia coordenador que nao e dono do pedido', async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/rest/v1/pedidos_vendas')) {
      return { ok: true, text: async () => JSON.stringify([{ coordenador: 'Igor Cater' }]) };
    }
    return { ok: true, text: async () => JSON.stringify([]) };
  };
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'GET', '/api/audit?pedido_id=eq.ped-123', undefined), res);
  assert.equal(res.statusCode, 403);
});

test('GET sem pedido_id continua exigindo admin/diretoria', async () => {
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify([]) });
  const res = mockRes();
  await handler(req({ user: 'Marcio Vit' }, 'GET', '/api/audit', undefined), res);
  assert.equal(res.statusCode, 403);
});

test('GET sem pedido_id libera admin (comportamento atual preservado)', async () => {
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify([]) });
  const res = mockRes();
  await handler(req({ user: 'admin' }, 'GET', '/api/audit', undefined), res);
  assert.equal(res.statusCode, 200);
});
```

- [ ] **Step 3: Rodar os testes e confirmar que falham**

Run: `node --test tests/audit-pedido-id.test.js`
Expected: FAIL — `pedido_id` ainda não é gravado no POST, e o GET com `pedido_id` ainda cai na regra antiga (403 pra coordenador mesmo sendo dono, ou não usa `pedidoPertenceASessao`).

- [ ] **Step 4: Atualizar `api/audit.js`**

Substituir o conteúdo do arquivo por:

```js
const { getSession } = require('./_lib/auth');
const { sbJson } = require('./_lib/supabase');
const { isAdminLiteral, isDiretoria, pedidoPertenceASessao } = require('./_lib/authz');

module.exports = async function handler(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_authenticated' });

  if (req.method === 'GET') {
    const reqUrl = new URL(req.url, 'http://internal');
    const params = reqUrl.searchParams;
    const pedidoIdParam = params.get('pedido_id');
    if (pedidoIdParam) {
      const pedidoId = pedidoIdParam.startsWith('eq.') ? pedidoIdParam.slice(3) : pedidoIdParam;
      if (!(await pedidoPertenceASessao(session, pedidoId))) return res.status(403).json({ error: 'forbidden' });
    } else if (!isAdminLiteral(session) && !isDiretoria(session)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!params.has('order')) params.set('order', 'criado_em.desc');
    if (!params.has('limit')) params.set('limit', '200');
    const r = await sbJson(`/rest/v1/audit_log?${params.toString()}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    res.status(r.status);
    return res.send(r.text);
  }

  if (req.method === 'POST') {
    // Diretoria nunca gera linha de auditoria (preserva o comportamento atual).
    if (isDiretoria(session)) return res.status(200).json({ ok: true, skipped: true });
    const { acao, descricao, detalhes, pedido_id } = req.body || {};
    if (!acao || !descricao) return res.status(400).json({ error: 'missing_fields' });
    const row = { acao, descricao, detalhes: detalhes || null, pedido_id: pedido_id || null, usuario: session.user };
    const r = await sbJson('/rest/v1/audit_log', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row),
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
};
```

- [ ] **Step 5: Rodar os testes de novo e confirmar que passam**

Run: `node --test tests/audit-pedido-id.test.js`
Expected: PASS (6 testes)

- [ ] **Step 6: Commit**

```bash
git add supabase-audit-pedido-id.sql api/audit.js tests/audit-pedido-id.test.js
git commit -m "feat: liga audit_log a pedidos_vendas via pedido_id"
```

---

### Task 2: Frontend passa `pedido_id` em toda chamada de log ligada a um pedido de venda

**Files:**
- Modify: `index.html` (todas as chamadas `auditLog(...)` ligadas a `pedidos_vendas`, listadas abaixo)
- Test: `tests/audit-pedido-id-frontend.test.js`

**Interfaces:**
- Consumes: `auditLog(acao, descricao, detalhes, pedidoId)` — assinatura atual é `auditLog(acao, descricao, detalhes)`.
- Produces: `auditLog` aceita um 4º parâmetro opcional `pedidoId` e o envia como `pedido_id` no body do POST para `/api/audit` (endpoint já atualizado na Task 1).

- [ ] **Step 1: Escrever o teste (falhando) — assinatura de `auditLog` e cada call site**

Criar `tests/audit-pedido-id-frontend.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('auditLog aceita pedidoId e manda pedido_id no body', () => {
  const start = html.indexOf('async function auditLog(');
  const fn = html.slice(start, start + 500);
  assert.match(fn, /async function auditLog\(acao, descricao, detalhes, pedidoId\)/);
  assert.match(fn, /pedido_id\s*:\s*pedidoId\s*\|\|\s*null/);
});

test('criar/editar pedido loga com pedidoId', () => {
  const start = html.indexOf("auditLog(acao,\n      (acao==='criar'");
  assert.ok(start !== -1, 'call site de criar/editar pedido não encontrado');
  const call = html.slice(start, start + 250);
  assert.match(call, /,\s*pedidoId\s*\)/);
});

test('comentário loga com pedido_id do pedido', () => {
  assert.match(html, /auditLog\('editar','Comentario do '\+autor\+' · '\+p\.cliente_nome,txt\|\|'Comentario removido',p\.id\)/);
});

test('faturar loga com pedido_id do pedido', () => {
  const start = html.indexOf("auditLog('faturar',");
  const call = html.slice(start, start + 200);
  assert.match(call, /,\s*p\.id\s*\)/);
});

test('reverter faturamento loga com pedido_id', () => {
  assert.match(html, /auditLog\('reverter_faturamento','Reversão de faturamento · '\+p\.cliente_nome,'Coordenador: '\+p\.coordenador\+' · '\+x\.faturadoCx\+' cx revertidas para pendente',p\.id\)/);
});

test('anexar GNRE loga com pedido_id', () => {
  const start = html.indexOf("auditLog('editar',(tipo==='gnre'");
  const call = html.slice(start, start + 200);
  assert.match(call, /,\s*id\s*\)/);
});

test('atualizar GNRE loga com pedido_id', () => {
  assert.match(html, /auditLog\('editar','GNRE atualizada · '\+p\.cliente_nome,'Status: '\+\(payload\.gnre_status\|\|vdGnreStatus\(p\)\)\+\(payload\.gnre_valor!=null\?' · Valor: '\+vdFmt\(payload\.gnre_valor\):''\),id\)/);
});

test('excluir pedido (ficha aberta) loga com pedido_id', () => {
  assert.match(html, /auditLog\('excluir','Pedido excluído · '\+vdDetAtual\.cliente_nome,'id:'\+vdDetAtual\.id\+.*,vdDetAtual\.id\)/);
});

test('excluir pedido (lista) loga com pedido_id', () => {
  const start = html.indexOf('async function vdExcluirPedidoPorId');
  const fn = html.slice(start, start + 700);
  assert.match(fn, /auditLog\('excluir','Pedido excluído · '\+p\.cliente_nome,'id:'\+id\+.*,id\)/);
});

test('restaurar pedido loga com pedido_id', () => {
  assert.match(html, /auditLog\('editar','Pedido restaurado','id:'\+id,id\)/);
});

test('decisão de prazo agora gera log com pedido_id', () => {
  const start = html.indexOf('async function vdDecidirPrazo');
  const fn = html.slice(start, start + 500);
  assert.match(fn, /auditLog\('editar'/);
  assert.match(fn, /,\s*id\s*\)/);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `node --test tests/audit-pedido-id-frontend.test.js`
Expected: FAIL em todos — nenhuma call site ainda manda `pedidoId`/`pedido_id`, e `vdDecidirPrazo` não chama `auditLog`.

- [ ] **Step 3: Atualizar a assinatura de `auditLog`**

Em `index.html`, localizar (por volta da linha 4640):

```js
async function auditLog(acao, descricao, detalhes){
  // Log é paralelo: nunca pode impedir a ação principal do sistema.
  if(!user||isDiretoria)return;
  const acaoSegura=['criar','editar','excluir','faturar'].includes(acao)?acao:'criar';
  try{
    await fetch('/api/audit',{
      method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({acao:acaoSegura,descricao,detalhes:detalhes||null})
    });
  }catch(e){console.warn('Log não registrado:',e);}
}
```

Substituir por:

```js
async function auditLog(acao, descricao, detalhes, pedidoId){
  // Log é paralelo: nunca pode impedir a ação principal do sistema.
  if(!user||isDiretoria)return;
  const acaoSegura=['criar','editar','excluir','faturar'].includes(acao)?acao:'criar';
  try{
    await fetch('/api/audit',{
      method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({acao:acaoSegura,descricao,detalhes:detalhes||null,pedido_id:pedidoId||null})
    });
  }catch(e){console.warn('Log não registrado:',e);}
}
```

- [ ] **Step 4: Atualizar cada call site ligado a `pedidos_vendas`**

Em `vdSalvarPedido` (por volta da linha 3834), trocar:

```js
    auditLog(acao,
      (acao==='criar'?'Novo pedido criado':'Pedido editado')+' · '+cliNome,
      'Coordenador: '+coordAtual+' · SKUs: '+itens.map(i=>vdSkuLabel(i.sku)+' '+i.qty_caixas+'cx').join(', ')+' · '+totalCxLog+' cx'
    );
```

por:

```js
    auditLog(acao,
      (acao==='criar'?'Novo pedido criado':'Pedido editado')+' · '+cliNome,
      'Coordenador: '+coordAtual+' · SKUs: '+itens.map(i=>vdSkuLabel(i.sku)+' '+i.qty_caixas+'cx').join(', ')+' · '+totalCxLog+' cx',
      pedidoId
    );
```

Em `vdSalvarComentario` (por volta da linha 4033), trocar:

```js
    auditLog('editar','Comentario do '+autor+' · '+p.cliente_nome,txt||'Comentario removido');
```

por:

```js
    auditLog('editar','Comentario do '+autor+' · '+p.cliente_nome,txt||'Comentario removido',p.id);
```

Em `vdSalvarFaturamento` (por volta da linha 4105), trocar:

```js
    auditLog('faturar',
      (completo?'Faturamento completo':'Faturamento parcial')+' · '+p.cliente_nome,
      'Coordenador: '+p.coordenador+' · '+totalAgora+' cx faturadas agora · saldo restante: '+Math.max(0,x.saldoCx-totalAgora)+' cx'
    );
```

por:

```js
    auditLog('faturar',
      (completo?'Faturamento completo':'Faturamento parcial')+' · '+p.cliente_nome,
      'Coordenador: '+p.coordenador+' · '+totalAgora+' cx faturadas agora · saldo restante: '+Math.max(0,x.saldoCx-totalAgora)+' cx',
      p.id
    );
```

Em `vdReverterFaturamento` (por volta da linha 4136), trocar:

```js
    auditLog('reverter_faturamento','Reversão de faturamento · '+p.cliente_nome,'Coordenador: '+p.coordenador+' · '+x.faturadoCx+' cx revertidas para pendente');
```

por:

```js
    auditLog('reverter_faturamento','Reversão de faturamento · '+p.cliente_nome,'Coordenador: '+p.coordenador+' · '+x.faturadoCx+' cx revertidas para pendente',p.id);
```

Em `vdSalvarUploadGnre` (por volta da linha 4175), trocar:

```js
  auditLog('editar',(tipo==='gnre'?'GNRE anexada':'Comprovante GNRE anexado')+' · '+p.cliente_nome,'Usuário: '+user+' · Arquivo: '+file.name);
```

por:

```js
  auditLog('editar',(tipo==='gnre'?'GNRE anexada':'Comprovante GNRE anexado')+' · '+p.cliente_nome,'Usuário: '+user+' · Arquivo: '+file.name,id);
```

Em `vdAtualizarGnre` (por volta da linha 4187), trocar:

```js
  auditLog('editar','GNRE atualizada · '+p.cliente_nome,'Status: '+(payload.gnre_status||vdGnreStatus(p))+(payload.gnre_valor!=null?' · Valor: '+vdFmt(payload.gnre_valor):''));
```

por:

```js
  auditLog('editar','GNRE atualizada · '+p.cliente_nome,'Status: '+(payload.gnre_status||vdGnreStatus(p))+(payload.gnre_valor!=null?' · Valor: '+vdFmt(payload.gnre_valor):''),id);
```

Em `vdExcluirPedido` (por volta da linha 4247), trocar:

```js
  auditLog('excluir','Pedido excluído · '+vdDetAtual.cliente_nome,'id:'+vdDetAtual.id+' · Coordenador: '+vdDetAtual.coordenador+' · '+MESES[vdDetAtual.mes]+'/'+vdDetAtual.ano+' · '+(vdDetAtual.total_caixas||0)+' cx');
```

por:

```js
  auditLog('excluir','Pedido excluído · '+vdDetAtual.cliente_nome,'id:'+vdDetAtual.id+' · Coordenador: '+vdDetAtual.coordenador+' · '+MESES[vdDetAtual.mes]+'/'+vdDetAtual.ano+' · '+(vdDetAtual.total_caixas||0)+' cx',vdDetAtual.id);
```

Em `vdExcluirPedidoPorId` (por volta da linha 4265), trocar:

```js
  auditLog('excluir','Pedido excluído · '+p.cliente_nome,'id:'+id+' · Coordenador: '+p.coordenador+' · '+MESES[p.mes]+'/'+p.ano+' · '+(p.total_caixas||0)+' cx');
```

por:

```js
  auditLog('excluir','Pedido excluído · '+p.cliente_nome,'id:'+id+' · Coordenador: '+p.coordenador+' · '+MESES[p.mes]+'/'+p.ano+' · '+(p.total_caixas||0)+' cx',id);
```

Em `logRestaurarPedido` (por volta da linha 4751), trocar:

```js
  auditLog('editar','Pedido restaurado','id:'+id);
```

por:

```js
  auditLog('editar','Pedido restaurado','id:'+id,id);
```

- [ ] **Step 5: Adicionar log de decisão de prazo em `vdDecidirPrazo` (não existia)**

Em `index.html` (por volta da linha 4215), trocar:

```js
async function vdDecidirPrazo(id,aprovar){
  const resp=await fetch('/api/pedidos-vendas/prazo-decidir',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,aprovar})});
  const j=await resp.json().catch(()=>({}));
  if(!resp.ok||!j.ok){toast('Erro ao decidir prazo','error');return}
  toast(aprovar?'Prazo aprovado':'Prazo rejeitado — pedido volta pra à vista','ok');
  vdFecharDet();await vdCarregar();
}
```

por:

```js
async function vdDecidirPrazo(id,aprovar){
  const p=vdPedidos.find(x=>x.id===id);
  const resp=await fetch('/api/pedidos-vendas/prazo-decidir',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,aprovar})});
  const j=await resp.json().catch(()=>({}));
  if(!resp.ok||!j.ok){toast('Erro ao decidir prazo','error');return}
  toast(aprovar?'Prazo aprovado':'Prazo rejeitado — pedido volta pra à vista','ok');
  auditLog('editar',(aprovar?'Prazo aprovado':'Prazo rejeitado')+(p?' · '+p.cliente_nome:''),'Decidido por '+user,id);
  vdFecharDet();await vdCarregar();
}
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `node --test tests/audit-pedido-id-frontend.test.js`
Expected: PASS (11 testes)

- [ ] **Step 7: Commit**

```bash
git add index.html tests/audit-pedido-id-frontend.test.js
git commit -m "feat: chamadas de log de pedidos_vendas passam a informar pedido_id"
```

---

### Task 3: Ficha do pedido mostra o histórico e o badge "Editado por X (Nx)"

**Files:**
- Modify: `index.html` (`vdAbrirDet`, nova função `vdCarregarHistoricoPedido`)
- Test: `tests/historico-pedido-ui.test.js`

**Interfaces:**
- Consumes: `sb(path, opts)` (helper existente, linha ~1572); `nomeUsuarioLog(u)` (existente, linha ~4636); `vdEsc(s)` (helper de escape existente); `g(id)` (helper `document.getElementById`, existente); `GET /api/audit?pedido_id=eq.<id>` (endpoint atualizado na Task 1).
- Produces: `vdCarregarHistoricoPedido(id)` — busca o histórico do pedido e injeta HTML em `#vd-det-historico`, e atualiza `#vd-det-badge-editado`. Chamada a partir de `vdAbrirDet`.

- [ ] **Step 1: Escrever o teste (falhando)**

Criar `tests/historico-pedido-ui.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('ficha do pedido tem um placeholder de histórico com id fixo', () => {
  assert.match(html, /id="vd-det-historico"/);
});

test('badge de editado tem id fixo pra ser atualizado depois do fetch', () => {
  assert.match(html, /id="vd-det-badge-editado"/);
});

test('vdAbrirDet chama vdCarregarHistoricoPedido com o id do pedido', () => {
  const start = html.indexOf('function vdAbrirDet(id){');
  const fn = html.slice(start, start + 8000);
  assert.match(fn, /vdCarregarHistoricoPedido\(p\.id\)/);
});

test('vdCarregarHistoricoPedido busca /api/audit filtrado por pedido_id', () => {
  const start = html.indexOf('async function vdCarregarHistoricoPedido');
  assert.ok(start !== -1, 'vdCarregarHistoricoPedido não encontrada');
  const fn = html.slice(start, start + 1500);
  assert.match(fn, /\/api\/audit\?pedido_id=eq\./);
  assert.match(fn, /nEdits/);
  assert.match(fn, /vd-det-historico/);
  assert.match(fn, /vd-det-badge-editado/);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `node --test tests/historico-pedido-ui.test.js`
Expected: FAIL — nenhum dos ids/funções existe ainda.

- [ ] **Step 3: Dar um id fixo ao badge de "Editado por"**

Em `vdAbrirDet`, localizar (por volta da linha 3901):

```js
      (p.editado_por?'<span class="vd-badge" style="background:var(--purple-soft);color:var(--purple)">Editado por '+vdEsc(p.editado_por)+'</span>':'')+
```

Trocar por:

```js
      '<span id="vd-det-badge-editado" class="vd-badge" style="background:var(--purple-soft);color:var(--purple);display:none">Editado por '+vdEsc(p.editado_por||'')+'</span>'+
```

(o badge começa oculto — `vdCarregarHistoricoPedido` decide se mostra, já com o contador, depois que o histórico chega).

- [ ] **Step 4: Adicionar o placeholder de histórico no final da ficha**

Na mesma função `vdAbrirDet`, localizar (por volta da linha 3921):

```js
    vdComentariosPedidoHTML(p)+
    (p.faturamento_observacao?'<div style="font-size:12px;color:var(--amber);margin-top:8px;padding:8px;background:#FFFBEB;border-radius:var(--r-sm)"><strong>Faturamento:</strong> '+vdEsc(p.faturamento_observacao)+'</div>':'');
```

Trocar por:

```js
    vdComentariosPedidoHTML(p)+
    (p.faturamento_observacao?'<div style="font-size:12px;color:var(--amber);margin-top:8px;padding:8px;background:#FFFBEB;border-radius:var(--r-sm)"><strong>Faturamento:</strong> '+vdEsc(p.faturamento_observacao)+'</div>':'')+
    '<div id="vd-det-historico" style="margin-top:14px"></div>';
```

- [ ] **Step 5: Chamar `vdCarregarHistoricoPedido` ao abrir a ficha**

Ainda em `vdAbrirDet`, logo antes de `g('modal-vd-det').classList.add('open');` (por volta da linha 3931), adicionar:

```js
  vdCarregarHistoricoPedido(p.id);
  g('modal-vd-det').classList.add('open');
```

(chamada sem `await` — `vdAbrirDet` não é `async` e a ficha já abre antes do histórico terminar de carregar, igual o resto da ficha já funciona hoje com outros dados assíncronos).

- [ ] **Step 6: Implementar `vdCarregarHistoricoPedido`**

Logo depois do fechamento de `vdAbrirDet` (por volta da linha 3932, antes de `function vdFecharDet(){...}`), adicionar:

```js
async function vdCarregarHistoricoPedido(id){
  const el=g('vd-det-historico');
  if(!el)return;
  el.innerHTML='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px">Histórico</div><div style="font-size:12px;color:var(--muted)">Carregando...</div>';
  const data=await sb('/api/audit?pedido_id=eq.'+encodeURIComponent(id)+'&order=criado_em.desc&limit=100',{ret:true});
  if(!vdDetAtual||vdDetAtual.id!==id)return;
  const lista=Array.isArray(data)?data:[];
  const badge=g('vd-det-badge-editado');
  if(badge){
    const nEdits=lista.filter(r=>r.acao==='editar').length;
    if(vdDetAtual.editado_por&&nEdits>0){
      badge.textContent='Editado por '+vdDetAtual.editado_por+' ('+nEdits+'x)';
      badge.style.display='inline-flex';
    }else{
      badge.style.display='none';
    }
  }
  if(!lista.length){
    el.innerHTML='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px">Histórico</div><div class="log-empty" style="padding:16px 0">Nenhum evento registrado.</div>';
    return;
  }
  const iconMap={criar:'➕',editar:'✏️',excluir:'🗑️',faturar:'💰'};
  el.innerHTML='<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px">Histórico</div>'+
    lista.map(r=>{
      const dt=new Date(r.criado_em);
      const dataFmt=dt.toLocaleDateString('pt-BR')+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      const icon=iconMap[r.acao]||'📝';
      return '<div class="log-item"><div class="log-icon '+r.acao+'">'+icon+'</div><div class="log-body"><div class="log-title">'+vdEsc(r.descricao||'—')+'</div>'+(r.detalhes?'<div class="log-detail">'+vdEsc(r.detalhes)+'</div>':'')+'</div><div class="log-meta"><span class="log-user">'+vdEsc(nomeUsuarioLog(r.usuario))+'</span><br>'+dataFmt+'</div></div>';
    }).join('');
}
```

- [ ] **Step 7: Rodar o teste e confirmar que passa**

Run: `node --test tests/historico-pedido-ui.test.js`
Expected: PASS (4 testes)

- [ ] **Step 8: Rodar a suíte inteira de testes pra garantir que nada quebrou**

Run cada arquivo em `tests/` individualmente (o runner deste ambiente não aceita o diretório inteiro de uma vez):

```bash
for f in tests/*.test.js; do node --test "$f" || break; done
```

Expected: todos os arquivos terminam com `pass` e `fail 0`.

- [ ] **Step 9: Testar manualmente no navegador**

1. Rodar `vercel dev` (ou o servidor local configurado) e logar como um coordenador.
2. Abrir Vendas, criar um pedido novo, editar, faturar parcialmente e anexar/atualizar GNRE.
3. Reabrir a ficha do pedido: confirmar que a seção "Histórico" no final mostra as ações na ordem certa, com ícone, descrição, quem fez e quando.
4. Confirmar que o badge mostra "Editado por <nome> (Nx)" com o N batendo com a quantidade de vezes que o pedido foi editado.
5. Logar como outro coordenador e confirmar que a ficha de um pedido que não é dele não aparece na lista (comportamento de escopo já existente) — não há como testar o 403 do histórico direto pela UI, mas confirma que não há erro no console ao abrir pedidos próprios.
6. Logar como admin e abrir a tela `s-log`: confirmar que continua mostrando o log geral normalmente (nada quebrou).

- [ ] **Step 10: Commit**

```bash
git add index.html tests/historico-pedido-ui.test.js
git commit -m "feat: mostra histórico de ações e contador de edições na ficha do pedido"
```

---

## Depois de terminar

Lembrar o usuário de rodar o `supabase-audit-pedido-id.sql` no SQL Editor do Supabase (Task 1, Step 1) — sem isso, `pedido_id` não existe na tabela e o `POST`/`GET` de `/api/audit` vão falhar em produção mesmo com o código certo.
