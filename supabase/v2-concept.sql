-- Resolve UK: "v2 concept" stage. Run this AFTER schema.sql, community.sql, dashboard.sql and
-- security-update.sql. It is safe to run again.
--
-- Adds an OPTIONAL account for the person reporting a problem (a "reporter"), separate from staff
-- accounts. Reporting without an account still works exactly as before; this only adds the choice.
-- A reporter account exists only so someone can come back to a report they sent, which the planned
-- "commercial route" (private-land quotes) needs: someone has to be able to pick a quote.
--
-- IMPORTANT: this needs public sign-up switched back on in Supabase (Authentication > Sign In /
-- Providers > "Allow new users to sign up"), because a reporter creates their own account. A
-- self-registered account still gets no staff access: that is a separate gate (the staff_profiles
-- table), untouched by this file.

-- ------------------------------------------------------------------ reporter accounts
create table if not exists public.reporter_profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at   timestamptz not null default now()
);

alter table public.reporter_profiles enable row level security;
revoke all on public.reporter_profiles from anon, authenticated;
grant select, insert, update (display_name) on public.reporter_profiles to authenticated;

drop policy if exists "a reporter reads their own profile" on public.reporter_profiles;
create policy "a reporter reads their own profile" on public.reporter_profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "a reporter creates their own profile" on public.reporter_profiles;
create policy "a reporter creates their own profile" on public.reporter_profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "a reporter renames their own profile" on public.reporter_profiles;
create policy "a reporter renames their own profile" on public.reporter_profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------------ linking a report to its reporter
-- Nullable: most reports still have no account behind them, exactly as before.
alter table public.reports add column if not exists reporter_id uuid references public.reporter_profiles (id);

-- A report can only be linked to the account of whoever is actually signed in and sending it, never
-- to someone else's account, and never by the public (anon) role, which has no account to link.
create or replace function public.reports_set_reporter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.reporter_id is not null and new.reporter_id is distinct from auth.uid() then
    raise exception 'A report can only be linked to your own account';
  end if;
  return new;
end $$;

revoke all on function public.reports_set_reporter() from public, anon, authenticated;

drop trigger if exists reports_set_reporter on public.reports;
create trigger reports_set_reporter before insert on public.reports
  for each row execute function public.reports_set_reporter();

grant insert (reporter_id) on public.reports to authenticated;

-- Check: reporter_profiles should exist and reports should have the new column.
select column_name from information_schema.columns
  where table_schema = 'public' and table_name = 'reports' and column_name = 'reporter_id';
select count(*) as reporter_profiles_table_exists from information_schema.tables
  where table_schema = 'public' and table_name = 'reporter_profiles';
