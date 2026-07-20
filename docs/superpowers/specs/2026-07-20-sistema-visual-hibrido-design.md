# Sistema Visual Híbrido — Design aprovado

## Objetivo

Aplicar uma linguagem visual única a todas as 15 telas do Follow-up Positivação, eliminando a coexistência das paletas antiga e nova e garantindo legibilidade consistente nos contextos claro e escuro.

## Direção visual

- Estrutura em navy: sidebar, topbar, TV e cabeçalhos estruturais.
- Conteúdo em canvas claro com superfícies brancas.
- Roxo `#6547d9` como única cor de ação, seleção e foco.
- Verde, âmbar e vermelho reservados a estados semânticos.
- Quatro raios, duas sombras e um foco padronizado.
- Texto secundário nunca menor que 11px, exceto elementos gráficos e a TV responsiva.

## Cobertura

O sistema deve cobrir `s-registro`, `s-tv`, `s-login`, `s-gestao`, `s-planilha`, `s-dash`, `s-ped`, `s-cli`, `s-metas`, `s-premiacao`, `s-vendas`, `s-vfn`, `s-vficha`, `s-forecast`, `s-log` e `s-relatorios`, além de modais, tabelas, formulários, chips, estados vazios, toasts e navegação responsiva.

## Exceções deliberadas

- A TV permanece escura e usa escala tipográfica própria com `clamp()`.
- A janela de impressão permanece autônoma porque não herda os tokens do documento principal.
- Cores de séries de gráficos permanecem distintas quando codificam dados, mas não assumem papel de ação.
- Círculos e microbarras de gráfico preservam geometria específica.

## Critérios de aceitação

- Apenas um bloco `:root` define o sistema de tokens.
- Nenhuma função de render viva injeta a paleta antiga para texto, card, borda ou canvas.
- Todas as telas usam a mesma hierarquia de botões, campos, cards, tabelas e estados.
- O JavaScript inline compila.
- A suíte existente passa.
- As 15 telas são incluídas numa auditoria automatizada de cobertura visual e numa inspeção responsiva.

