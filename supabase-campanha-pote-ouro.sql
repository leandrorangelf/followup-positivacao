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

alter table campanha_metas add column if not exists incremento_caixas numeric not null default 0;
-- Incremento = Meta − Média Abr-Jun (snapshot da planilha, não recalculado ao editar a Meta).
-- Usado só pra Prêmio Potencial = Incremento × valor_premio_caixa (campanha_config).

-- Gatilho da campanha (meta mínima da fábrica) e valor do prêmio por caixa — 1 linha por campanha.
create table if not exists campanha_config (
  campanha text primary key,
  meta_fabrica_minima numeric not null default 0,
  volume_fabrica_realizado numeric not null default 0, -- lançado manualmente no fechamento do mês
  valor_premio_caixa numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table campanha_config enable row level security;

-- Elegibilidade por representante (mediação vencida bloqueia o ranking, mesmo com gatilho liberado).
create table if not exists campanha_participantes (
  id uuid primary key default gen_random_uuid(),
  campanha text not null,
  coordenador text not null,
  mediacao_vencida boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (campanha, coordenador)
);
alter table campanha_participantes enable row level security;

alter table campanha_metas add column if not exists is_fabrica boolean not null default true;
-- Marca os 39 clientes do bloco "Clientes da fábrica" da planilha (os outros 17 são
-- sub-clientes de distribuidor). Usado pra calcular a referência automática do volume
-- da fábrica (soma do Realizado desses 39), exibida ao lado do campo manual de fechamento.
