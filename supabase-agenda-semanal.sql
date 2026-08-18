create table if not exists public.agenda_semanal (
  id uuid primary key default gen_random_uuid(),
  coordenador text not null,
  data date not null,
  tipo text not null default 'escritorio',
  cidade text,
  estado text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coordenador, data)
);

alter table public.agenda_semanal enable row level security;
