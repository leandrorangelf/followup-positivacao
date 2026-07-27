alter table public.pedidos_vendas
add column if not exists prazo_status text,
add column if not exists prazo_solicitado_dias integer,
add column if not exists prazo_solicitado_por text,
add column if not exists prazo_solicitado_em timestamptz,
add column if not exists prazo_decidido_por text,
add column if not exists prazo_decidido_em timestamptz;
