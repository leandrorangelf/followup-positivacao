# Faturamento parcial como faturado operacional

## Objetivo

Pedidos com qualquer quantidade faturada devem sair da pendência operacional e contar como faturados, sem perder o saldo restante para uma continuação posterior.

## Comportamento

- `qty_faturada > 0` classifica o pedido como faturado operacionalmente.
- O filtro `Pendentes` mostra apenas pedidos sem nenhuma caixa faturada.
- Um filtro separado `Faturados parciais` mostra pedidos com faturamento e saldo restante.
- O saldo e o botão de continuação permanecem disponíveis no pedido parcial.
- O kanban agrupa o pedido parcial em `Faturado / Entregue`.

## Fora de escopo

Não alterar o cálculo do saldo, as quantidades faturadas, o histórico ou a conclusão definitiva do pedido.
