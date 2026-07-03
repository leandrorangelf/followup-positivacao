# Follow-up Positivação — Clean Tobacco

Aplicação web interna da Clean Tobacco para acompanhamento de vendas, positivação de clientes, metas de coordenadores e faturamento.

## Estrutura do projeto

```
.
├── index.html                    # App inteiro: HTML + CSS + JS (SPA vanilla, ~5.600 linhas)
├── vercel.json                   # Rewrite catch-all para SPA (tudo cai em index.html)
├── supabase-comentario-vagner.sql# Migração avulsa (colunas de comentário na tabela pedidos_vendas)
└── .claude/
    └── settings.json             # Hook: todo Write/Edit dispara git add+commit+push automático
```

Não há `package.json`, build step, bundler ou dependências locais — é um único arquivo HTML estático publicado direto na Vercel. As poucas bibliotecas externas (jsPDF, jsPDF-AutoTable, D3 v3, topojson, Datamaps BR) são carregadas via CDN no `<head>`.

**Ponto de atenção:** o hook em `.claude/settings.json` faz commit + push automáticos a cada edição de arquivo. Qualquer alteração feita por aqui já sobe para o repositório remoto sem confirmação extra.

## Stack

- **Frontend:** HTML/CSS/JS puro, sem framework, sem transpilação. Roteamento por telas (`<div class="screen">`) mostradas/escondidas via JS (`show(id)` / `navTo(id)`).
- **Backend:** Supabase (Postgres + REST via PostgREST), acessado direto via `fetch` com a REST API (`const SB`, `const KEY` definidos em `index.html` perto da linha 1208). Não usa o SDK `@supabase/supabase-js`.
- **Hospedagem:** Vercel (deploy estático, rewrite SPA em `vercel.json`).
- **Autenticação:** não usa Supabase Auth. Login é uma lista fixa de usuários com senha com hash SHA-256 embutido no client (`SENHAS_HASH`, linha ~1211). É controle de acesso simples por perfil, não segurança real (a chave anon do Supabase e os hashes ficam expostos no bundle público).

## Perfis de usuário

Definidos em `SENHAS_HASH` / `COORD_KEYS`:
- `admin` (Leandro, Gestor) — acesso completo
- `vagner` (Gerente) — leitura de pedidos
- `diretoria` — somente leitura
- `fabiano` (Faturamento)
- Coordenadores: `Igor Cater`, `Marcio Vit`, `Vitor Valle`, `Rosana`

## Telas principais (`id="s-*"` em index.html)

| id | Tela |
|---|---|
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
| `s-tv` | Painel para TV externa (somente leitura, tela cheia) |

## Banco de dados (Supabase)

Projeto: `rpxrjawzkkpnzancmcif.supabase.co`. Não há migrations versionadas no repo além do arquivo solto `supabase-comentario-vagner.sql` — mudanças de schema devem ser aplicadas manualmente no painel do Supabase (ou via SQL script commitado, seguindo esse mesmo padrão).

Tabela principal conhecida: `pedidos_vendas` (pedidos/vendas por cliente/mês/SKU).

## Convenções ao editar

- Editar `index.html` diretamente; não há processo de build a rodar depois.
- CSS fica em `<style>` no `<head>`; JS fica em `<script>` no final do arquivo, tudo em escopo global (variáveis como `user`, `dadosLocais`, `coordAtual`, `mesAtual` são globais compartilhadas entre funções).
- Novas telas devem seguir o padrão `<div id="s-nome" class="screen" style="display:none">` + entrada correspondente em `renderNav`/`navTo`.
- Chamadas ao Supabase passam pela função helper `sb(path, opts)` (linha ~1362), que já injeta os headers `apikey`/`Authorization`.
- Toda edição salva localmente também dispara push automático para o Git remoto (ver hook acima) — evitar deixar o app em estado quebrado no meio de uma edição.
