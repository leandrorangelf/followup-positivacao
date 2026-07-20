# Aba de consulta de GNRE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma aba "GNRE" ao menu principal do app, listando (com filtro de status e busca por cliente) os pedidos do ano atual com dados da venda, do cliente e do processo de GNRE — status, valores, datas de cada etapa, e links para abrir os PDFs anexados (guia e comprovante).

**Architecture:** Tudo em `index.html` (SPA vanilla, sem build). Uma tela nova `s-gnre` segue exatamente o padrão já usado por `s-gestao`/`s-planilha`: uma função `irGnre()` que troca de tela e dispara `gnreCarregar()`, que busca `pedidos_vendas` do ano atual via o helper `sb()` já existente (o backend já filtra coordenador não-privilegiado ao próprio nome), e `gnreRender()` que desenha a tabela + filtros. Reaproveita 100% dos helpers de GNRE que já existem (`vdGnreStatus`, `vdGnreBadgeHTML`, `vdAbrirGnreArquivo`, `vdResumoPedido`) — nenhuma mudança de backend.

**Tech Stack:** HTML/CSS/JS vanilla (sem framework, sem bundler). Vercel Functions no backend (não tocadas neste plano).

## Global Constraints

- Não há build step nem test runner neste projeto — `index.html` é servido como está. A "verificação" de cada task é `node --check` sobre o bloco `<script>` extraído (sintaxe) + checagem manual no navegador (comportamento).
- Toda edição salva já dispara commit+push automático via hook (`.claude/settings.json`) e a Vercel deploya sozinha — não faltar terminar cada task num estado consistente.
- Nunca reintroduzir chave do Supabase no client; toda chamada passa pelo helper `sb()` que já reescreve para `/api/db/<tabela>`.
- Seguir convenções existentes: `vdEsc()` para qualquer texto interpolado em HTML, `vdFmt()` para valores monetários, classes CSS já existentes (`gestao-table`, `client-search`, `client-filter`, `client-management-toolbar`, `vd-attach-link`) em vez de CSS novo.

---

### Task 1: Estado global + shell HTML da tela

**Files:**
- Modify: `index.html:2881` (bloco de `let vdPedidos=[];` e variáveis irmãs)
- Modify: `index.html:851` (logo após o fechamento do bloco `<div id="s-gestao">`)

**Interfaces:**
- Produces: variáveis globais `gnrePedidos` (array), `gnreFiltroStatus` (string, default `'todos'`), `gnreBusca` (string, default `''`) — consumidas pela Task 3.
- Produces: elemento DOM `#s-gnre` (screen container), `#gnre-content` (onde a Task 3 injeta HTML) e `#nav-gnre` (onde `renderNav` desenha os botões) — consumidos pela Task 2 e Task 3.

- [ ] **Step 1: Adicionar as variáveis globais de estado da tela GNRE**

Em `index.html`, logo após a linha `let vdPedidos=[];` (linha 2881), adicionar:

```js
let vdPedidos=[];
let gnrePedidos=[];
let gnreFiltroStatus='todos';
let gnreBusca='';
```

(mantendo as linhas seguintes que já existem, ex.: `let vdForecastOrigemId=null,vdForecastOrigemLabel='';` etc — só inserir as 3 linhas novas logo depois de `let vdPedidos=[];`)

- [ ] **Step 2: Adicionar o container HTML da tela**

Em `index.html`, logo após o fechamento do bloco da tela de Gestão (depois da linha `</div>` que fecha `<div id="s-gestao">`, linha 851, e antes do comentário `<!-- PLANILHA (diretoria) -->`), adicionar:

```html
<!-- GNRE (consulta) -->
<div id="s-gnre" class="screen" style="display:none">
  <div style="padding:20px 16px">
    <div style="font-size:12px;color:var(--muted);margin-bottom:2px">Consulta</div>
    <div style="font-size:22px;font-weight:600;color:var(--text)">GNRE</div>
  </div>
  <div id="gnre-content" style="padding:16px;min-height:60vh"><div class="loading">Carregando...</div></div>
  <div class="bottom-nav" id="nav-gnre"></div>
</div>
```

- [ ] **Step 3: Checar sintaxe**

