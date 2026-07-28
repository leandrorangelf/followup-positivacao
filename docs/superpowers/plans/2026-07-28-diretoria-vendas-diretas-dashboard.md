# Diretoria (vendas diretas) + linha expansível no dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que admin/Vagner lancem pedidos de venda com `coordenador='Diretoria'` (fora de `COORD_KEYS`, não conta pra meta/positivação de ninguém, mas soma no volume geral), e trocar o card "Qtd por produto vendido" do Dashboard por uma linha expansível na tabela "Performance por coordenador".

**Architecture:** Mudança 100% em `index.html` (frontend vanilla JS, sem build step). Backend (`api/`) não muda — `podeCriarPedidoVenda`/`vePrivilegiado` já aceitam qualquer `coordenador` vindo do body para sessões admin/Vagner, e `pedidos_vendas.cliente_id` já é nullable no schema (confirmado via SQL: `cliente_id uuid NULL`, `cliente_nome text NOT NULL`).

**Tech Stack:** HTML/CSS/JS puro em `index.html`. Sem framework de teste de frontend no projeto (só `node:test` cobre `api/_lib`, que não muda aqui) — verificação é manual, no app rodando.

## Global Constraints

- Nenhuma mudança em `api/` nem em `COORD_KEYS` (login/metas/carteira continuam intocados).
- "Diretoria" nunca aparece como linha na tabela "Performance por coordenador" nem em `METAS`/`clientesDB`/telas de Clientes/Forecast.
- Só usuários com `isAdmin===true` (cobre `admin` e `vagner`) veem/usam a aba "Diretoria".
- Todo commit segue o padrão do hook do projeto (`.claude/settings.json` já commita e dá push a cada Write/Edit — não é preciso rodar `git commit` manualmente nas tarefas abaixo).
- Sem dependência nova, sem build step novo.

---

### Task 1: Constante `COORD_DIRETORIA` e ajuste de "Número geral" no dashboard

**Files:**
- Modify: `index.html:1506` (bloco de constantes `COORD_KEYS`/`GESTOR_KEYS`)
- Modify: `index.html:2824-2877` (`renderAdminDash`)

**Interfaces:**
- Produces: `const COORD_DIRETORIA='Diretoria'` — usada por todas as tasks seguintes (comparação de string, nunca entra em `COORD_KEYS`).

- [ ] **Step 1: Adicionar a constante**

Em `index.html`, logo abaixo da linha `const COORD_KEYS=['Igor Cater','Marcio Vit','Rosana','Vitor Valle'];` (linha 1506), adicionar:

```js
// Pseudo-coordenador só pra marcar vendas avulsas lançadas por admin/vagner (ex.: acordo
// fechado direto pela diretoria). Fica FORA de COORD_KEYS de propósito — não deve aparecer
// nos ~20 lugares que iteram COORD_KEYS assumindo carteira/meta (mesma lógica de GESTOR_KEYS
// acima, mas sem meta nenhuma).
const COORD_DIRETORIA='Diretoria';
```

- [ ] **Step 2: Somar o volume de "Diretoria" no card "Número geral"**

Em `renderAdminDash` (index.html:2824), a linha atual (2832):

```js
  const volume=rows.reduce((s,r)=>s+r.volume,0);
```

Substituir por:

```js
  const volumeDiretoria=vendasMes.filter(p=>p.coordenador===COORD_DIRETORIA).reduce((s,p)=>s+vdVolumePedidoDash(p),0);
  const volume=rows.reduce((s,r)=>s+r.volume,0)+volumeDiretoria;
```

`vendasMes` (linha 2825) e `vdVolumePedidoDash` (index.html:2492) já existem — nenhuma chamada nova ao Supabase. `meta` continua vindo só de `rows` (COORD_KEYS), então o card "Cumprimento"/`pctMeta` sobe proporcionalmente ao realizado geral, sem mexer no alvo.

- [ ] **Step 3: Verificação manual**

Abrir o app (Vercel), logar como `admin`, ir em Dashboard. Anotar o valor de "Número geral". Depois de completar a Task 3 (que permite lançar um pedido como "Diretoria"), voltar aqui e confirmar que lançar um pedido de N caixas como Diretoria aumenta "Número geral" em N caixas, sem alterar a linha de nenhum coordenador na tabela "Performance por coordenador".

