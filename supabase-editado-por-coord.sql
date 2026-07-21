alter table public.pedidos_vendas
add column if not exists editado_por text;

alter table public.pedidos_vendas
add column if not exists editado_em timestamptz;
