-- Notificações via Web Push + sininho in-app (ver docs/superpowers/specs/2026-07-29-notificacoes-web-push-design.md)
-- RLS ligado, sem policy — só service_role acessa (mesmo padrão das outras 8 tabelas do projeto).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_usuario_idx on public.push_subscriptions (usuario);
alter table public.push_subscriptions enable row level security;

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  tipo text not null,
  titulo text not null,
  corpo text,
  url text,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notificacoes_usuario_lida_idx on public.notificacoes (usuario, lida);
alter table public.notificacoes enable row level security;