---

### Task 2: Aba "Diretoria" em Vendas & Faturamento

**Files:**
- Modify: `index.html:3188-3221` (`irVendas`, `vdRenderCoordTabs`, `vdSetCoord`)

**Interfaces:**
- Consumes: `COORD_DIRETORIA` (Task 1), `isAdmin` (global, já existe), `COORD_KEYS` (global).
- Produces: `vdCoordFiltro`/`coordAtual` podem valer `'Diretoria'` quando `isAdmin`.

- [ ] **Step 1: Não resetar o filtro ao reabrir a tela**

Em `irVendas()` (index.html:3188), a linha 3194 hoje é:

```js
  else if(vdCoordFiltro!=='todos'&&!COORD_KEYS.includes(vdCoordFiltro))vdCoordFiltro='todos';
```

Substituir por:

```js
  else if(vdCoordFiltro!=='todos'&&!COORD_KEYS.includes(vdCoordFiltro)&&vdCoordFiltro!==COORD_DIRETORIA)vdCoordFiltro='todos';
```

(Sem essa mudança, sair da tela de Vendas e voltar jogaria o filtro "Diretoria" de volta pra "Todos" toda vez, porque `'Diretoria'` não está em `COORD_KEYS`.)

- [ ] **Step 2: Adicionar a aba na lista de tabs**

Em `vdRenderCoordTabs()` (index.html:3205), o corpo hoje é:

```js
function vdRenderCoordTabs(){
  const el=g('vd-coord-tabs');
  el.style.display=(isAdmin||isDiretoria||isFabiano())?'flex':'none';
  if(!(isAdmin||isDiretoria||isFabiano())){el.innerHTML='';return}
  el.innerHTML=['todos',...COORD_KEYS].map(c=>
    '<button class="admin-tab '+(c===vdCoordFiltro?'active':'')+'" onclick="vdSetCoord(\''+c+'\')">'+(c==='todos'?'Todos':c)+'</button>'
  ).join('');
}
```

Substituir a lista `['todos',...COORD_KEYS]` por uma que inclui "Diretoria" só quando `isAdmin`:

```js
function vdRenderCoordTabs(){
  const el=g('vd-coord-tabs');
  el.style.display=(isAdmin||isDiretoria||isFabiano())?'flex':'none';
  if(!(isAdmin||isDiretoria||isFabiano())){el.innerHTML='';return}
  const tabs=['todos',...COORD_KEYS,...(isAdmin?[COORD_DIRETORIA]:[])];
  el.innerHTML=tabs.map(c=>
    '<button class="admin-tab '+(c===vdCoordFiltro?'active':'')+'" onclick="vdSetCoord(\''+c+'\')">'+(c==='todos'?'Todos':c)+'</button>'
  ).join('');
}
```

- [ ] **Step 3: Permitir `vdSetCoord('Diretoria')`**

Em `vdSetCoord(c)` (index.html:3214), hoje:

```js
async function vdSetCoord(c){
  if(!(isAdmin||isDiretoria||isFabiano())||(c!=='todos'&&!COORD_KEYS.includes(c)))return;
  vdCoordFiltro=c;
  if(c!=='todos')coordAtual=c;
  vdRenderCoordTabs();
  g('vd-sub').textContent=(c==='todos'?'Todos os coordenadores':c)+' · '+MESES[mesAtual]+'/'+anoAtual;
  await vdCarregar();
}
```

Substituir a linha de guarda por:

```js
async function vdSetCoord(c){
  const valido=c==='todos'||COORD_KEYS.includes(c)||(c===COORD_DIRETORIA&&isAdmin);
  if(!(isAdmin||isDiretoria||isFabiano())||!valido)return;
  vdCoordFiltro=c;
  if(c!=='todos')coordAtual=c;
  vdRenderCoordTabs();
  g('vd-sub').textContent=(c==='todos'?'Todos os coordenadores':c)+' · '+MESES[mesAtual]+'/'+anoAtual;
  await vdCarregar();
}
```

