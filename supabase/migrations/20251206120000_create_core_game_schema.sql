-- migration: create core game schema for mini-games platform
-- purpose: define domain tables and row-level security policies for profiles, games, game_sessions, scores, and ui_strings
-- affected tables:
--   - public.profiles
--   - public.games
--   - public.game_sessions
--   - public.scores
--   - public.ui_strings
-- notes:
--   - relies on auth.users provided by supabase for user identities
--   - uses gen_random_uuid() for primary keys (pgcrypto extension is typically enabled in supabase)
--   - all tables have row level security (rls) enabled by default
--   - policies are defined separately for each supabase role (anon, authenticated) and each operation (select/insert/update/delete)

-- ensure required extension for gen_random_uuid() is available.
create extension if not exists pgcrypto with schema public;

--------------------------------------------------------------------------------
-- table: public.profiles
-- description:
--   domain profile for a user, linked 1–1 to auth.users.
--   stores public-facing nickname used in rankings and ui.
--------------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nick text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable row level security on profiles to enforce per-user access control.
alter table public.profiles enable row level security;

-- rls policies for public.profiles

-- select (anon): allow everyone to read profiles for public rankings.
create policy profiles_select_anon
on public.profiles
for select
to anon
using (true);

-- select (authenticated): allow all authenticated users to read profiles.
create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (true);

-- insert (anon): explicitly deny profile creation for anon role.
-- this ensures only authenticated users can create profiles.
create policy profiles_insert_anon_deny
on public.profiles
for insert
to anon
with check (false);

-- insert (authenticated): allow a user to create exactly their own profile.
create policy profiles_insert_authenticated
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

-- update (anon): explicitly deny updates for anon role.
create policy profiles_update_anon_deny
on public.profiles
for update
to anon
using (false)
with check (false);

-- update (authenticated): allow users to update only their own profile.
create policy profiles_update_authenticated
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- delete (anon): explicitly deny deletes for anon role.
create policy profiles_delete_anon_deny
on public.profiles
for delete
to anon
using (false);

-- delete (authenticated): explicitly deny deletes for authenticated users.
-- deletion should be handled only by service_role / admin if needed.
create policy profiles_delete_authenticated_deny
on public.profiles
for delete
to authenticated
using (false);

--------------------------------------------------------------------------------
-- table: public.games
-- description:
--   configuration of mini-games available on the platform.
--   controls basic metadata: code, name, description and active flag.
--------------------------------------------------------------------------------

create table public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- enable row level security on games.
alter table public.games enable row level security;

-- rls policies for public.games

-- select (anon): allow reading game configuration for public use.
create policy games_select_anon
on public.games
for select
to anon
using (true);

-- select (authenticated): allow reading game configuration for authenticated users.
create policy games_select_authenticated
on public.games
for select
to authenticated
using (true);

-- insert (anon): deny inserts; only service_role/admin should modify catalog.
create policy games_insert_anon_deny
on public.games
for insert
to anon
with check (false);

-- insert (authenticated): deny inserts for regular authenticated users.
create policy games_insert_authenticated_deny
on public.games
for insert
to authenticated
with check (false);

-- update (anon): deny updates.
create policy games_update_anon_deny
on public.games
for update
to anon
using (false)
with check (false);

-- update (authenticated): deny updates for regular authenticated users.
create policy games_update_authenticated_deny
on public.games
for update
to authenticated
using (false)
with check (false);

-- delete (anon): deny deletes.
create policy games_delete_anon_deny
on public.games
for delete
to anon
using (false);

-- delete (authenticated): deny deletes for regular authenticated users.
create policy games_delete_authenticated_deny
on public.games
for delete
to authenticated
using (false);

--------------------------------------------------------------------------------
-- table: public.game_sessions
-- description:
--   a single play session of a game.
--   used for counting played games (including guest sessions) and linking to scores.
--------------------------------------------------------------------------------

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete restrict,
  user_id uuid null references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  is_abandoned boolean not null default false
);

-- enable row level security on game_sessions.
alter table public.game_sessions enable row level security;

-- rls policies for public.game_sessions

-- select (anon): deny reading raw sessions to protect user activity data.
create policy game_sessions_select_anon_deny
on public.game_sessions
for select
to anon
using (false);

-- select (authenticated): allow users to see only their own sessions.
create policy game_sessions_select_authenticated
on public.game_sessions
for select
to authenticated
using (user_id = auth.uid());

-- insert (anon): allow creating sessions with no user_id (guest play).
create policy game_sessions_insert_anon
on public.game_sessions
for insert
to anon
with check (user_id is null);