Run:
```bash
node -e "const fs=require('fs');const html=fs.readFileSync('index.html','utf8');const s=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');fs.writeFileSync('.tmp-check.js',s);" && node --check .tmp-check.js && echo OK
```
Expected: `OK` (o HTML novo não tem `<script>`, então isso só confirma que nada quebrou no JS existente).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: adiciona shell da tela de consulta GNRE"
```

---

### Task 2: Ligar a navegação (menu, permissões de rota, roteamento)

**Files:**
- Modify: `index.html:1488` (array de telas em `show()`)
- Modify: `index.html:1499-1523` (`renderNav`, as 4 listas de `tabs` por perfil)
- Modify: `index.html:1532-1549` (`navTo`, allow-lists de Diretoria/Fabiano e o `else if` de roteamento)

**Interfaces:**
- Consumes: `#s-gnre`, `#nav-gnre` (produzidos na Task 1); função `irGnre()` (produzida na Task 3 — só é *chamada* aqui, ainda não existe até a Task 3 rodar. Como as duas tasks editam o mesmo arquivo em sequência, ao final da Task 3 tudo funciona; não rode a app entre a Task 2 e a Task 3 isoladamente).
- Produces: nada consumido por outras tasks (é o fim da cadeia de wiring).

- [ ] **Step 1: Registrar a tela na lista do `show()`**

Em `index.html:1488`, trocar:

```js
  ['s-login','s-tv','s-gestao','s-planilha','s-dash','s-ped','s-cli','s-metas','s-vendas','s-premiacao','s-forecast','s-vfn','s-vficha','s-log','s-registro','s-relatorios'].forEach(screenId=>{
```

por:

```js
  ['s-login','s-tv','s-gestao','s-planilha','s-dash','s-ped','s-cli','s-metas','s-vendas','s-premiacao','s-forecast','s-vfn','s-vficha','s-log','s-registro','s-relatorios','s-gnre'].forEach(screenId=>{
```

- [ ] **Step 2: Adicionar a aba "GNRE" nas 4 listas de `tabs` de `renderNav`**

Em `index.html:1499-1523`, a função `renderNav` tem 4 ramos. Adicionar `{id:'gnre',icon:'document',label:'GNRE'}` como último item de cada array:

Ramo Fabiano (linha ~1500-1502), de:
```js
  const tabs=isFabiano()?[
    {id:'vendas',icon:'money',label:'Vendas'},
    {id:'registro',icon:'document',label:'Registro'},
  ]:(isAdmin||user==='vagner')?[
```
para:
```js
  const tabs=isFabiano()?[
    {id:'vendas',icon:'money',label:'Vendas'},
    {id:'registro',icon:'document',label:'Registro'},
    {id:'gnre',icon:'document',label:'GNRE'},
  ]:(isAdmin||user==='vagner')?[
```

Ramo Admin/Vagner (linha ~1503-1511), de:
```js
  ]:(isAdmin||user==='vagner')?[
    {id:'dash',icon:'dashboard',label:'Dashboard'},
    {id:'vendas',icon:'money',label:'Vendas'},
    {id:'premiacao',icon:'trophy',label:'Premiação'},
    {id:'forecast',icon:'forecast',label:'Forecast'},
    {id:'cli',icon:'users',label:'Clientes'},
    {id:'metas',icon:'target',label:'Metas'},
    {id:'ped',icon:'clipboard',label:'Pedidos'},
    {id:'registro',icon:'document',label:'Registro'},
  ]:isDiretoria?[
```
para:
```js
  ]:(isAdmin||user==='vagner')?[
    {id:'dash',icon:'dashboard',label:'Dashboard'},
    {id:'vendas',icon:'money',label:'Vendas'},
    {id:'premiacao',icon:'trophy',label:'Premiação'},
    {id:'forecast',icon:'forecast',label:'Forecast'},
    {id:'cli',icon:'users',label:'Clientes'},
    {id:'metas',icon:'target',label:'Metas'},
    {id:'ped',icon:'clipboard',label:'Pedidos'},
    {id:'registro',icon:'document',label:'Registro'},
    {id:'gnre',icon:'document',label:'GNRE'},
  ]:isDiretoria?[
```

