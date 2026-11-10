-- Adds a short bio and an avatar to a staff member's own profile (see dashboard.sql for the base
-- staff_profiles table), plus the storage policies that let them upload, replace and remove their
-- own avatar image. Run this after dashboard.sql and security-update.sql.

alter table public.staff_profiles
  add column if not exists bio text check (bio is null or char_length(bio) <= 280),
  add column if not exists avatar_path text;

-- staff_profiles has no column grants at all yet (dashboard.sql revokes everything and routes every
-- write through an admin-only security definer function) — this adds just enough for a staff member
-- to edit their own bio and avatar, nothing else (display_name, role, body_id, active stay
-- admin-managed via Manage).
grant update (bio, avatar_path) on public.staff_profiles to authenticated;

drop policy if exists "staff can update their own bio and avatar" on public.staff_profiles;
create policy "staff can update their own bio and avatar" on public.staff_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Staff avatars live in the same public report-photos bucket as report and reporter-avatar photos
-- (already public, 5 MB, jpeg/png/webp only — see schema.sql), under staff-avatars/<user id>.<ext>
-- — a separate prefix from reporters' avatars/<user id>.<ext>, since the same person could in
-- principle have both a reporter account and a staff account on the same email/user id.
--
-- A SELECT policy too, not just insert/update/delete: the bucket being "public" only governs the
-- storage API's own file-serving, not row visibility on this table under RLS — without this, an
-- avatar row is invisible to any query (including the USING clause a DELETE needs to find its own
-- row), so replacing or removing one would silently affect nothing. Open to anon too, same as
-- report photos and reporter avatars, since staff avatars are meant to be publicly viewable too.
drop policy if exists "anyone can view a staff avatar" on storage.objects;
create policy "anyone can view a staff avatar" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'report-photos' and name ~ '^staff-avatars/');

drop policy if exists "staff can upload their own avatar" on storage.objects;
create policy "staff can upload their own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'report-photos'
    and name ~ ('^staff-avatars/' || auth.uid()::text || '\.(jpg|jpeg|png|webp)$')
  );

drop policy if exists "staff can replace their own avatar" on storage.objects;
create policy "staff can replace their own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'report-photos' and name ~ ('^staff-avatars/' || auth.uid()::text || '\.(jpg|jpeg|png|webp)$'))
  with check (bucket_id = 'report-photos' and name ~ ('^staff-avatars/' || auth.uid()::text || '\.(jpg|jpeg|png|webp)$'));

drop policy if exists "staff can remove their own avatar" on storage.objects;
create policy "staff can remove their own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'report-photos' and name ~ ('^staff-avatars/' || auth.uid()::text || '\.(jpg|jpeg|png|webp)$'));
