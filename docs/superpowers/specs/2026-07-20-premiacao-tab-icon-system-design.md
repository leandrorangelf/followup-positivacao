# Aba Premiação + sistema de ícones SVG (fim dos emojis)

## Objetivo

Criar uma aba dedicada "Premiação" que mostra metas, realizado, gatilhos de premiação (atingidos/faltando e quanto falta) e os clientes que ainda faltam positivar — dados derivados automaticamente do que o Dashboard já calcula, sem nova chamada ao backend. Junto, substituir todo emoji usado como ícone de UI no app por um sistema de ícones SVG inline (sem dependência externa).

## Parte 1 — Sistema de ícones

- Função `icon(nome, size=16)` no `<script>` de `index.html`, retorna uma string SVG inline (`currentColor` no stroke, leve preenchimento de destaque translúcido — estilo duotone).
- Conjunto fixo de ícones cobrindo todos os emojis hoje usados como UI: `dashboard`, `money` (Vendas), `crystal-ball` (Forecast), `users` (Clientes), `target` (Metas), `clipboard` (Pedidos), `document` (Registro), `tv`, `search` (Log/lupa), `report` (Relatórios), `theme-sun`, `theme-moon`, `check`, `check-empty`, `trophy`, `celebration`, `warning`, `factory`, `truck`, `hourglass` (Pendente), `chevron`/setas de navegação já usadas.
- Toda ocorrência de emoji em: `renderNav` (nav inferior e lateral), `toggleTheme`/`applyTheme` (☀️/🌙), títulos de seção (`section-hdr`, `sec-title`, `panel-title`), badges (`badge-sem`, status de vendas), cards do dashboard admin (🏭/🚛), TV, login, `renderPremiacao`/`renderAdminPrem` — é trocada por `icon(...)`. Emojis dentro de mensagens de `toast(...)` (texto solto, não estrutural) também são trocados, pois o pedido cobre "app inteiro".
- Sem biblioteca nova: só functions JS + SVG, consistente com a ausência de build step do projeto.

## Parte 2 — Aba Premiação

### Navegação

- Novo item em `renderNav`: `{id:'premiacao', icon:'trophy', label:'Premiação'}`.
- Visível para: coordenadores (perfil padrão), Admin e `vagner`. Não aparece para Diretoria nem Fabiano (mantém as restrições já existentes em `navTo`).
- Nova tela `id="s-premiacao"` seguindo o padrão `class="screen" style="display:none"` + `app-header` + conteúdo + `bottom-nav`.
- `navTo('premiacao')` chama `irPremiacao()`.

### Seletor de coordenador (Admin/Vagner)

- Reaproveita o padrão de abas por coordenador já usado em Pedidos (`renderAdminTabs`/`admin-tabs`): lista `COORD_KEYS`, clique troca o coordenador em foco na tela sem sair dela.
- Coordenador logado não vê seletor — vê direto a própria premiação.

### Conteúdo (por coordenador em foco)

Reaproveita os dados já carregados pelo dashboard (`dadosLocais` para o coordenador logado, `todosPedidosMes[coord]` para o admin, `METAS`, `clientesAtivos(coord)`, `totCliD`, `SKUS`) — mesmas contas hoje feitas em `renderCoordDash`/`renderAdminDash`. Nenhuma query nova ao Supabase.

1. **Cabeçalho**: mês/ano atual (reaproveita `dash-mes`/`mesAtual`), total de premiação do mês via `calcPremiacao`. Para coordenador em `COORD_SALARIO_FIXO` (Marcio Vit): mostra um aviso "Salário fixo — sem premiação variável" no lugar do valor em R$.
2. **Metas x Realizado**: meta do mês (`METAS[coord][mesAtual]`), total realizado em caixas (`tot`), % atingido (`pctMeta`), barra de progresso — mesmo cálculo de `renderCoordDash`.
3. **Gatilhos**: reaproveita `calcPremiacao(pctMeta,pctPos,pctTop4)` e a lista de níveis já existente em `renderPremiacao` (Volume 100/110/120/130%, Positivação 80%, TOP4 80%). Cada linha: ícone `check`/`check-empty`, descrição do gatilho, quanto falta quando não atingido (caixas ou pontos percentuais), valor em R$ quando atingido — **oculto** para Marcio Vit (mostra só o ícone e "quanto falta", sem valor monetário).
4. **Clientes que faltam**: lista de clientes ativos sem pedido no mês, mesma lógica de `pendentes` em `renderCoordDash` (`ativos.filter(c=>totCliD(...)===0)`), com contagem no título da seção (ícone `hourglass`).

### Dashboard — remoção do bloco duplicado

- Remove a chamada a `renderPremiacao(...)` dentro de `renderCoordDash` (bloco roxo) e o card `prem-${coord}` dentro de `renderAdminDash`/`renderAdminPrem`.
- No lugar, um atalho curto ("Ver premiação completa →") linkando para a nova aba, mantendo o Dashboard focado em visão geral.
- `calcPremiacao` continua sendo a função central de cálculo — reaproveitada pela aba nova; `renderPremiacao`/`renderAdminPrem` são substituídas pelas novas funções de renderização da aba (o cálculo não muda, só onde e como é exibido).

## Fora de escopo

- Não altera as regras de premiação em si (valores de R$, percentuais dos gatilhos) nem `authz.js`/permissões de backend — a aba é somente leitura, dados já vêm do proxy existente.
- Não adiciona edição de metas pela aba nova (isso continua em Metas).
- Não migra Diretoria/Fabiano para o novo item de nav (fora do escopo de acesso deles).
