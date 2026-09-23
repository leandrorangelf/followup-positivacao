-- Campanha "Pote de Ouro" (set/2026): meta de caixas por cliente, alinhada com a
-- planilha "Pote de Ouro Set 2026". O Realizado é calculado ao vivo a partir de
-- pedidos_vendas (não é armazenado aqui) — esta tabela guarda só a Meta por cliente.
create table if not exists campanha_metas (
  id uuid primary key default gen_random_uuid(),
  campanha text not null,
  cliente_id uuid not null references clientes(id),
  coordenador text not null,
  meta_caixas numeric not null default 0,
  mes int not null,
  ano int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campanha, cliente_id)
);

alter table campanha_metas enable row level security;
-- Sem policy pra anon/authenticated (deny total) — só service_role acessa, igual às demais tabelas.
