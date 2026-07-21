# Sistema claro e contraste semântico

## Objetivo

Padronizar a linguagem visual do sistema inteiro em uma base clara, corrigindo
textos apagados e contrastes inconsistentes sem perder a identidade do menu
azul-marinho.

## Direção visual

- Fundo geral claro `#f4f7fb` e superfícies de conteúdo brancas.
- Texto principal azul-escuro `#172136`, texto secundário `#52627a` e bordas
  `#d9e2ee`.
- Menu lateral e estruturas de navegação em azul-marinho contínuo.
- Ciano/teal como destaque operacional e roxo reservado para seleção e ação
  principal.
- Verde, âmbar e vermelho somente como estados semânticos de desempenho,
  pendência e erro.

## Regras de destaque

- Desempenho igual ou acima da meta: verde.
- Desempenho próximo da meta: âmbar.
- Desempenho abaixo da meta ou pendência relevante: vermelho.
- Volume e indicadores operacionais: ciano/teal.
- Seleção atual e ação primária: roxo.

As cores semânticas devem aparecer principalmente em barras, números, badges e
fundos com tonalidade muito suave. O texto continua escuro sobre cartões
claros; nenhum texto claro será usado sobre fundo branco.

## Escopo de implementação

- Atualizar tokens CSS globais para que Dashboard, Vendas, Clientes, Metas,
  Pedidos e Relatórios compartilhem a mesma base.
- Corrigir cartões de produtos, tabelas, cabeçalhos e textos secundários que
  hoje usam cores claras em superfícies claras.
- Aplicar estados de desempenho às linhas e indicadores do Dashboard sem
  reestruturar dados ou navegação.
- Preservar responsividade, funcionamento e dependências atuais.

## Validação

- Verificar contraste visual dos principais textos e estados na captura do
  Dashboard.
- Executar os testes existentes, o teste estrutural do Dashboard e `node
  --check` nos scripts embutidos.
- Confirmar que nenhuma tela mantém texto quase branco sobre cartão claro.
