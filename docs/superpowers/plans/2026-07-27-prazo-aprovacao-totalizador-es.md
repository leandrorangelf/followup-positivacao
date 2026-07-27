# Prazo com Aprovação + Totalizador ES Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o prazo livre do pedido de venda por três opções (À vista / 28-35 / Solicitar prazo maior com aprovação do Renan), travar faturamento e GNRE enquanto pendente, e adicionar um painel de totalizador de caixas por produto para o estoque de ES.

**Architecture:** Duas features independentes no mesmo módulo de Vendas. Feature 1 toca banco (colunas novas em `pedidos_vendas`), backend (`api/_lib/authz.js`, `api/pedidos-vendas/[acao].js`) e frontend (`index.html`). Feature 2 é 100% client-side, derivada de dados já carregados.

**Tech Stack:** Vanilla JS (frontend, sem build), Node.js sem dependências (Vercel Functions), Supabase/Postgres via REST (`sbJson`), SQL manual no Supabase SQL Editor.

## Global Constraints

- Não existe framework de testes neste repo (frontend é HTML+JS servido direto, sem build; backend são Vercel Functions sem dependências). Substituímos "rodar teste automatizado" por: `node --check` nos arquivos `.js` do backend (verifica só sintaxe) e verificação manual guiada no app pra tudo que é `index.html`.
- **Não criar commits manuais.** O hook do projeto (`.claude/settings.json`) já faz `git add + commit + push` automático a cada `Write`/`Edit`. Passos de "commit" foram omitidos de propósito — cada edição já sobe pro remoto sozinha.
- Mudança de schema é aplicada manualmente no SQL Editor do Supabase (não há migrations versionadas rodando via CI). O SQL fica commitado no repo só como registro, igual `supabase-comentario-vagner.sql`.
- Nunca reintroduzir chave do Supabase no client; toda escrita passa pelos endpoints em `api/`.
- Spec de referência: `docs/superpowers/specs/2026-07-27-prazo-e-totalizador-es-design.md`.

---

### Task 1: Migração SQL das colunas de prazo

**Files:**
- Create: `supabase-prazo-aprovacao.sql`

**Interfaces:**
- Produces: colunas `prazo_status`, `prazo_solicitado_dias`, `prazo_solicitado_por`, `prazo_solicitado_em`, `prazo_decidido_por`, `prazo_decidido_em` na tabela `public.pedidos_vendas`, usadas por todas as tasks seguintes.

- [ ] **Step 1: Criar o arquivo SQL**

```sql
alter table public.pedidos_vendas
add column if not exists prazo_status text,
add column if not exists prazo_solicitado_dias integer,
add column if not exists prazo_solicitado_por text,
add column if not exists prazo_solicitado_em timestamptz,
add column if not exists prazo_decidido_por text,
add column if not exists prazo_decidido_em timestamptz;
```

- [ ] **Step 2: Aplicar manualmente no SQL Editor do Supabase**

Abrir o projeto `rpxrjawzkkpnzancmcif` no Supabase, colar o conteúdo de `supabase-prazo-aprovacao.sql` no SQL Editor e rodar.

- [ ] **Step 3: Verificar**

Rodar no SQL Editor: `select column_name from information_schema.columns where table_name='pedidos_vendas' and column_name like 'prazo_%';`
Esperado: 6 linhas — `prazo_status`, `prazo_solicitado_dias`, `prazo_solicitado_por`, `prazo_solicitado_em`, `prazo_decidido_por`, `prazo_decidido_em`.

---

### Task 2: `prazoLiberado()` em authz.js

**Files:**
- Modify: `api/_lib/authz.js`

**Interfaces:**
- Consumes: `sbJson(path, opts)` de `./supabase` (já importado no topo do arquivo).
- Produces: `async function prazoLiberado(pedidoId): Promise<boolean>` — `false` só quando `prazo_status==='pendente'`. Usada nas Tasks 3 (`faturar`, `gnre-attach`, `gnre-manage`).

- [ ] **Step 1: Adicionar a função**

Depois da função `pedidoPertenceASessao` (que termina em `}` antes do comentário `// Tabelas de acesso simples`), adicionar:

