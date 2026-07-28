# Pseudo-coordenador "Diretoria" + linha expansível no dashboard

## Objetivo

Permitir que admin e Vagner lancem vendas avulsas ("Diretoria") em Vendas & Faturamento sem que elas contem para a meta/positivação de nenhum coordenador real, mas contando no volume geral da empresa. Junto, trocar o card "Qtd por produto vendido" do Dashboard por uma linha expansível na própria tabela "Performance por coordenador".

## Parte 1 — Pseudo-coordenador "Diretoria"

### Por que fica fora de `COORD_KEYS`

`COORD_KEYS` (`index.html`, ~linha 1506) é a lista-fonte usada em ~20 lugares que assumem "coordenador com carteira de clientes e meta": positivação, `clientesDB`, metas mensais, tabela "Performance por coordenador", filtros de Clientes/Relatórios/Forecast. Adicionar "Diretoria" lá faria o sistema tentar tratá-la como coordenador de verdade (pedir carteira de clientes, meta mensal, aparecer na tabela de performance). Por isso "Diretoria" fica como um valor especial de `coordenador`, fora do array.

### Quem lança

Só admin e Vagner — ambos já cobertos por `isAdmin` no client e por `podeCriarPedidoVenda`/`vePrivilegiado` no backend (`api/_lib/authz.js`), que já aceitam qualquer valor de `coordenador` vindo do body para sessões privilegiadas. **Nenhuma mudança de backend é necessária.**

### UI — Vendas & Faturamento

- `vdRenderCoordTabs()`: quando `isAdmin`, adiciona a aba "Diretoria" depois de `['todos', ...COORD_KEYS]`.
- `vdSetCoord(c)`: passa a aceitar `c==='Diretoria'` (hoje rejeita qualquer valor fora de `COORD_KEYS`), restrito a `isAdmin`.
- `vdCarregar()` já filtra por `coordenador=eq.<valor>` genericamente — funciona sem alteração para "Diretoria".

### Formulário de novo pedido quando `coordAtual==='Diretoria'`

`vdPopCliSel()` hoje popula o select de cliente com `clientesAtivos(coordAtual)` — que seria vazio para "Diretoria" (não tem carteira própria). Ajuste:

- Select de cliente mostra `COORD_KEYS.flatMap(c=>clientesAtivos(c))` (clientes ativos de todos os coordenadores), permitindo reaproveitar um cliente já cadastrado.
- Novo campo de texto livre (visível só quando `coordAtual==='Diretoria'`) para digitar um nome que não existe na base.
- `vdSalvarPedido()`: se o campo de texto livre estiver preenchido, usa esse nome (`cliente_id: null`, `cliente_nome: <texto>`, `cliente_uf: null`) e ignora o select; senão, exige seleção no select como hoje. Confirmado no banco: `pedidos_vendas.cliente_id` é `NULL`-able e `cliente_nome` é `NOT NULL` — os dois caminhos preenchem `cliente_nome`, então não há restrição de schema a tratar.

### Efeito nos números existentes (sem mudança de código)

Como "Vendas & Faturamento → Todos" e "Relatórios → Todos os coordenadores" já buscam `pedidos_vendas` sem filtrar por `COORD_KEYS`, pedidos com `coordenador='Diretoria'` **já aparecem automaticamente** nesses totais e nas listagens — nenhuma alteração necessária ali.

### Dashboard — "Número geral"

`renderAdminDash` hoje calcula `volume` só a partir de `rows` (que vem de `COORD_KEYS.map(coordRow)`), então vendas de "Diretoria" ficariam de fora desse card. Ajuste: somar ao `volume` usado no card "Número geral" (e no hero "Realizado") o total de caixas de pedidos com `coordenador==='Diretoria'` dentro de `vendasMes` (já carregado, sem query nova). A meta (`meta`) não muda — só o realizado geral sobe.

A tabela "Performance por coordenador" continua vindo só de `COORD_KEYS` — "Diretoria" **não vira uma linha nela**, por design (não tem meta/carteira).

## Parte 2 — Dashboard: linha expansível em vez do card de SKU

- Remove o painel `vdSkuQtdPanelHTML(sku, 'Qtd por produto vendido', ...)` do `dash-lower` em `renderAdminDash` (o `dash-lower` passa a ter só a tabela "Performance por coordenador", ocupando a largura toda).
- Cada `<tr>` de coordenador na tabela fica clicável. Ao clicar, insere/remove logo abaixo uma linha expandida (`colspan` completo) mostrando o mix de SKUs (GR/GM/CM/CC/GTWIN/CK) vendido por aquele coordenador no mês — reaproveita o mesmo cálculo que hoje alimenta `sku` (contagem por SKU), mas filtrado para `vendasMes.filter(p=>p.coordenador===coord)` em vez do total.
- Só uma linha expandida por vez: clicar em outra linha fecha a anterior; clicar de novo na mesma recolhe.
- Não requer nova chamada ao Supabase — usa `vendasMes`, já carregado.

## Fora de escopo

- Não adiciona "Diretoria" a `COORD_KEYS`, `METAS`, `clientesDB`, telas de Clientes/Metas/Forecast, nem ao login (`senhas.js`/`COORD_KEYS` de auth continuam intactos).
- Não altera `api/_lib/authz.js` nem nenhum endpoint em `api/` — o fluxo de criação de pedido já é genérico o suficiente para admin/Vagner.
- Não muda a tabela "Performance por coordenador" para incluir "Diretoria" como linha.
- Não adiciona filtro/edição do mix de SKU expandido (é só leitura).