`vdCarregar()` (index.html:3223) já filtra com `coordenador=eq.'+encodeURIComponent(vdCoordFiltro)` genericamente — não precisa mudar.

- [ ] **Step 4: Verificação manual**

Logar como `admin`, ir em Vendas & Faturamento. Confirmar que aparece a aba "Diretoria" depois das abas dos 4 coordenadores. Clicar nela: a URL/estado interno vira `vdCoordFiltro==='Diretoria'`, a lista mostra pedidos vazios (ainda não existe nenhum), sem erro no console. Logar como um coordenador comum (ex. Igor Cater): a aba "Diretoria" **não** deve aparecer.

---

### Task 3: Campo de cliente (existente ou nome livre) quando `coordAtual==='Diretoria'`

**Files:**
- Modify: `index.html:1110` (form HTML de novo pedido)
- Modify: `index.html:3578-3582` (`vdPopCliSel`)
- Modify: `index.html:3629-3660` (`vdSalvarPedido`)

**Interfaces:**
- Consumes: `COORD_DIRETORIA` (Task 1), `coordAtual` (global), `clientesAtivos(coord)` (index.html:1825), `COORD_KEYS`.
- Produces: nenhuma interface nova exposta a outras tasks — é o fim da cadeia (task 4/5 não dependem disso).

- [ ] **Step 1: Campo de texto livre no formulário**

Em `index.html:1110`, logo depois de:

```html
      <div class="vd-field"><label>Cliente</label><select id="vf-cli" onchange="vdAplicarFicha()"></select></div>
```

Adicionar:

```html
      <div class="vd-field" id="vf-cli-livre-wrap" style="display:none"><label>Ou nome novo (Diretoria)</label><input type="text" id="vf-cli-livre" placeholder="Digite o nome do cliente"></div>
```

- [ ] **Step 2: `vdPopCliSel` mostra todos os clientes + libera o campo livre para "Diretoria"**

Em `index.html:3578`, hoje:

```js
function vdPopCliSel(){
  const at=clientesAtivos(coordAtual);
  g('vf-cli').innerHTML='<option value="">— Selecione —</option>'+
    at.map(c=>'<option value="'+vdEsc(c.id)+'">'+vdEsc(c.nome)+(c.uf?' ('+vdEsc(c.uf)+')':'')+'</option>').join('');
}
```

Substituir por:

```js
function vdPopCliSel(){
  const ehDiretoria=coordAtual===COORD_DIRETORIA;
  const wrap=g('vf-cli-livre-wrap');
  if(wrap){wrap.style.display=ehDiretoria?'block':'none';g('vf-cli-livre').value='';}
  const at=ehDiretoria?COORD_KEYS.flatMap(c=>clientesAtivos(c)):clientesAtivos(coordAtual);
  g('vf-cli').innerHTML='<option value="">— Selecione —</option>'+
    at.map(c=>'<option value="'+vdEsc(c.id)+'">'+vdEsc(c.nome)+(c.uf?' ('+vdEsc(c.uf)+')':'')+'</option>').join('');
}
```

- [ ] **Step 3: `vdSalvarPedido` aceita nome livre**

Em `index.html:3629`, o início da função hoje é:

```js
async function vdSalvarPedido(){
  if(vdSalvandoPedido)return;
  const cli_id=g('vf-cli').value;
  if(!cli_id){toast('Escolha o cliente','error');return}
  const at=clientesAtivos(coordAtual);
  const cli=at.find(c=>c.id===cli_id);
  if(!cli){toast('Cliente inválido','error');return}
```

Substituir por:

```js
async function vdSalvarPedido(){
  if(vdSalvandoPedido)return;
  const nomeLivre=coordAtual===COORD_DIRETORIA?(g('vf-cli-livre').value||'').trim():'';
  let cli;
  if(nomeLivre){
    cli={id:null,nome:nomeLivre,uf:null};
  }else{
    const cli_id=g('vf-cli').value;
    if(!cli_id){toast('Escolha o cliente','error');return}
    const at=coordAtual===COORD_DIRETORIA?COORD_KEYS.flatMap(c=>clientesAtivos(c)):clientesAtivos(coordAtual);
    cli=at.find(c=>c.id===cli_id);
    if(!cli){toast('Cliente inválido','error');return}
  }
```