```js
// Bloqueia faturar/GNRE enquanto o pedido tem uma solicitação de prazo maior
// aguardando decisão do Renan (login diretoria) — evita que o Fabiano avance
// o fluxo com um prazo ainda não autorizado.
async function prazoLiberado(pedidoId) {
  if (!pedidoId) return true;
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(pedidoId)}&select=prazo_status`, {
    method: 'GET', headers: { 'Content-Type': 'application/json' },
  });
  if (!r.ok || !Array.isArray(r.json) || !r.json[0]) return true;
  return r.json[0].prazo_status !== 'pendente';
}
```

- [ ] **Step 2: Exportar**

No `module.exports` do mesmo arquivo, adicionar `prazoLiberado,` na lista (ex.: logo após `pedidoPertenceASessao,`).

- [ ] **Step 3: Verificar sintaxe**

Run: `node --check api/_lib/authz.js`
Expected: sem output (sucesso).

---

### Task 3: Ações de prazo em `api/pedidos-vendas/[acao].js`

**Files:**
- Modify: `api/pedidos-vendas/[acao].js`

**Interfaces:**
- Consumes: `prazoLiberado(pedidoId)` e `isDiretoria(session)` de `../_lib/authz` (adicionar aos imports existentes).
- Produces: nova ação `prazo-decidir` (usada pelo frontend na Task 5); `faturar`/`gnre-attach`/`gnre-manage` agora podem responder `409 { error: 'prazo_pendente' }`.

- [ ] **Step 1: Atualizar o import no topo do arquivo**

Trocar:
```js
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
} = require('../_lib/authz');
```
Por:
```js
const {
  isAdminLiteral,
  isFabiano,
  isDiretoria,
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
} = require('../_lib/authz');
```

- [ ] **Step 2: Registrar a nova ação no switch**

Trocar:
```js
    case 'status': return status(session, body, res);
    case 'rename-cliente': return renameCliente(session, body, res);
    default: return res.status(404).json({ error: 'unknown_acao' });
```
Por:
```js
    case 'status': return status(session, body, res);
    case 'rename-cliente': return renameCliente(session, body, res);
    case 'prazo-decidir': return prazoDecidir(session, body, res);
    default: return res.status(404).json({ error: 'unknown_acao' });
```

- [ ] **Step 3: Carimbar `prazo_solicitado_por`/`_em` no `salvar()`**

Trocar (bloco de edição, dentro de `salvar`):
```js
    if (!(await podeEditarPedidoVendaProprio(session, id))) return res.status(403).json({ error: 'forbidden' });
    const pedPatch = isAdminLiteral(session) ? ped : { ...ped, editado_por: session.user, editado_em: new Date().toISOString() };
```
Por:
```js
    if (!(await podeEditarPedidoVendaProprio(session, id))) return res.status(403).json({ error: 'forbidden' });
    let pedPatch = isAdminLiteral(session) ? ped : { ...ped, editado_por: session.user, editado_em: new Date().toISOString() };
    if (pedPatch.prazo_status === 'pendente') {
      pedPatch = { ...pedPatch, prazo_solicitado_por: session.user, prazo_solicitado_em: new Date().toISOString() };
    }
```

Trocar (bloco de criação, dentro de `salvar`):
```js
  const pedBody = { ...ped };
  if (!vePrivilegiado(session)) pedBody.coordenador = session.user; // coordenador só cria pro próprio nome
  pedBody.criado_por = session.user; // nunca confiar no client pra isso
```
Por:
```js
  let pedBody = { ...ped };
  if (!vePrivilegiado(session)) pedBody.coordenador = session.user; // coordenador só cria pro próprio nome
  pedBody.criado_por = session.user; // nunca confiar no client pra isso
  if (pedBody.prazo_status === 'pendente') {
    pedBody = { ...pedBody, prazo_solicitado_por: session.user, prazo_solicitado_em: new Date().toISOString() };
  }