-- insert (authenticated): allow creating sessions either as guest (null) or owned by the current user.
create policy game_sessions_insert_authenticated
on public.game_sessions
for insert
to authenticated
with check (user_id is null or user_id = auth.uid());

-- update (anon): deny updates; guest sessions should only be modified by backend/service_role.
create policy game_sessions_update_anon_deny
on public.game_sessions
for update
to anon
using (false)
with check (false);

-- update (authenticated): deny updates for regular users; state transitions should be handled by backend/service_role.
create policy game_sessions_update_authenticated_deny
on public.game_sessions
for update
to authenticated
using (false)
with check (false);

-- delete (anon): deny deletes.
create policy game_sessions_delete_anon_deny
on public.game_sessions
for delete
to anon
using (false);

-- delete (authenticated): deny deletes for regular users.
create policy game_sessions_delete_authenticated_deny
on public.game_sessions
for delete
to authenticated
using (false);

--------------------------------------------------------------------------------
-- table: public.scores
-- description:
--   final score for a game session, used for rankings and statistics.
--   append-only; updates are not allowed for regular users.
--------------------------------------------------------------------------------

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid not null unique references public.game_sessions (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete restrict,
  user_id uuid null references auth.users (id) on delete set null,
  score_value numeric(10,2) not null,
  reaction_time_ms integer null,
  hits integer null,
  created_at timestamptz not null default now()
);

-- enable row level security on scores.
alter table public.scores enable row level security;

-- rls policies for public.scores

-- select (anon): allow everyone to read scores for public leaderboards.
create policy scores_select_anon
on public.scores
for select
to anon
using (true);

-- select (authenticated): allow all authenticated users to read scores.
create policy scores_select_authenticated
on public.scores
for select
to authenticated
using (true);

-- insert (anon): deny inserting scores for anon role.
-- guests must log in before saving scores tied to an account.
create policy scores_insert_anon_deny
on public.scores
for insert
to anon
with check (false);

-- insert (authenticated): allow inserting scores only for the current user.
create policy scores_insert_authenticated
on public.scores
for insert
to authenticated
with check (user_id is not null and user_id = auth.uid());

-- update (anon): deny updates to enforce append-only behavior.
create policy scores_update_anon_deny
on public.scores
for update
to anon
using (false)
with check (false);

-- update (authenticated): deny updates for regular users; scores should not be mutable.
create policy scores_update_authenticated_deny
on public.scores
for update
to authenticated
using (false)
with check (false);

-- delete (anon): deny deletes.
create policy scores_delete_anon_deny
on public.scores
for delete
to anon
using (false);

-- delete (authenticated): deny deletes for regular users; deletions should be handled by service_role/admin if ever needed.
create policy scores_delete_authenticated_deny
on public.scores
for delete
to authenticated
using (false);

--------------------------------------------------------------------------------
-- table: public.ui_strings
-- description:
--   optional table for localized ui strings (labels, messages) to support future i18n.
--------------------------------------------------------------------------------

create table public.ui_strings (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  locale text not null default 'pl',
  value text not null,
  created_at timestamptz not null default now(),
  unique (key, locale)
);

-- enable row level security on ui_strings.
alter table public.ui_strings enable row level security;

-- rls policies for public.ui_strings

-- select (anon): allow everyone to read ui strings.
create policy ui_strings_select_anon
on public.ui_strings
for select
to anon
using (true);

-- select (authenticated): allow authenticated users to read ui strings.
create policy ui_strings_select_authenticated
on public.ui_strings
for select
to authenticated
using (true);

-- insert (anon): deny creating ui strings.
create policy ui_strings_insert_anon_deny
on public.ui_strings
for insert
to anon
with check (false);

-- insert (authenticated): deny inserting ui strings for regular users.
create policy ui_strings_insert_authenticated_deny
on public.ui_strings
for insert
to authenticated
with check (false);

-- update (anon): deny updates.
create policy ui_strings_update_anon_deny
on public.ui_strings
for update
to anon
using (false)
with check (false);

-- update (authenticated): deny updates for regular users.
create policy ui_strings_update_authenticated_deny
on public.ui_strings
for update
to authenticated
using (false)
with check (false);

-- delete (anon): deny deletes.
create policy ui_strings_delete_anon_deny
on public.ui_strings
for delete
to anon
using (false);

-- delete (authenticated): deny deletes for regular users.
create policy ui_strings_delete_authenticated_deny
on public.ui_strings
for delete
to authenticated
using (false);


