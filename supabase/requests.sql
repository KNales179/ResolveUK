-- Resolve UK: private land clearance requests and quotes (stage 5 of the app).
--
-- Run this AFTER comments.sql (or at least after jobs.sql). It is safe to run again.
--
-- Fly-tipping on private land (a farm, a car park, a shop's yard) is the landowner's to clear, not
-- the council's. Here the landowner, or someone acting for them, posts a clearance request with a
-- photo and the spot; licensed clearance companies whose area covers that spot send quotes; the
-- person who asked accepts one; the company does the job and marks it done.
--
-- Rules:
--   - Only signed-in people can post a request, as themselves.
--   - A request is seen by the person who posted it, by Resolve admins, and by members of approved
--     clearance companies whose area covers the spot (while it is open, or once they have quoted).
--   - Only active members of an approved clearance company covering the spot can quote, once per
--     company per request, while the request is open.
--   - Quotes are seen by the person who asked, the company that sent them, and admins.
--   - The person who asked accepts one quote; the others are declined automatically.
--   - Only the company whose quote was accepted gets the asker's contact details, through
--     request_contact(), and only that company can mark the job done.
--   - Everyone involved is notified at each step.

-- Is a point inside an area (a GeoJSON polygon, outer ring only)?
create or replace function public.area_covers(p_area jsonb, p_lat double precision, p_lng double precision)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  ring jsonb := p_area -> 'coordinates' -> 0;
  n int := coalesce(jsonb_array_length(p_area -> 'coordinates' -> 0), 0);
  i int; j int; xi double precision; yi double precision; xj double precision; yj double precision;
  inside boolean := false;
begin
  if n < 4 then return false; end if;
  j := n - 1;
  for i in 0 .. n - 1 loop
    xi := (ring -> i ->> 0)::double precision; yi := (ring -> i ->> 1)::double precision;
    xj := (ring -> j ->> 0)::double precision; yj := (ring -> j ->> 1)::double precision;
    if ((yi > p_lat) <> (yj > p_lat)) and (p_lng < (xj - xi) * (p_lat - yi) / (yj - yi) + xi) then
      inside := not inside;
    end if;
    j := i;
  end loop;
  return inside;
end $$;

create table if not exists public.clearance_requests (
  id                uuid primary key default gen_random_uuid(),
  requester_id      uuid not null references auth.users (id) on delete cascade,
  requester_name    text not null default 'A landowner',
  land_type         text not null check (land_type in ('farm', 'car_park', 'business', 'garden', 'estate', 'other')),
  description       text not null check (char_length(btrim(description)) between 10 and 1000),
  waste_note        text check (waste_note is null or char_length(waste_note) <= 300),
  photo_path        text check (photo_path is null or photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'),
  lat               double precision not null check (lat between 49 and 61),
  lng               double precision not null check (lng between -9 and 2.5),
  place_label       text not null check (char_length(btrim(place_label)) between 2 and 120),
  access_note       text check (access_note is null or char_length(access_note) <= 300),
  report_id         uuid references public.reports (id) on delete set null,
  status            text not null default 'open' check (status in ('open', 'accepted', 'done', 'cancelled')),
  accepted_quote_id uuid,
  created_at        timestamptz not null default now(),
  done_at           timestamptz,
  done_note         text check (done_note is null or char_length(done_note) <= 500),
  done_photo_path   text check (done_photo_path is null or done_photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$')
);
create index if not exists clearance_requests_status_idx on public.clearance_requests (status, created_at desc);
create index if not exists clearance_requests_requester_idx on public.clearance_requests (requester_id);

create table if not exists public.clearance_quotes (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.clearance_requests (id) on delete cascade,
  org_id       uuid not null references public.organisations (id) on delete cascade,
  author_id    uuid not null references auth.users (id) on delete cascade,
  price_pence  integer not null check (price_pence between 100 and 10000000),
  when_text    text not null check (char_length(btrim(when_text)) between 2 and 120),
  message      text check (message is null or char_length(message) <= 600),
  status       text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'withdrawn')),
  created_at   timestamptz not null default now()
);
create unique index if not exists clearance_quotes_one_per_company on public.clearance_quotes (request_id, org_id) where status in ('sent', 'accepted');
create index if not exists clearance_quotes_org_idx on public.clearance_quotes (org_id);

alter table public.clearance_requests enable row level security;
alter table public.clearance_quotes enable row level security;
revoke all on public.clearance_requests, public.clearance_quotes from anon, authenticated;
grant select on public.clearance_requests, public.clearance_quotes to authenticated;
-- Every change goes through the functions below.

-- Is the person asking an active member of an approved clearance company covering this spot?
create or replace function public.covering_company_member(p_lat double precision, p_lng double precision)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members m join public.organisations o on o.id = m.org_id
    where m.user_id = auth.uid() and m.status = 'active' and o.status = 'approved' and o.kind = 'commercial'
      and public.area_covers(o.area, p_lat, p_lng))