```

- [ ] **Step 4: Travar `faturar` enquanto pendente**

Trocar:
```js
async function faturar(session, body, res) {
  if (!podeFaturar(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, itensRows, pedidoPatch } = body;
  if (!id || !Array.isArray(itensRows) || !pedidoPatch) return res.status(400).json({ error: 'missing_fields' });
```
Por:
```js
async function faturar(session, body, res) {
  if (!podeFaturar(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, itensRows, pedidoPatch } = body;
  if (!id || !Array.isArray(itensRows) || !pedidoPatch) return res.status(400).json({ error: 'missing_fields' });
  if (!(await prazoLiberado(id))) return res.status(409).json({ error: 'prazo_pendente' });
```

- [ ] **Step 5: Travar `gnreAttach` e `gnreManage` enquanto pendente**

Trocar:
```js
async function gnreAttach(session, body, res) {
  if (!podeAnexarGnre(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, tipo, path, fileName, gnrePendente } = body;
  if (!id || !path) return res.status(400).json({ error: 'missing_fields' });
  if (!(await pedidoPertenceASessao(session, id))) return res.status(403).json({ error: 'forbidden' });
```
Por:
```js
async function gnreAttach(session, body, res) {
  if (!podeAnexarGnre(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, tipo, path, fileName, gnrePendente } = body;
  if (!id || !path) return res.status(400).json({ error: 'missing_fields' });
  if (!(await pedidoPertenceASessao(session, id))) return res.status(403).json({ error: 'forbidden' });
  if (!(await prazoLiberado(id))) return res.status(409).json({ error: 'prazo_pendente' });
```

Trocar:
```js
async function gnreManage(session, body, res) {
  if (!podeGerenciarGnre(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, payload } = body;
  if (!id || !payload || typeof payload !== 'object') return res.status(400).json({ error: 'missing_fields' });
```
Por:
```js
async function gnreManage(session, body, res) {
  if (!podeGerenciarGnre(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, payload } = body;
  if (!id || !payload || typeof payload !== 'object') return res.status(400).json({ error: 'missing_fields' });
  if (!(await prazoLiberado(id))) return res.status(409).json({ error: 'prazo_pendente' });
```

- [ ] **Step 6: Adicionar a função `prazoDecidir`**

No final do arquivo, antes de `async function renameCliente`, adicionar:

```js
async function prazoDecidir(session, body, res) {
  if (!isDiretoria(session)) return res.status(403).json({ error: 'forbidden' });
  const { id, aprovar } = body;
  if (!id || typeof aprovar !== 'boolean') return res.status(400).json({ error: 'missing_fields' });
  const r = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}&select=prazo_status,prazo_solicitado_dias`, { method: 'GET', headers: JSON_HEADERS });
  if (!r.ok || !Array.isArray(r.json) || !r.json[0]) return res.status(404).json({ error: 'not_found' });
  if (r.json[0].prazo_status !== 'pendente') return res.status(409).json({ error: 'not_pending' });
  const agora = new Date().toISOString();
  const payload = aprovar
    ? { prazo_status: 'aprovado', prazo_tipo: 'parcelado', parcela_1_dias: r.json[0].prazo_solicitado_dias, parcela_2_dias: null, parcela_3_dias: null, prazo_decidido_por: session.user, prazo_decidido_em: agora }
    : { prazo_status: 'rejeitado', prazo_tipo: 'avista', parcela_1_dias: null, parcela_2_dias: null, parcela_3_dias: null, prazo_decidido_por: session.user, prazo_decidido_em: agora };
  const r2 = await sbJson(`/rest/v1/pedidos_vendas?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: MINIMAL, body: JSON.stringify(payload) });
  return res.status(r2.ok ? 200 : 502).json({ ok: r2.ok });
}
```

- [ ] **Step 7: Verificar sintaxe**

Run: `node --check api/pedidos-vendas/[acao].js`
Expected: sem output (sucesso).

---

### Task 4: Formulário do pedido — três botões de prazo

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `vdForm` (objeto global de estado do formulário), `g(id)` (helper `getElementById`), `toast(msg,type)`.
- Produces: `vdForm.prazo` passa a valer `'avista' | '2835' | 'solicitar' | 'aprovado'`; `vdForm.prazoDias` (string do input, só relevante quando `'solicitar'`); função `vdSetPrazo(p, dias)` (assinatura muda — agora aceita 2º argumento opcional); função `vdPrazoParaForm(p)` nova, usada pelas Tasks 4 e 5.

- [ ] **Step 1: Trocar o HTML do campo Prazo (por volta da linha 1105)**

Trocar:
```html
      <div class="vd-field" style="margin-bottom:0"><label>Prazo</label>
        <div class="vd-toggle-grp">
          <button type="button" class="vd-toggle on" data-pv="avista" onclick="vdSetPrazo('avista')">À vista</button>
          <button type="button" class="vd-toggle" data-pv="parcelado" onclick="vdSetPrazo('parcelado')">Parcelado</button>
        </div>
        <div class="vd-parc" id="vf-parc" style="display:none;margin-top:10px">
          <div class="vd-field" style="margin-bottom:8px"><label>Parcela 1 (dias)</label><input type="number" id="vf-p1" min="0" placeholder="ex 7"></div>
          <div class="vd-field" style="margin-bottom:8px"><label>Parcela 2 (dias) — opcional</label><input type="number" id="vf-p2" min="0"></div>
          <div class="vd-field" style="margin-bottom:0"><label>Parcela 3 (dias) — opcional</label><input type="number" id="vf-p3" min="0"></div>
        </div>
      </div>
```
Por:
```html
      <div class="vd-field" style="margin-bottom:0"><label>Prazo</label>
        <div class="vd-toggle-grp">
          <button type="button" class="vd-toggle on" data-pv="avista" onclick="vdSetPrazo('avista')">À vista</button>
          <button type="button" class="vd-toggle" data-pv="2835" onclick="vdSetPrazo('2835')">28/35</button>
          <button type="button" class="vd-toggle" data-pv="solicitar" onclick="vdSetPrazo('solicitar')">Solicitar prazo maior</button>
        </div>
        <div id="vf-prazo-aprovado-info" style="display:none;margin-top:10px;font-size:12px;color:var(--muted)"></div>
        <div class="vd-parc" id="vf-prazo-solicitar" style="display:none;margin-top:10px">
          <div class="vd-field" style="margin-bottom:0"><label>Dias desejados</label><input type="number" id="vf-prazo-dias" min="1" placeholder="ex 45"></div>
        </div>
      </div>
```

- [ ] **Step 2: Reescrever `vdSetPrazo` (linha ~3500)**

Trocar:
```js
function vdSetPrazo(p){
  vdForm.prazo=p;
  document.querySelectorAll('.vd-toggle[data-pv]').forEach(b=>b.classList.toggle('on',b.dataset.pv===p));
  g('vf-parc').style.display=p==='parcelado'?'block':'none';
}
```
Por:
```js
function vdSetPrazo(p,dias){
  vdForm.prazo=p;
  document.querySelectorAll('.vd-toggle[data-pv]').forEach(b=>b.classList.toggle('on',b.dataset.pv===p));
  g('vf-prazo-solicitar').style.display=p==='solicitar'?'block':'none';
  if(p==='solicitar'&&dias!=null)g('vf-prazo-dias').value=dias;
  const info=g('vf-prazo-aprovado-info');
  if(p==='aprovado'){info.style.display='block';info.textContent='Prazo aprovado atualmente: '+(dias||'?')+' dias · clique em uma opção acima para alterar';}
  else info.style.display='none';
}
function vdPrazoParaForm(p){
  if(!p)return{prazo:'avista',dias:null};
  if(p.prazo_status==='pendente')return{prazo:'solicitar',dias:p.prazo_solicitado_dias};
  if(p.prazo_status==='aprovado')return{prazo:'aprovado',dias:p.parcela_1_dias};
  if((p.prazo_tipo||'avista')==='parcelado')return{prazo:'2835',dias:null};
  return{prazo:'avista',dias:null};
}
```

- [ ] **Step 3: Atualizar `vdPrazoLabel` (linha ~2968) pra refletir pendência**

Trocar:
```js
function vdPrazoLabel(p){
  if((p?.prazo_tipo||'avista')!=='parcelado')return 'À vista';
  const parcelas=[p.parcela_1_dias,p.parcela_2_dias,p.parcela_3_dias].filter(v=>v!==null&&v!==undefined&&String(v)!=='').map(v=>v+'d');
  return parcelas.length?'Parcelado: '+parcelas.join(' / '):'Parcelado';
}
```
Por:
```js
function vdPrazoLabel(p){
  if(p?.prazo_status==='pendente')return 'Solicitado: '+(p.prazo_solicitado_dias||'?')+'d (pendente)';
  if((p?.prazo_tipo||'avista')!=='parcelado')return 'À vista';
  const parcelas=[p.parcela_1_dias,p.parcela_2_dias,p.parcela_3_dias].filter(v=>v!==null&&v!==undefined&&String(v)!=='').map(v=>v+'d');
  return parcelas.length?'Parcelado: '+parcelas.join(' / '):'Parcelado';
}
```

- [ ] **Step 4: Atualizar `vdSalvarPedido` (linha ~3512-3537)**

Trocar:
```js
  if(vdForm.prazo==='parcelado'&&!g('vf-p1').value){toast('Informe dias da parcela 1','error');return}
  const original=vdEditPedidoId?vdPedidos.find(p=>p.id===vdEditPedidoId):null;
  const ped={
    coordenador:coordAtual,cliente_id:cli.id,cliente_nome:cli.nome,cliente_uf:cli.uf||null,
    tipo:vdForm.tipo,prazo_tipo:vdForm.prazo,
    parcela_1_dias:vdForm.prazo==='parcelado'?(parseInt(g('vf-p1').value)||null):null,
    parcela_2_dias:vdForm.prazo==='parcelado'?(parseInt(g('vf-p2').value)||null):null,
    parcela_3_dias:vdForm.prazo==='parcelado'?(parseInt(g('vf-p3').value)||null):null,
    total,total_caixas:totCx,observacao:g('vf-obs').value||null,
    mes:original?original.mes:mesAtual,ano:original?original.ano:anoAtual,
    origem:vdForm.origem||null
  };
```
Por:
```js
  if(vdForm.prazo==='solicitar'&&!g('vf-prazo-dias').value){toast('Informe os dias do prazo solicitado','error');return}
  const original=vdEditPedidoId?vdPedidos.find(p=>p.id===vdEditPedidoId):null;
  const prazoAprovado=vdForm.prazo==='aprovado';
  const ped={
    coordenador:coordAtual,cliente_id:cli.id,cliente_nome:cli.nome,cliente_uf:cli.uf||null,
    tipo:vdForm.tipo,
    prazo_tipo:prazoAprovado?original.prazo_tipo:(vdForm.prazo==='2835'?'parcelado':'avista'),
    parcela_1_dias:prazoAprovado?original.parcela_1_dias:(vdForm.prazo==='2835'?28:null),
    parcela_2_dias:prazoAprovado?original.parcela_2_dias:(vdForm.prazo==='2835'?35:null),
    parcela_3_dias:null,
    prazo_status:prazoAprovado?original.prazo_status:(vdForm.prazo==='solicitar'?'pendente':null),
    prazo_solicitado_dias:prazoAprovado?original.prazo_solicitado_dias:(vdForm.prazo==='solicitar'?(parseInt(g('vf-prazo-dias').value)||null):null),
    total,total_caixas:totCx,observacao:g('vf-obs').value||null,
    mes:original?original.mes:mesAtual,ano:original?original.ano:anoAtual,
    origem:vdForm.origem||null
  };
```

- [ ] **Step 5: Atualizar os 4 pontos que pré-preenchem o form ao abrir um pedido**

Em `vdComplementarPedido` (linha ~3200), trocar:
```js
  vdForm={tipo:p.tipo||'in',prazo:p.prazo_tipo||'avista',skus:{}};
```
Por:
```js
  vdForm={tipo:p.tipo||'in',...vdPrazoParaForm(p),skus:{}};
```
E, mais abaixo na mesma função, trocar:
```js
  vdSetTipo(vdForm.tipo);vdSetPrazo(vdForm.prazo);
  g('vf-p1').value=p.parcela_1_dias||'';g('vf-p2').value=p.parcela_2_dias||'';g('vf-p3').value=p.parcela_3_dias||'';
```
Por:
```js
  vdSetTipo(vdForm.tipo);vdSetPrazo(vdForm.prazo,vdForm.dias);
```

Em `vdEditarPedido` (linha ~3996), trocar:
```js
  vdForm={tipo:p.tipo,prazo:p.prazo_tipo,origem:p.origem||'',skus:{GR:{q:0,v:0},GM:{q:0,v:0},CM:{q:0,v:0},CC:{q:0,v:0},GTWIN:{q:0,v:0},CK:{q:0,v:0}}};
```
Por:
```js
  vdForm={tipo:p.tipo,...vdPrazoParaForm(p),origem:p.origem||'',skus:{GR:{q:0,v:0},GM:{q:0,v:0},CM:{q:0,v:0},CC:{q:0,v:0},GTWIN:{q:0,v:0},CK:{q:0,v:0}}};
```
E trocar:
```js
  vdSetTipo(p.tipo);vdSetPrazo(p.prazo_tipo);
  g('vf-p1').value=p.parcela_1_dias||'';g('vf-p2').value=p.parcela_2_dias||'';g('vf-p3').value=p.parcela_3_dias||'';
```
Por:
```js
  vdSetTipo(p.tipo);vdSetPrazo(vdForm.prazo,vdForm.dias);
```

Na conversão de forecast em pedido (linha ~3446), trocar:
```js
  vdForm={tipo:p.tipo||'in',prazo:'avista',skus:{GR:{q:0,v:0},GM:{q:0,v:0},CM:{q:0,v:0},CC:{q:0,v:0},GTWIN:{q:0,v:0},CK:{q:0,v:0}}};
  const cli=(clientesDB[coordAtual]||[]).find(c=>c.id===p.cliente_id);
  if(cli){
    if(cli.def_tipo)vdForm.tipo=cli.def_tipo;
    if(cli.def_prazo)vdForm.prazo=cli.def_prazo;
    const sk=cli.def_skus||{};
    VD_SKUS.forEach(s=>{vdForm.skus[s].v=parseFloat(sk[s])||0});
  }
```
Por:
```js
  vdForm={tipo:p.tipo||'in',prazo:'avista',dias:null,skus:{GR:{q:0,v:0},GM:{q:0,v:0},CM:{q:0,v:0},CC:{q:0,v:0},GTWIN:{q:0,v:0},CK:{q:0,v:0}}};
  const cli=(clientesDB[coordAtual]||[]).find(c=>c.id===p.cliente_id);
  if(cli){
    if(cli.def_tipo)vdForm.tipo=cli.def_tipo;
    if(cli.def_prazo==='parcelado')vdForm.prazo='2835';
    const sk=cli.def_skus||{};
    VD_SKUS.forEach(s=>{vdForm.skus[s].v=parseFloat(sk[s])||0});
  }
```
E logo abaixo, trocar:
```js
  vdSetTipo(vdForm.tipo);vdSetPrazo(vdForm.prazo);
  if(cli&&cli.def_prazo){g('vf-p1').value=cli.def_p1||'';g('vf-p2').value=cli.def_p2||'';g('vf-p3').value=cli.def_p3||'';}else{g('vf-p1').value='';g('vf-p2').value='';g('vf-p3').value='';}
```
Por:
```js
  vdSetTipo(vdForm.tipo);vdSetPrazo(vdForm.prazo);
```

Em `vdAplicarFicha` (linha ~3475), trocar:
```js
  if(c.def_tipo)vdSetTipo(c.def_tipo);
  if(c.def_prazo){
    vdSetPrazo(c.def_prazo);
    g('vf-p1').value=c.def_p1||'';g('vf-p2').value=c.def_p2||'';g('vf-p3').value=c.def_p3||'';
  }
```
Por:
```js
  if(c.def_tipo)vdSetTipo(c.def_tipo);
  if(c.def_prazo==='parcelado')vdSetPrazo('2835');
```

- [ ] **Step 6: Verificação manual**

Abrir o app no navegador (login admin), ir em Vendas → Novo pedido: confirmar que aparecem só 3 botões de prazo ("À vista", "28/35", "Solicitar prazo maior"), que clicar em "Solicitar prazo maior" mostra o campo "Dias desejados", e que salvar sem preencher esse campo mostra o toast de erro "Informe os dias do prazo solicitado".

---

### Task 5: Lista de pendências + aprovar/rejeitar (Renan/diretoria)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `vdPedidosFiltrados()`, `vdFiltro`, `vd-card-meta` HTML (badges), modal `vd-det-body`/`modal-vd-det`, `isDiretoria` (global bool), `vdCarregar()`.
- Produces: filtro `vdFiltro==='prazo-pendente'`; funções `vdAprovarPrazo(id)`/`vdRejeitarPrazo(id)`.

- [ ] **Step 1: Adicionar o chip de filtro (linha ~1054)**

Trocar:
```html
    <button class="vd-chip" data-f="pendente" onclick="vdSetFiltro('pendente')">Pendentes</button>
```
Por:
```html
    <button class="vd-chip" data-f="pendente" onclick="vdSetFiltro('pendente')">Pendentes</button>
    <button class="vd-chip" data-f="prazo-pendente" onclick="vdSetFiltro('prazo-pendente')">⏳ Aguardando aprovação de prazo</button>
```

- [ ] **Step 2: Tratar o novo filtro em `vdPedidosFiltrados` (linha ~3134-3144)**

Trocar:
```js
  if(vdFiltro==='faturar')return baseFiltrada.filter(p=>vdTipoPedido(p)!=='off'&&vdResumoPedido(p).saldoCx>0&&vdGnreLiberada(p));
  if(vdFiltro==='parcial')return baseFiltrada.filter(vdPedidoFaturadoParcial);
  if(vdFiltro==='pendente')return baseFiltrada.filter(vdPedidoPendente);
  return baseFiltrada;
```
Por:
```js
  if(vdFiltro==='faturar')return baseFiltrada.filter(p=>vdTipoPedido(p)!=='off'&&vdResumoPedido(p).saldoCx>0&&vdGnreLiberada(p));
  if(vdFiltro==='parcial')return baseFiltrada.filter(vdPedidoFaturadoParcial);
  if(vdFiltro==='pendente')return baseFiltrada.filter(vdPedidoPendente);
  if(vdFiltro==='prazo-pendente')return baseFiltrada.filter(p=>p.prazo_status==='pendente');
  return baseFiltrada;
```

- [ ] **Step 3: Badge de prazo pendente no card (linha ~3184-3188)**

Trocar:
```js
      (obsFat?'<span class="vd-badge" style="background:#FEF3C7;color:#92400E">📋 '+vdEsc(obsFat.substring(0,40))+'</span>':'')+
    '</div>'+
```
Por:
```js
      (obsFat?'<span class="vd-badge" style="background:#FEF3C7;color:#92400E">📋 '+vdEsc(obsFat.substring(0,40))+'</span>':'')+
      (p.prazo_status==='pendente'?'<span class="vd-badge" style="background:#FEF9C3;color:#854D0E">⏳ Prazo pendente · '+vdEsc(String(p.prazo_solicitado_dias||'?'))+'d</span>':'')+
    '</div>'+
```

- [ ] **Step 4: Botões Aprovar/Rejeitar no modal de detalhe (dentro de `vdAbrirDet`, linha ~3602-3618)**

Trocar:
```js
  const gnreAcoesHTML=_gnreBtns.length?'<div class="vd-card-actions" style="margin-bottom:10px">'+_gnreBtns.join('')+'</div>':'';
```
Por:
```js
  const _prazoBtns=[];
  if(isDiretoria&&p.prazo_status==='pendente'){
    _prazoBtns.push('<button class="vd-card-action invoice" onclick="event.stopPropagation();vdAprovarPrazo(\''+p.id+'\')">✅ Aprovar prazo ('+vdEsc(String(p.prazo_solicitado_dias||'?'))+'d)</button>');
    _prazoBtns.push('<button class="vd-card-action" onclick="event.stopPropagation();vdRejeitarPrazo(\''+p.id+'\')">✕ Rejeitar prazo</button>');
  }
  const prazoAcoesHTML=_prazoBtns.length?'<div class="vd-card-actions" style="margin-bottom:10px">'+_prazoBtns.join('')+'</div>':'';
  const gnreAcoesHTML=_gnreBtns.length?'<div class="vd-card-actions" style="margin-bottom:10px">'+_gnreBtns.join('')+'</div>':'';
```

Trocar:
```js
    vdAnexosHTML(p)+
    gnreAcoesHTML+
    itensGrid+
```
Por:
```js
    vdAnexosHTML(p)+
    prazoAcoesHTML+
    gnreAcoesHTML+
    itensGrid+
```

- [ ] **Step 5: Funções de aprovar/rejeitar (perto de `vdMoverStatus`, linha ~3948)**

Adicionar antes de `async function vdMoverStatus`:

```js
async function vdDecidirPrazo(id,aprovar){
  const resp=await fetch('/api/pedidos-vendas/prazo-decidir',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,aprovar})});
  const j=await resp.json().catch(()=>({}));
  if(!resp.ok||!j.ok){toast('Erro ao decidir prazo','error');return}
  toast(aprovar?'Prazo aprovado':'Prazo rejeitado — pedido volta pra à vista','ok');
  vdFecharDet();await vdCarregar();
}
async function vdAprovarPrazo(id){await vdDecidirPrazo(id,true)}
async function vdRejeitarPrazo(id){
  if(!confirm('Rejeitar essa solicitação de prazo? O pedido volta pra "À vista".'))return;
  await vdDecidirPrazo(id,false);
}
```

- [ ] **Step 6: Verificação manual**

Login como `diretoria` (Renan): criar (com outro login coordenador) um pedido com "Solicitar prazo maior" = 45 dias, abrir o filtro "⏳ Aguardando aprovação de prazo" em Vendas, confirmar que o pedido aparece com o badge, abrir o detalhe e clicar "Aprovar prazo" — confirmar que o prazo do pedido vira "Parcelado: 45d". Repetir rejeitando outro e confirmar que volta pra "À vista". Login como `fabiano` num pedido ainda pendente e tentar anexar GNRE — confirmar que dá erro (toast) e não deixa prosseguir.

---

### Task 6: Totalizador de estoque ES

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `vdPedidos`, `vdEhDistribuidora(p)`, `vdResumoPedido(p)`, `VD_SKUS`, `vdSkuLabel(s)`, `vdRenderKanban()`.
- Produces: `vdTotalizadorES()`, painel `#vd-totalizador-es` renderizado dentro de `vdRenderKanban`.

- [ ] **Step 1: HTML do painel — adicionar dentro de `s-vendas`, antes do `vd-filter` (linha ~1050)**

Trocar:
```html
  <div class="vd-coord-tabs" id="vd-coord-tabs" style="display:none"></div>
  <div class="vd-filter">
```
Por:
```html
  <div class="vd-coord-tabs" id="vd-coord-tabs" style="display:none"></div>
  <div id="vd-totalizador-es" class="vd-section" style="padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px"></div>
  <div class="vd-filter">
```

- [ ] **Step 2: Cálculo + render (perto de `VD_SKUS`, linha ~2890-2898)**

Trocar:
```js
const VD_SKUS=['GR','GM','CM','CC','GTWIN','CK'];
const VD_SKU_LABELS={GR:'GR',GM:'GM',CM:'CM',CC:'CC',GTWIN:'GTwin',CK:'CK'};
const VD_SKU_FULL={GR:'GUDANG RED',GM:'GUDANG MENTA',CM:'CRETEC MENTA',CC:'CRETEC CEREJA',GTWIN:'GUDANG TWIN TEN',CK:'CLICK'};
```
Por:
```js
const VD_SKUS=['GR','GM','CM','CC','GTWIN','CK'];
const VD_SKU_LABELS={GR:'GR',GM:'GM',CM:'CM',CC:'CC',GTWIN:'GTwin',CK:'CK'};
const VD_SKU_FULL={GR:'GUDANG RED',GM:'GUDANG MENTA',CM:'CRETEC MENTA',CC:'CRETEC CEREJA',GTWIN:'GUDANG TWIN TEN',CK:'CLICK'};
const VD_SKU_COLORS={GR:'#DC2626',GM:'#16A34A',CM:'#16A34A',CC:'#9F1239',GTWIN:'#2563EB',CK:'#6B7280'};
function vdTotalizadorES(){
  const tot={};VD_SKUS.forEach(s=>tot[s]=0);
  vdPedidos.filter(p=>!vdEhDistribuidora(p)&&vdResumoPedido(p).status==='pedido')
    .forEach(p=>(p.pedidos_vendas_itens||[]).forEach(i=>{if(tot[i.sku]!=null)tot[i.sku]+=Number(i.qty_caixas||0);}));
  return tot;
}
function vdRenderTotalizadorES(){
  const el=g('vd-totalizador-es');if(!el)return;
  const tot=vdTotalizadorES();
  el.innerHTML=VD_SKUS.map(s=>
    '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--card)">'+
      '<span style="width:10px;height:10px;border-radius:50%;background:'+VD_SKU_COLORS[s]+';display:inline-block"></span>'+
      '<strong style="font-size:12px">'+vdEsc(vdSkuLabel(s))+'</strong>'+
      '<span style="font-size:12px;color:var(--muted)">'+tot[s]+' cx</span>'+
    '</div>'
  ).join('');
}
```

- [ ] **Step 3: Chamar no fluxo de render existente (dentro de `vdRenderKanban`, linha ~3150)**

Trocar:
```js
function vdRenderKanban(){
  const lista=vdPedidosFiltrados();
```
Por:
```js
function vdRenderKanban(){
  vdRenderTotalizadorES();
  const lista=vdPedidosFiltrados();
```

- [ ] **Step 4: Verificação manual**

Abrir Vendas: confirmar que aparece a faixa de 6 mini-cards (GR/GM/CM/CC/GTwin/CK) com bolinha colorida e total em caixas. Faturar (ou marcar parcial) um pedido de origem Fábrica que tinha caixas de um SKU específico e confirmar que o número daquele SKU no painel cai imediatamente após o recarregamento da lista.

---

## Self-Review

**Cobertura da spec:** Colunas SQL (Task 1) ✓ · `prazoLiberado`/authz (Task 2) ✓ · stamping + travas + `prazo-decidir` no backend (Task 3) ✓ · 3 botões + solicitação (Task 4) ✓ · lista de pendências + aprovar/rejeitar (Task 5) ✓ · toast de erro quando travado (coberto pela verificação manual da Task 5, o erro genérico de `vdMarcarGnrePaga`/`vdAtualizarGnre`/`vdSalvarPedido`/faturamento já exibe "Erro..." — não precisa de tratamento especial pro código 409, o toast genérico já cobre) · Totalizador ES (Task 6) ✓.

**Placeholders:** nenhum "TBD"/"similar to Task N" — todo trecho de código mostrado é completo e no contexto exato onde entra.

**Consistência de tipos:** `vdForm.prazo` usado com os mesmos 4 valores (`'avista'|'2835'|'solicitar'|'aprovado'`) em todas as tasks; `vdPrazoParaForm(p)` retorna sempre `{prazo,dias}` e é consumida do mesmo jeito nos 2 pontos que a usam (Task 4, Step 5).

---

Plano completo e salvo em `docs/superpowers/plans/2026-07-27-prazo-aprovacao-totalizador-es.md`. Duas opções de execução:

**1. Subagent-Driven (recomendado)** — dispatch de um subagent por task, com review entre tasks.

**2. Inline Execution** — executo as tasks nesta sessão mesmo, em lote, com checkpoints.

Qual prefere?
