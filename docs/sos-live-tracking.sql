-- Safety on Speed SOS live tracking schema.
-- This project already uses a richer SOS schema than the minimal example.
-- Mapping to the simplified shape from the prompt:
--   token      -> share_token
--   latitude   -> last_lat
--   longitude  -> last_lng
--   created_at -> started_at
--   updated_at -> last_updated_at
--   stopped    -> ended

create extension if not exists pgcrypto;

create table if not exists public.sos_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('quick', 'emergency')),
  share_token text not null unique default gen_random_uuid()::text,
  status text not null default 'active' check (status in ('active', 'ended')),
  user_name text,
  guardian_count integer not null default 0,
  alert_delivery_method text,
  alert_delivery_status text,
  first_lat double precision,
  first_lng double precision,
  last_lat double precision,
  last_lng double precision,
  accuracy double precision,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_updated_at timestamptz
);

create unique index if not exists sos_sessions_one_active_per_user
  on public.sos_sessions (user_id)
  where status = 'active';

alter table public.sos_sessions enable row level security;

drop policy if exists "Users can insert their own sos sessions" on public.sos_sessions;
drop policy if exists "Users can update their own sos sessions" on public.sos_sessions;
drop policy if exists "Users can view their own sos sessions" on public.sos_sessions;
drop policy if exists "Anyone can view active sos sessions" on public.sos_sessions;

create policy "Users can insert their own sos sessions"
  on public.sos_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sos sessions"
  on public.sos_sessions
  for update
  using (auth.uid() = user_id);

create policy "Users can view their own sos sessions"
  on public.sos_sessions
  for select
  using (auth.uid() = user_id);

create policy "Anyone can view active sos sessions"
  on public.sos_sessions
  for select
  using (status = 'active');
