alter table public.pedidos_vendas
add column if not exists comentario_vagner text;

alter table public.pedidos_vendas
add column if not exists comentario_fabiano text;