Ramo Diretoria (linha ~1512-1517), de:
```js
  ]:isDiretoria?[
    {id:'gestao',icon:'tv',label:'Gestão'},
    {id:'planilha',icon:'clipboard',label:'Planilha'},
    {id:'dash',icon:'dashboard',label:'Dashboard'},
    {id:'vendas',icon:'money',label:'Vendas'},
    {id:'forecast',icon:'forecast',label:'Forecast'},
  ]:[
```
para:
```js
  ]:isDiretoria?[
    {id:'gestao',icon:'tv',label:'Gestão'},
    {id:'planilha',icon:'clipboard',label:'Planilha'},
    {id:'dash',icon:'dashboard',label:'Dashboard'},
    {id:'vendas',icon:'money',label:'Vendas'},
    {id:'forecast',icon:'forecast',label:'Forecast'},
    {id:'gnre',icon:'document',label:'GNRE'},
  ]:[
```

Ramo padrão/coordenador (linha ~1518-1523), de:
```js
  ]:[
    {id:'dash',icon:'dashboard',label:'Dashboard'},
    {id:'vendas',icon:'money',label:'Vendas'},
    {id:'premiacao',icon:'trophy',label:'Premiação'},
    {id:'forecast',icon:'forecast',label:'Forecast'},
  ];
```
para:
```js
  ]:[
    {id:'dash',icon:'dashboard',label:'Dashboard'},
    {id:'vendas',icon:'money',label:'Vendas'},
    {id:'premiacao',icon:'trophy',label:'Premiação'},
    {id:'forecast',icon:'forecast',label:'Forecast'},
    {id:'gnre',icon:'document',label:'GNRE'},
  ];
```

- [ ] **Step 3: Liberar a rota `gnre` nos guards de `navTo` e adicionar o roteamento**

Em `index.html:1533-1534`, de:
```js
  if(isDiretoria && !['dash','vendas','forecast','relatorios','gestao','planilha'].includes(id)){toast('Perfil Diretoria é somente leitura','error');return;}
  if(isFabiano()&&!['vendas','registro'].includes(id)){toast('Fabiano acessa apenas Vendas e Registro','error');return;}
```
para:
```js
  if(isDiretoria && !['dash','vendas','forecast','relatorios','gestao','planilha','gnre'].includes(id)){toast('Perfil Diretoria é somente leitura','error');return;}
  if(isFabiano()&&!['vendas','registro','gnre'].includes(id)){toast('Fabiano acessa apenas Vendas e Registro','error');return;}
```

Em `index.html:1547-1549`, de:
```js
  else if(id==='gestao'){irGestao();}
  else if(id==='planilha'){irPlanilha();}
  else if(id==='vficha'){irVendas();vdIrFicha();}
```
para:
```js
  else if(id==='gestao'){irGestao();}
  else if(id==='planilha'){irPlanilha();}
  else if(id==='gnre'){irGnre();}
  else if(id==='vficha'){irVendas();vdIrFicha();}
```

- [ ] **Step 4: Checar sintaxe**

Run:
```bash
node -e "const fs=require('fs');const html=fs.readFileSync('index.html','utf8');const s=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');fs.writeFileSync('.tmp-check.js',s);" && node --check .tmp-check.js && echo OK
```
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: adiciona rota e item de menu da aba GNRE"
```

---

### Task 3: Carregamento de dados e renderização da tabela

**Files:**
- Modify: `index.html:4617` (logo após o fim de `planilhaRender()`, antes de `function dashRenderHistorico`)

**Interfaces:**
- Consumes: `gnrePedidos`/`gnreFiltroStatus`/`gnreBusca` (Task 1), `#s-gnre`/`#nav-gnre`/`#gnre-content` (Task 1), roteamento que chama `irGnre()` (Task 2).
- Consumes (helpers já existentes, sem mudança): `sb(path,{ret:true})`, `anoAtual`, `dashPedidoValido(p)`, `vdTipoPedido(p)`, `vdResumoPedido(p)`, `vdGnreStatus(p)`, `vdGnreBadgeHTML(p)`, `vdAbrirGnreArquivo(path)`, `vdEsc(v)`, `vdFmt(v)`, `MESES` (array), `g(id)` (equivalente a `document.getElementById`), `renderNav(navId,active)`, `show(id)`.
- Produces: `irGnre()` (chamada por `navTo` na Task 2), `gnreCarregar()`, `gnreRender()` — nenhuma outra task depende dessas funções além do roteamento já cravado na Task 2.