O restante da função (linhas seguintes, que montam `ped={coordenador:coordAtual,cliente_id:cli.id,cliente_nome:cli.nome,cliente_uf:cli.uf||null,...}`) não muda — `cli.id` como `null` é aceito pelo banco (`cliente_id` é nullable) e `cli.nome` sempre vem preenchido nos dois caminhos.

- [ ] **Step 4: Verificação manual**

Como `admin`, na aba "Diretoria" de Vendas & Faturamento, clicar em "+ Pedido real":
1. Confirmar que aparece o campo "Ou nome novo (Diretoria)" abaixo do select de cliente, e que o select lista clientes de **todos** os coordenadores (não só de um).
2. Cenário A — selecionar um cliente existente no select, preencher SKU/valor, salvar. Conferir na listagem que o pedido aparece com esse `cliente_nome` e `coordenador='Diretoria'`.
3. Cenário B — deixar o select vazio, digitar um nome novo no campo livre (ex. "Cliente Teste Direto"), preencher SKU/valor, salvar. Conferir que o pedido salva com esse nome e sem cliente vinculado (sem erro 500/502).
4. Trocar para a aba de um coordenador normal (ex. Igor Cater) e clicar em "+ Pedido real": confirmar que o campo "Ou nome novo" **não** aparece e o comportamento antigo continua igual (nenhuma regressão).

---

### Task 4: Remover o card "Qtd por produto vendido" e expandir a tabela

**Files:**
- Modify: `index.html:2858-2859` (remoção de `sku`/`skuTotal` não usados)
- Modify: `index.html:2871-2874` (layout `dash-lower` → seção única)
- Modify: `index.html:2872` (linhas da tabela ganham clique + linha expandida)

**Interfaces:**
- Consumes: `vdSkuDash(lista)` (index.html:2497, já existe, sem mudança), `vdSkuQtdPanelHTML(skuObj,titulo,nota)` (index.html:2983, já existe, sem mudança), `vendasMes` (local de `renderAdminDash`).
- Produces: `function dashToggleCoordRow(coord)` — usada pelo `onclick` das linhas da tabela.

- [ ] **Step 1: Remover o cálculo de `sku`/`skuTotal` (viravam só o painel removido)**

Em `renderAdminDash` (index.html:2824), remover as linhas 2858-2859:

```js
  const sku=vdSkuDash(vendasMes);
  const skuTotal=Math.max(1,Object.values(sku).reduce((s,v)=>s+v,0));
```

(`skuTotal` já não era usado em lugar nenhum do template mesmo antes desta mudança — dead code preexistente.)

- [ ] **Step 2: Tirar o `dash-lower` grid de duas colunas e deixar só a tabela**

O bloco atual (index.html:2871-2874):

```js
    ${dashMapaEstadosPanelHTML(vendasMes,'Caixas vendidas por estado','Mapa do Brasil por UF em '+MESES[mesAtual]+' '+anoAtual)}
    <div class="dash-lower">
      <section class="panel"><div class="panel-title-row"><div class="panel-title">Performance por coordenador</div><div class="panel-note">${MESES[mesAtual]} ${anoAtual}</div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Coordenador</th><th>Positivação</th><th>Volume vendido</th><th>Meta</th><th>Cumprimento</th><th>Tendência</th><th>Sem venda</th></tr></thead><tbody>${rows.map(r=>{const perfCls=r.pctMeta>=100?'good':r.pctMeta>=80?'warn':'bad';return`<tr class="coord-row-${perfCls}"><td class="table-name">${r.coord}</td><td>${r.pctPos}%</td><td>${r.volume.toLocaleString('pt-BR')} cx</td><td>${r.meta.toLocaleString('pt-BR')} cx</td><td><div style="display:flex;align-items:center;gap:8px"><div class="mini-progress"><span style="width:${Math.min(100,r.pctMeta)}%"></span></div><strong class="coord-status coord-status-${perfCls}">${r.pctMeta}%</strong></div></td><td>${coordTrendHTML(r.coord)}</td><td>${r.pendentes.length}</td></tr>`;}).join('')}</tbody></table></div></section>
      ${vdSkuQtdPanelHTML(sku,'Qtd por produto vendido',MESES[mesAtual]+' '+anoAtual)}
    </div></div>`;
