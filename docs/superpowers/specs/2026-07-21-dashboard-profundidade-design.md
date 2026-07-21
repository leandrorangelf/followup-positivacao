# Task 1 — Profundidade dos gráficos e legibilidade do Dashboard

## Objetivo

Melhorar a leitura dos gráficos do Dashboard sem adicionar biblioteca de
gráficos, preservando o padrão atual de CSS e HTML.

## Desenho aprovado

- Os gráficos de evolução mensal (`renderAdminDash` e `renderCoordDash`)
  exibem, nesta ordem vertical, volume real em caixas, percentual de meta,
  barra e mês.
- Uma linha horizontal tracejada marca 100% da meta. Sua posição é calculada
  com base no maior percentual exibido (`trendMax`), com proteção para valores
  vazios.
- O array de tendência do coordenador inclui `vol`, assim como o do admin.
- A tabela de performance recebe uma coluna “Tendência” com seis mini-barras
  CSS dos meses recentes. Os dados mensais são pré-calculados uma vez e cada
  coordenador tem sua série normalizada individualmente.
- A grade inferior passa a usar `1.3fr 1.1fr`; nomes e números do painel de
  produtos sobem para 13px, mantendo a quebra responsiva já existente.

## Validação

- Teste estático verifica a presença das estruturas, classes e dados de volume
  em ambas as funções.
- `node --check` valida o JavaScript embutido em `index.html`.
- Testes existentes relacionados ao Dashboard continuam sendo executados.

## Fora de escopo

Não criar dependência nova, não alterar o painel de cliente e não adicionar
fotos de produtos.
