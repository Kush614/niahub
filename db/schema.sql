-- NiaHub schema. Runs on InsForge-managed Postgres or any vanilla Postgres 15+.

create table if not exists users (
  id           text primary key,
  email        text unique,
  display_name text,
  avatar_url   text,
  plan         text not null default 'free',  -- 'free' | 'pro'
  created_at   timestamptz default now()
);

create table if not exists packs (
  pack_id              text primary key,
  display_name         text not null,
  tagline              text,
  description          text not null,
  curator_user_id      text references users(id),
  curator_org          text,
  sources              jsonb not null,
  refresh_cadence      text not null,
  nia_index_id         text not null,
  current_version      int  not null default 1,
  hallucination_score  numeric(4,3),
  baseline_score       numeric(4,3),
  install_count        int  not null default 0,
  query_count_7d       int  not null default 0,
  visibility           text not null default 'public',
  icon                 text,
  accent_color         text,
  tags                 text[] default '{}',
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists idx_packs_visibility on packs(visibility);
create index if not exists idx_packs_install_count on packs(install_count desc);

create table if not exists subscriptions (
  sub_id        text primary key,
  user_id       text references users(id),
  pack_id       text references packs(pack_id),
  token         text not null unique,
  agent_kind    text,
  installed_at  timestamptz default now(),
  last_query_at timestamptz
);

create index if not exists idx_subs_user on subscriptions(user_id);
create index if not exists idx_subs_pack on subscriptions(pack_id);

create table if not exists query_events (
  event_id    bigserial primary key,
  sub_id      text references subscriptions(sub_id),
  pack_id     text references packs(pack_id),
  query_text  text,
  chunks_used int,
  latency_ms  int,
  ts          timestamptz default now()
);

create index if not exists idx_qe_pack_ts on query_events(pack_id, ts desc);

create table if not exists refresh_runs (
  run_id       bigserial primary key,
  pack_id      text references packs(pack_id),
  trigger      text,
  status       text,
  docs_added   int,
  docs_changed int,
  duration_ms  int,
  ts           timestamptz default now()
);

create index if not exists idx_runs_pack_ts on refresh_runs(pack_id, ts desc);

create table if not exists pack_benchmarks (
  bench_id    bigserial primary key,
  pack_id     text references packs(pack_id),
  question    text not null,
  expected    text,
  baseline_ok boolean,
  with_pack_ok boolean,
  notes       text,
  ts          timestamptz default now()
);

create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_packs_touch on packs;
create trigger trg_packs_touch before update on packs
  for each row execute procedure touch_updated_at();
