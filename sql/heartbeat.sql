-- Keep-alive heartbeat. Run once in the Supabase SQL Editor. Safe to re-run.
-- The table is not exposed to the Data API (RLS on, no policies, no grants);
-- the only way in is the keep_alive() function, which writes one timestamp.

create table if not exists public.heartbeat (
  id int primary key default 1 check (id = 1),
  last_ping timestamptz not null default now()
);

alter table public.heartbeat enable row level security;

create or replace function public.keep_alive()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  insert into public.heartbeat (id, last_ping) values (1, now())
  on conflict (id) do update set last_ping = excluded.last_ping
  returning last_ping;
$$;

revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated, service_role;
