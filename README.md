# Resolve UK

A citizen environmental-reporting platform for the UK. Citizens report issues
like fly-tipping and potholes in seconds — a photo, a short description, and
a location — and can track the status of what they've reported.

This is an early-stage prototype covering the core reporting loop only:
submit a report, see it listed with its status. AI categorisation, routing
to real local authorities, resolution verification, and public benchmarking
dashboards are planned but not yet built.

## Status

**Phase 1 of 5 — complete. Foundation, Community and Dashboard stages — built, not yet switched on.**
See the weekly development reports for detail on what's shipped and what's next.

The Foundation stage adds five issue types (fly-tipping, potholes, graffiti, abandoned
vehicles and damaged infrastructure), photos that are shrunk before upload and stored by path,
GPS accuracy on each report, a stage timeline on each report, and a saved database setup
with councils, contractors and a history log. The Community stage adds an "is this the same problem?"
check before a report is sent, and a count of how many people back each report. The Dashboard stage
adds a separate sign-in at `/staff` for council and contractor staff (claim a report, acknowledge,
schedule and clear it), Resolve reviewers (verify or reopen a cleared report), and Resolve admins
(everything, plus managing councils, contractors and staff accounts). All three need the new database
(below) before they work.

## Tech stack

- **Frontend:** React + TypeScript, built with Vite, styled with Tailwind CSS
- **PWA shell:** `vite-plugin-pwa` (installable, with a service worker and manifest)
- **Backend:** Supabase (hosted Postgres database, file storage, and API — no custom server)
- **Location picker:** Leaflet + OpenStreetMap

## Database

The database is in three files. Run them once each, in this order, in the SQL Editor of the Supabase
project. All three are safe to run again.

1. `supabase/schema.sql`: issue types, councils and contractors, reports, history, photo storage.
2. `supabase/community.sql`: the "is this the same problem?" search and backing a report.
3. `supabase/dashboard.sql`: staff sign-in, roles, and claiming, acknowledging, scheduling, clearing,
   verifying and reopening a report.

Then, once only: link the first Resolve admin account. See `supabase/staff-members.sql` for the
steps — you create their sign-in in Authentication > Users first, then run that file.

`supabase/sample-bodies.sql` is optional and adds a few clearly labelled test councils.

The access rules are checked on a local Postgres, with no Supabase account needed:

```
npm run test:db
```

The public can add a report and read reports and their history, and nothing else. Stages, history,
responsible bodies and staff accounts are all set by the database, never by whoever is asking.

## Design

The site is styled with Tailwind CSS (v4), with the design tokens and custom controls in `src/index.css`.
Nothing uses the browser's default look: buttons, fields, dropdowns, the scrollbar and even the map controls
are custom. It follows the device's light or dark setting (a manual toggle lasts for the visit only). Light
mode uses a morning city picture, dark mode a night one, and dark mode is navy, not green, so it stays
distinct from the private portal.

Pages: `/` (landing), `/report` (the form), `/reports` and `/reports/:id` (the list and a report's detail
panel), and `/staff` (staff sign-in and dashboard). Each page loads only its own code.

### The map

The map uses MapLibre with OpenFreeMap's free vector maps (built from OpenStreetMap data): the detailed
"Liberty" style by day and the "Dark" style at night. There is no API key and no registration, and commercial
use is allowed. The attribution ("OpenFreeMap, OpenMapTiles, data from OpenStreetMap") is shown on the map and
must stay. When the report form opens it finds the person's location automatically, and they can drag the pin
or tap the map to change the spot. The public OpenStreetMap picture tiles are not used, because their policy
does not allow heavy use by a production site.

### Layouts

Phone, tablet and desktop each have their own layout: a menu button below 1024 px and the full link row above;
the map inside "Where is it?" with the Send button pinned to the bottom below 1024 px, and beside the form above;
a bottom sheet for a report on phones and a side panel from tablet width.

### Pictures

The pictures used by the site are optimised copies in `public/img/` (AVIF and WebP at a few widths). They
are made from the originals with `node design-preview/make-images.mjs`, which reads the files in `public/`.

**Before this is published:** the picture sources and licences have not been confirmed, and the footer says
"Photo credits: being confirmed". Check each picture's licence and add the credits before deploying. The
unoptimised originals in `public/` (and any private file such as a pitch deck) would also be published, so
move them out of `public/` first.

`design-preview/` is the standalone design sample the site was built from. It is not part of the app and can
be deleted.

## Staff sign-in

`/staff` is a separate sign-in for council and contractor staff, Resolve reviewers and Resolve admins.
It is not linked from the public app. The first admin is linked by hand, in `supabase/staff-members.sql`;
after that, an admin can add or retire anyone else, and add councils and contractors, from the Manage
screen, with no further SQL. A report gets a council or contractor two ways for now, until real routing
by map boundary arrives in a later stage: a council or contractor claims an unassigned report themselves,
or an admin assigns one directly.

## Running locally

1. Install dependencies:
   ```
   npm install
   ```
2. Create a Supabase project (see `.env.example` for the two values you need), then create `.env` in the project root:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-publishable-key
   ```
3. Start the dev server:
   ```
   npm run dev
   ```
4. Open the printed local URL in your browser.

## License

See [LICENSE](./LICENSE). All rights reserved — this repository is provided
for viewing purposes only.
