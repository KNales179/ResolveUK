-- Adds a short bio and an avatar to a reporter's own profile (see v2-concept.sql for the base
-- reporter_profiles table), plus the storage policies that let them upload, replace and remove
-- their own avatar image. Run this after v2-concept.sql.

alter table public.reporter_profiles
  add column if not exists bio text check (bio is null or char_length(bio) <= 280),
  add column if not exists avatar_path text;

revoke update on public.reporter_profiles from authenticated;
grant update (display_name, bio, avatar_path) on public.reporter_profiles to authenticated;

-- Avatars live in the same public report-photos bucket as report photos (already public, 5 MB,
-- jpeg/png/webp only — see schema.sql), under avatars/<user id>.<ext>, so a policy keyed on the
-- signed-in user's own id is all that's needed to keep everyone to their own file; nothing extra
-- to set up on the bucket itself.
--
-- A SELECT policy too, not just insert/update/delete: the bucket being "public" only governs the
-- storage API's own file-serving, not row visibility on this table under RLS — without this, an
-- avatar row is invisible to any query (including the USING clause a DELETE needs to find its own
-- row), so replacing or removing one would silently affect nothing. Open to anon too, same as the
-- report photos, since avatars are meant to be publicly viewable.
drop policy if exists "anyone can view an avatar" on storage.objects;
create policy "anyone can view an avatar" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'report-photos' and name ~ '^avatars/');

drop policy if exists "a reporter uploads their own avatar" on storage.objects;
create policy "a reporter uploads their own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'report-photos'
    and name ~ ('^avatars/' || auth.uid()::text || '\.(jpg|jpeg|png|webp)$')
  );

drop policy if exists "a reporter replaces their own avatar" on storage.objects;
create policy "a reporter replaces their own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'report-photos' and name ~ ('^avatars/' || auth.uid()::text || '\.(jpg|jpeg|png|webp)$'))
  with check (bucket_id = 'report-photos' and name ~ ('^avatars/' || auth.uid()::text || '\.(jpg|jpeg|png|webp)$'));

drop policy if exists "a reporter removes their own avatar" on storage.objects;
create policy "a reporter removes their own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'report-photos' and name ~ ('^avatars/' || auth.uid()::text || '\.(jpg|jpeg|png|webp)$'));