$$;
create or replace function public.quoted_on(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clearance_quotes q join public.organisation_members m on m.org_id = q.org_id
    where q.request_id = p_request and m.user_id = auth.uid() and m.status = 'active')
$$;
revoke all on function public.covering_company_member(double precision, double precision), public.quoted_on(uuid) from public;
grant execute on function public.covering_company_member(double precision, double precision), public.quoted_on(uuid) to authenticated;

drop policy if exists "the asker sees their own requests" on public.clearance_requests;
create policy "the asker sees their own requests" on public.clearance_requests
  for select to authenticated using (requester_id = auth.uid());
drop policy if exists "covering companies see open requests" on public.clearance_requests;
create policy "covering companies see open requests" on public.clearance_requests
  for select to authenticated using (status = 'open' and public.covering_company_member(lat, lng));
drop policy if exists "companies see requests they quoted on" on public.clearance_requests;
create policy "companies see requests they quoted on" on public.clearance_requests
  for select to authenticated using (public.quoted_on(id));
drop policy if exists "admins see every request" on public.clearance_requests;
create policy "admins see every request" on public.clearance_requests
  for select to authenticated using (coalesce(public.staff_role() = 'resolve_admin', false));

drop policy if exists "the asker sees quotes on their request" on public.clearance_quotes;
create policy "the asker sees quotes on their request" on public.clearance_quotes
  for select to authenticated using (exists (select 1 from public.clearance_requests r where r.id = request_id and r.requester_id = auth.uid()));
drop policy if exists "a company sees its own quotes" on public.clearance_quotes;
create policy "a company sees its own quotes" on public.clearance_quotes
  for select to authenticated using (public.is_org_member(org_id));
drop policy if exists "admins see every quote" on public.clearance_quotes;
create policy "admins see every quote" on public.clearance_quotes
  for select to authenticated using (coalesce(public.staff_role() = 'resolve_admin', false));