- [ ] **Step 1: Implementar `irGnre`, `gnreCarregar` e `gnreRender`**

Em `index.html`, logo após a linha `}` que fecha `planilhaRender()` (linha 4617, antes de `function dashRenderHistorico(hist,coordFiltro){`), adicionar:

```js
async function irGnre(){
  show('s-gnre');renderNav('nav-gnre','gnre');
  await gnreCarregar();
}
async function gnreCarregar(){
  const d=await sb('/rest/v1/pedidos_vendas?ano=eq.'+anoAtual+'&deleted_at=is.null&select=*,pedidos_vendas_itens(*)&order=created_at.desc&limit=5000',{ret:true});
  gnrePedidos=(Array.isArray(d)?d:[]).filter(p=>dashPedidoValido(p)&&vdTipoPedido(p)!=='off');
  gnreRender();
}
function gnreDataFmt(iso){return iso?new Date(iso).toLocaleDateString('pt-BR'):null;}
function gnreDatasHTML(p){
  const partes=[];
  if(p.gnre_enviado_at)partes.push('Enviada '+gnreDataFmt(p.gnre_enviado_at));
  if(p.gnre_retornado_at)partes.push('Calculada '+gnreDataFmt(p.gnre_retornado_at));
  if(p.gnre_pago_at)partes.push('Paga '+gnreDataFmt(p.gnre_pago_at));
  if(p.gnre_arquivo_at)partes.push('Anexo '+gnreDataFmt(p.gnre_arquivo_at));
  if(p.gnre_comprovante_at)partes.push('Comprovante '+gnreDataFmt(p.gnre_comprovante_at));
  return partes.length?partes.join('<br>'):'—';
}
function gnreAnexosHTML(p){
  const links=[];
  if(p.gnre_arquivo_url)links.push('<a class="vd-attach-link" href="#" data-gnre-path="'+vdEsc(p.gnre_arquivo_url)+'" onclick="event.preventDefault();vdAbrirGnreArquivo(this.dataset.gnrePath)">📄 GNRE</a>');
  if(p.gnre_comprovante_url)links.push('<a class="vd-attach-link" href="#" data-gnre-path="'+vdEsc(p.gnre_comprovante_url)+'" onclick="event.preventDefault();vdAbrirGnreArquivo(this.dataset.gnrePath)">✅ Comprovante</a>');
  return links.length?links.join(' '):'—';
}
function gnreRender(){
  const statusOpts=[['todos','Todos'],['pendente','Pendente'],['enviada','Enviada'],['calculada','Calculada'],['paga','Paga'],['isenta','Isenta']];
  const busca=gnreBusca.trim().toLowerCase();
  const lista=gnrePedidos.filter(p=>{
    if(gnreFiltroStatus!=='todos'&&vdGnreStatus(p)!==gnreFiltroStatus)return false;
    if(busca&&!String(p.cliente_nome||'').toLowerCase().includes(busca))return false;
    return true;
  });
  const toolbar='<div class="client-management-toolbar">'+
    '<input class="client-search" type="search" placeholder="Buscar cliente..." value="'+vdEsc(gnreBusca)+'" oninput="gnreBusca=this.value;gnreRender()">'+
    '<select class="client-filter" onchange="gnreFiltroStatus=this.value;gnreRender()">'+
      statusOpts.map(([v,l])=>'<option value="'+v+'" '+(gnreFiltroStatus===v?'selected':'')+'>'+l+'</option>').join('')+
    '</select>'+
    '<span class="client-count">'+lista.length+' pedido'+(lista.length===1?'':'s')+'</span>'+
  '</div>';
  const rows=lista.map(p=>{
    const x=vdResumoPedido(p);
    return '<tr>'+
      '<td>'+vdEsc(p.cliente_nome)+(p.cliente_uf?' · '+vdEsc(p.cliente_uf):'')+'</td>'+
      '<td>'+vdEsc(p.coordenador||'—')+'</td>'+
      '<td>'+MESES[p.mes]+'/'+p.ano+'</td>'+
      '<td>'+vdGnreBadgeHTML(p)+'</td>'+
      '<td class="num">'+(p.gnre_valor?vdFmt(p.gnre_valor):'—')+'</td>'+
      '<td class="num">'+x.pedidoCx+' cx · '+vdFmt(x.pedidoValor)+'</td>'+
      '<td>'+gnreDatasHTML(p)+'</td>'+
      '<td>'+gnreAnexosHTML(p)+'</td>'+
    '</tr>';
  }).join('');
  const tabela=lista.length?
    '<table class="gestao-table"><thead><tr><th>Cliente</th><th>Coordenador</th><th>Competência</th><th>Status GNRE</th><th>Valor GNRE</th><th>Venda</th><th>Datas</th><th>Anexos</th></tr></thead><tbody>'+rows+'</tbody></table>'
    :'<div class="gestao-empty">Nenhum pedido encontrado</div>';
  g('gnre-content').innerHTML=toolbar+'<div style="margin-top:12px;overflow-x:auto">'+tabela+'</div>';
}
```

