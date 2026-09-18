# Resolve UK

A citizen environmental-reporting platform for the UK. Citizens report issues
like fly-tipping and potholes in seconds — a photo, a short description, and
a location — and can track the status of what they've reported.

This is an early-stage prototype covering the core reporting loop only:
submit a report, see it listed with its status. AI categorisation, routing
to real local authorities, resolution verification, and public benchmarking
dashboards are planned but not yet built.

## Status

**Phase 1 of 5 — complete.** See the weekly development reports for detail
on what's shipped and what's next.

## Tech stack

- **Frontend:** React + TypeScript, built with Vite
- **PWA shell:** `vite-plugin-pwa` (installable, with a service worker and manifest)
- **Backend:** Supabase (hosted Postgres database, file storage, and API — no custom server)
- **Location picker:** Leaflet + OpenStreetMap

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