```

Substituir por (remove o wrapper `dash-lower`, adiciona `onclick`/`cursor:pointer` na linha e uma linha expansível logo abaixo, com `colspan="7"` reaproveitando `vdSkuQtdPanelHTML`):

```js
    ${dashMapaEstadosPanelHTML(vendasMes,'Caixas vendidas por estado','Mapa do Brasil por UF em '+MESES[mesAtual]+' '+anoAtual)}
    <section class="panel"><div class="panel-title-row"><div class="panel-title">Performance por coordenador</div><div class="panel-note">${MESES[mesAtual]} ${anoAtual} · clique numa linha pra ver o mix de produtos</div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Coordenador</th><th>Positivação</th><th>Volume vendido</th><th>Meta</th><th>Cumprimento</th><th>Tendência</th><th>Sem venda</th></tr></thead><tbody>${rows.map(r=>{
      const perfCls=r.pctMeta>=100?'good':r.pctMeta>=80?'warn':'bad';
      const skuCoord=vdSkuDash(vendasMes.filter(p=>p.coordenador===r.coord));
      return`<tr class="coord-row-${perfCls}" style="cursor:pointer" onclick="dashToggleCoordRow('${r.coord}')"><td class="table-name">${r.coord}</td><td>${r.pctPos}%</td><td>${r.volume.toLocaleString('pt-BR')} cx</td><td>${r.meta.toLocaleString('pt-BR')} cx</td><td><div style="display:flex;align-items:center;gap:8px"><div class="mini-progress"><span style="width:${Math.min(100,r.pctMeta)}%"></span></div><strong class="coord-status coord-status-${perfCls}">${r.pctMeta}%</strong></div></td><td>${coordTrendHTML(r.coord)}</td><td>${r.pendentes.length}</td></tr>`+
      `<tr class="coord-expand-row" data-coord="${r.coord}" style="display:none"><td colspan="7" style="padding:0;border:none">${vdSkuQtdPanelHTML(skuCoord,'Mix de produtos · '+r.coord,MESES[mesAtual]+' '+anoAtual)}</td></tr>`;
    }).join('')}</tbody></table></div></section>
    </div>`;
```

Note que o `</div>` final fecha só o `dash-page-shell` aberto lá em cima (index.html:2862) — o `dash-lower` sumiu, então uma chave `</div>` a menos que antes.

- [ ] **Step 3: Função de toggle**

Logo depois do fechamento de `renderAdminDash` (após o `};` de index.html:2877), adicionar:

```js
function dashToggleCoordRow(coord){
  document.querySelectorAll('#dash-content .coord-expand-row').forEach(tr=>{
    tr.style.display=(tr.dataset.coord===coord&&tr.style.display==='none')?'table-row':'none';
  });
}
```

Só uma linha expandida por vez: clicar em outro coordenador fecha a anterior (todas ficam `none` exceto a clicada, e se a clicada já estava aberta ela fecha também, porque a condição `tr.style.display==='none'` deixa de valer).

- [ ] **Step 4: Verificação manual**

Como `admin`, abrir o Dashboard. Confirmar que o card "Qtd por produto vendido" sumiu e a tabela "Performance por coordenador" ocupa a largura toda da seção (sem coluna vazia ao lado). Clicar na linha de um coordenador: deve abrir, logo abaixo, o painel de mix de SKUs só daquele coordenador (percentuais batendo com os pedidos dele no mês). Clicar em outra linha: a primeira fecha, a nova abre. Clicar de novo na mesma linha aberta: fecha. Nenhum erro no console.

---

## Ordem de execução

Tasks 1 → 2 → 3 são sequenciais (cada uma depende da constante/aba da anterior para ser testável fim-a-fim). Task 4 é independente das 1-3 (mexe só no Dashboard) e pode ser feita em paralelo ou em qualquer ordem — mas Task 1 já toca `renderAdminDash`, então fazer 1 antes de 4 evita conflito de edição na mesma função.