- [ ] **Step 2: Checar sintaxe**

Run:
```bash
node -e "const fs=require('fs');const html=fs.readFileSync('index.html','utf8');const s=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');fs.writeFileSync('.tmp-check.js',s);" && node --check .tmp-check.js && echo OK
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: implementa carregamento e renderização da tela de consulta GNRE"
```

- [ ] **Step 4: Verificação manual no navegador (pós-deploy)**

O hook já deu push; espere a Vercel deployar (ou rode `vercel --prod` se preferir testar antes) e abra o app publicado:

1. Login como `admin` → deve aparecer a aba "GNRE" no menu → clicar nela.
2. Deve carregar uma tabela com os pedidos do ano atual (exceto tipo "off"), cada linha com Cliente, Coordenador, Competência, badge de status GNRE, valor da GNRE, caixas/valor da venda, datas preenchidas e "—" nas que não têm, e links de anexo quando existirem.
3. No pedido da BRASUR (Rosana) que já tem `gnre_arquivo_url` normalizado (task anterior desta conversa), clicar em "📄 GNRE" deve abrir o PDF em nova aba.
4. Trocar o filtro de status para "Paga" → lista deve reduzir só às pagas. Digitar um nome no campo de busca → lista deve filtrar em tempo real.
5. Logar como um coordenador (ex.: Rosana) → aba "GNRE" deve aparecer e mostrar só os pedidos dela.
6. Logar como `fabiano` → aba "GNRE" deve aparecer ao lado de Vendas/Registro.
7. Abrir o Console do navegador (F12) durante todo o teste → nenhum erro JS deve aparecer.

Se algum passo falhar, reportar a mensagem de erro exata do toast ou do console antes de prosseguir.

---

## Self-Review

- **Cobertura do spec:** acesso universal (Task 2 — todos os 4 ramos de perfil ganham a aba) ✓; filtro de status + busca por cliente (Task 3, `gnreRender`) ✓; colunas Cliente/UF, Coordenador, Competência, Status+valor GNRE, Caixas/valor da venda, todas as datas, links de PDF (Task 3) ✓; exclui pedidos tipo "off" (Task 3, `gnreCarregar`) ✓; ano atual, sem paginação, sem escrita, sem exportação (Task 3, sem endpoints novos) ✓.
- **Placeholders:** nenhum "TBD"/"depois eu vejo" — todo código é completo e copiável direto.
- **Consistência de tipos/nomes:** `gnrePedidos`/`gnreFiltroStatus`/`gnreBusca` (Task 1) usados exatamente com esses nomes em `gnreCarregar`/`gnreRender` (Task 3); `irGnre` (chamada na Task 2, definida na Task 3) com a mesma assinatura (`async function irGnre()`, sem parâmetros); IDs de DOM (`s-gnre`, `nav-gnre`, `gnre-content`) idênticos entre Task 1 (criação) e Tasks 2/3 (uso).
