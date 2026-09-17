-- ================================================================
-- Stock Report — Row Level Security lockdown
--
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run any time — every policy is dropped and recreated.
--
-- What this does:
--   - Reads (SELECT) stay open to everyone, logged in or not — the
--     public dashboard keeps working exactly as it does today.
--   - Any LOGGED-IN player can still add a rival (players INSERT),
--     start a new rivalry involving themselves (rivalries INSERT),
--     and log matches for a rivalry they're part of (matches INSERT).
--     This preserves the existing "+ SESSION → START NEW RIVALRY"
--     flow for non-admin users.
--   - UPDATE and DELETE on players / rivalries / matches / invitations
--     are restricted to the account with players.is_admin = true
--     (currently just one account). This is what actually enforces the
--     admin page — without this, the admin UI's buttons were only
--     hidden from other users, not blocked at the database.
--   - A non-admin can never grant themselves admin: the players
--     INSERT policy forces is_admin = false on any row they create.
--
-- IMPORTANT: this version first drops every EXISTING policy on these
-- five tables, whatever they're named. The first version of this
-- script only added new policies without removing the old wide-open
-- ones — Postgres OR's multiple permissive policies together, so the
-- old "allow everyone" rule was still silently granting full access
-- underneath the new restrictive-looking ones. Verified live: an
-- anonymous, logged-out request could still insert and update rows
-- after the first script ran. That test row/edit was immediately
-- cleaned up — no lasting changes were made to real data.
-- ================================================================

-- Step 0: remove every existing policy on these tables, regardless of name,
-- so nothing from a prior (wide-open) setup is left stacking on top of the
-- new rules below.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('players','rivalries','matches','invitations','characters')
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- Helper: is the currently-authenticated request coming from the admin account?
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.players
    where auth_id = auth.uid() and is_admin = true
  );
$$;

grant execute on function public.is_current_user_admin() to anon, authenticated;

-- ── players ──────────────────────────────────────────────────
alter table public.players enable row level security;

drop policy if exists "players_select_all" on public.players;
create policy "players_select_all" on public.players
  for select using (true);

-- Any logged-in user can add a rival's placeholder row, but cannot
-- claim someone else's auth_id or grant themselves is_admin.
drop policy if exists "players_insert_self_or_rival" on public.players;
create policy "players_insert_self_or_rival" on public.players
  for insert to authenticated
  with check (
    public.is_current_user_admin()
    or (
      coalesce(is_admin, false) = false
      and (auth_id is null or auth_id = auth.uid())
    )
  );

drop policy if exists "players_update_admin_only" on public.players;
create policy "players_update_admin_only" on public.players
  for update to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists "players_delete_admin_only" on public.players;
create policy "players_delete_admin_only" on public.players
  for delete to authenticated
  using (public.is_current_user_admin());

-- ── rivalries ────────────────────────────────────────────────
alter table public.rivalries enable row level security;

drop policy if exists "rivalries_select_all" on public.rivalries;
create policy "rivalries_select_all" on public.rivalries
  for select using (true);

-- A logged-in user can only create a rivalry that includes themself.
drop policy if exists "rivalries_insert_participant" on public.rivalries;
create policy "rivalries_insert_participant" on public.rivalries
  for insert to authenticated
  with check (
    public.is_current_user_admin()
    or exists (
      select 1 from public.players p
      where p.auth_id = auth.uid() and p.id in (p1_id, p2_id)
    )
  );

drop policy if exists "rivalries_update_admin_only" on public.rivalries;
create policy "rivalries_update_admin_only" on public.rivalries
  for update to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists "rivalries_delete_admin_only" on public.rivalries;
create policy "rivalries_delete_admin_only" on public.rivalries
  for delete to authenticated
  using (public.is_current_user_admin());

-- ── matches ──────────────────────────────────────────────────
alter table public.matches enable row level security;

drop policy if exists "matches_select_all" on public.matches;
create policy "matches_select_all" on public.matches
  for select using (true);

-- A logged-in user can only log matches for a rivalry they're part of.
drop policy if exists "matches_insert_participant" on public.matches;
create policy "matches_insert_participant" on public.matches
  for insert to authenticated
  with check (
    public.is_current_user_admin()
    or exists (
      select 1 from public.rivalries r
      join public.players p on p.id in (r.p1_id, r.p2_id)
      where r.id = matches.rivalry_id and p.auth_id = auth.uid()
    )
  );

drop policy if exists "matches_update_admin_only" on public.matches;
create policy "matches_update_admin_only" on public.matches
  for update to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists "matches_delete_admin_only" on public.matches;
create policy "matches_delete_admin_only" on public.matches
  for delete to authenticated
  using (public.is_current_user_admin());

-- ── invitations ──────────────────────────────────────────────
alter table public.invitations enable row level security;

drop policy if exists "invitations_select_all" on public.invitations;
create policy "invitations_select_all" on public.invitations
  for select using (true);

drop policy if exists "invitations_insert_own" on public.invitations;
create policy "invitations_insert_own" on public.invitations
  for insert to authenticated
  with check (
    public.is_current_user_admin()
    or exists (
      select 1 from public.players p
      where p.auth_id = auth.uid() and p.id = invited_by_id
    )
  );

drop policy if exists "invitations_update_admin_or_inviter" on public.invitations;
create policy "invitations_update_admin_or_inviter" on public.invitations
  for update to authenticated
  using (
    public.is_current_user_admin()
    or exists (
      select 1 from public.players p
      where p.auth_id = auth.uid() and p.id = invited_by_id
    )
  )
  with check (
    public.is_current_user_admin()
    or exists (
      select 1 from public.players p
      where p.auth_id = auth.uid() and p.id = invited_by_id
    )
  );

drop policy if exists "invitations_delete_admin_only" on public.invitations;
create policy "invitations_delete_admin_only" on public.invitations
  for delete to authenticated
  using (public.is_current_user_admin());

-- ── characters (reference data — the app never writes to this table) ──
alter table public.characters enable row level security;

drop policy if exists "characters_select_all" on public.characters;
create policy "characters_select_all" on public.characters
  for select using (true);

drop policy if exists "characters_write_admin_only" on public.characters;
create policy "characters_write_admin_only" on public.characters
  for all to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

-- ================================================================
-- Verification — run this separately afterward to sanity-check the
-- result. You should see exactly the policies created above (one
-- select policy per table, plus insert/update/delete as described),
-- nothing else, and nothing with roles = "{public}" on insert/update/
-- delete rows (only "select" rows should show "{public}").
-- ================================================================
-- select schemaname, tablename, policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, cmd;
