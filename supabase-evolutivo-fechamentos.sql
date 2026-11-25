-- Fechamento mensal do Evolutivo: congela, por cliente, a meta e o realizado de um mês.
-- Rodar uma vez no SQL Editor do Supabase. RLS ligado e sem policy: só a service_role (api/) acessa.
-- mes = índice 0–11 (0 = janeiro), igual ao resto do sistema.
-- Fechar o mesmo mês de novo substitui as linhas (unique + upsert).

create table if not exists evolutivo_fechamentos (
  id uuid primary key default gen_random_uuid(),
  ano int not null,
  mes int not null check (mes between 0 and 11),
  cliente_nome text not null,
  coordenador text not null default '',
  media numeric,
  pct numeric,
  incremento numeric,
  meta numeric,
  realizado numeric,
  premio_potencial numeric,
  premio_conquistado numeric,
  parametros jsonb,
  criado_por text,
  criado_em timestamptz not null default now(),
  unique (ano, mes, cliente_nome, coordenador)
);

alter table evolutivo_fechamentos enable row level security;