-- Posting a request. Every approved clearance company covering the spot hears about it.
create or replace function public.create_clearance_request(
  p_land_type text, p_description text, p_place_label text, p_lat double precision, p_lng double precision,
  p_waste_note text default null, p_access_note text default null, p_photo text default null, p_report uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'Sign in to ask for a clearance quote'; end if;
  v_name := coalesce((select nullif(btrim(display_name), '') from public.reporter_profiles where id = auth.uid()), 'A landowner');
  insert into public.clearance_requests (requester_id, requester_name, land_type, description, waste_note, photo_path, lat, lng, place_label, access_note, report_id)
  values (auth.uid(), v_name, p_land_type, btrim(p_description), nullif(btrim(coalesce(p_waste_note, '')), ''), p_photo, p_lat, p_lng,
          btrim(p_place_label), nullif(btrim(coalesce(p_access_note, '')), ''), p_report)
  returning id into v_id;
  insert into public.notifications (user_id, org_id, title, body)
  select m.user_id, o.id, 'New clearance request near ' || o.area_label, left(btrim(p_place_label) || ': ' || btrim(p_description), 140)
  from public.organisations o join public.organisation_members m on m.org_id = o.id
  where o.kind = 'commercial' and o.status = 'approved' and m.status = 'active' and public.area_covers(o.area, p_lat, p_lng);
  return v_id;
end $$;

-- A clearance company quotes on an open request in its area.
create or replace function public.send_quote(p_request uuid, p_org uuid, p_price_pence integer, p_when text, p_message text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_req public.clearance_requests; v_org public.organisations; v_id uuid;
begin
  select * into v_req from public.clearance_requests where id = p_request;
  if not found then raise exception 'No such request'; end if;
  if v_req.status <> 'open' then raise exception 'This request is no longer taking quotes'; end if;
  select * into v_org from public.organisations where id = p_org;
  if not found or v_org.kind <> 'commercial' or v_org.status <> 'approved' then raise exception 'Only an approved clearance company can quote'; end if;
  if not public.is_org_member(p_org) then raise exception 'Only a member of the company can quote for it'; end if;
  if not public.area_covers(v_org.area, v_req.lat, v_req.lng) then raise exception 'This request is outside your company''s area'; end if;
  if exists (select 1 from public.clearance_quotes where request_id = p_request and org_id = p_org and status in ('sent', 'accepted')) then
    raise exception 'Your company has already quoted on this request';
  end if;
  insert into public.clearance_quotes (request_id, org_id, author_id, price_pence, when_text, message)
  values (p_request, p_org, auth.uid(), p_price_pence, btrim(p_when), nullif(btrim(coalesce(p_message, '')), ''))
  returning id into v_id;
  insert into public.notifications (user_id, title, body)
  values (v_req.requester_id, 'New quote from ' || v_org.name, '£' || to_char(p_price_pence / 100.0, 'FM999999990.00') || ' · ' || btrim(p_when));
  return v_id;
end $$;

create or replace function public.withdraw_quote(p_quote uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_q public.clearance_quotes;
begin
  select * into v_q from public.clearance_quotes where id = p_quote;
  if not found then raise exception 'No such quote'; end if;
  if not public.is_org_member(v_q.org_id) then raise exception 'Only the company that sent it can withdraw a quote'; end if;
  if v_q.status <> 'sent' then raise exception 'Only a quote still waiting can be withdrawn'; end if;
  update public.clearance_quotes set status = 'withdrawn' where id = p_quote;
end $$;

-- The person who asked accepts one quote. The others are declined, and every company is told.
create or replace function public.accept_quote(p_quote uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_q public.clearance_quotes; v_req public.clearance_requests;
begin
  select * into v_q from public.clearance_quotes where id = p_quote;
  if not found then raise exception 'No such quote'; end if;
  select * into v_req from public.clearance_requests where id = v_q.request_id for update;
  if v_req.requester_id is distinct from auth.uid() then raise exception 'Only the person who asked can accept a quote'; end if;
  if v_req.status <> 'open' then raise exception 'A quote has already been accepted, or the request is closed'; end if;
  if v_q.status <> 'sent' then raise exception 'That quote is no longer available'; end if;
  update public.clearance_quotes set status = 'accepted' where id = p_quote;
  update public.clearance_quotes set status = 'declined' where request_id = v_req.id and id <> p_quote and status = 'sent';
  update public.clearance_requests set status = 'accepted', accepted_quote_id = p_quote where id = v_req.id;
  insert into public.notifications (user_id, org_id, title, body)
  select m.user_id, q.org_id,
         case when q.id = p_quote then 'Your quote was accepted' else 'Another quote was chosen' end,
         v_req.place_label
  from public.clearance_quotes q join public.organisation_members m on m.org_id = q.org_id and m.status = 'active'
  where q.request_id = v_req.id and q.status in ('accepted', 'declined');
end $$;

create or replace function public.cancel_clearance_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_req public.clearance_requests;
begin
  select * into v_req from public.clearance_requests where id = p_request for update;
  if not found then raise exception 'No such request'; end if;
  if v_req.requester_id is distinct from auth.uid() then raise exception 'Only the person who asked can cancel'; end if;
  if v_req.status not in ('open', 'accepted') then raise exception 'This request is already closed'; end if;
  update public.clearance_requests set status = 'cancelled' where id = p_request;
  update public.clearance_quotes set status = 'declined' where request_id = p_request and status in ('sent', 'accepted');
end $$;

-- The asker's email, for the company whose quote was accepted (and only them).
create or replace function public.request_contact(p_request uuid)
returns table (name text, email text, access_note text)
language plpgsql stable security definer set search_path = public as $$
declare v_req public.clearance_requests; v_org uuid;
begin
  select * into v_req from public.clearance_requests where id = p_request;
  if not found then raise exception 'No such request'; end if;
  select org_id into v_org from public.clearance_quotes where id = v_req.accepted_quote_id;
  if v_org is null or not public.is_org_member(v_org) then raise exception 'Contact details are only shared with the company whose quote was accepted'; end if;
  return query select v_req.requester_name, (select u.email::text from auth.users u where u.id = v_req.requester_id), v_req.access_note;
end $$;

-- The company marks the job done, with a note and an after photo if they have one.
create or replace function public.complete_clearance(p_request uuid, p_note text default null, p_photo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_req public.clearance_requests; v_org uuid; v_name text;
begin
  select * into v_req from public.clearance_requests where id = p_request for update;
  if not found then raise exception 'No such request'; end if;
  select q.org_id, o.name into v_org, v_name from public.clearance_quotes q join public.organisations o on o.id = q.org_id where q.id = v_req.accepted_quote_id;
  if v_org is null or not public.is_org_member(v_org) then raise exception 'Only the company doing the job can mark it done'; end if;
  if v_req.status <> 'accepted' then raise exception 'Only a job under way can be marked done'; end if;
  update public.clearance_requests
     set status = 'done', done_at = now(), done_note = nullif(btrim(coalesce(p_note, '')), ''), done_photo_path = p_photo
   where id = p_request;
  insert into public.notifications (user_id, title, body) values (v_req.requester_id, v_name || ' has cleared it', v_req.place_label);
end $$;

revoke all on function public.create_clearance_request(text, text, text, double precision, double precision, text, text, text, uuid),
              public.send_quote(uuid, uuid, integer, text, text), public.withdraw_quote(uuid), public.accept_quote(uuid),
              public.cancel_clearance_request(uuid), public.request_contact(uuid), public.complete_clearance(uuid, text, text) from public, anon;
grant execute on function public.create_clearance_request(text, text, text, double precision, double precision, text, text, text, uuid),
              public.send_quote(uuid, uuid, integer, text, text), public.withdraw_quote(uuid), public.accept_quote(uuid),
              public.cancel_clearance_request(uuid), public.request_contact(uuid), public.complete_clearance(uuid, text, text) to authenticated;
