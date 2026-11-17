# Graph Report - Resolve UK  (2026-11-17)

## Corpus Check
- 175 files · ~67,047 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 56 file(s) not represented in the graph (top: .avif 46, .css 6, (none) 2)
- WARNING: 56 of 231 files seen (24%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 763 nodes · 1668 edges · 40 communities (36 shown, 4 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 147 edges (avg confidence: 0.88)
- Token cost: 396,608 input · 0 output

## Community Hubs (Navigation)
- App Routes and Pages
- Report Data and Drawer
- Logo Animations and Intro
- Auth and Supabase Client
- Design Preview Pages
- Brand Kit and Logo Meaning
- Report Form and Hero Stack
- Map Picker and Background Shade
- Dev Tooling Packages
- App TypeScript Config
- Dashboard DB Tests
- City Skyline Photos (Preview)
- Node TypeScript Config
- City Skyline Photos (Site)
- Image Pipeline and Foundation Tests
- Runtime Dependencies
- Litter and Clean-up Photos (Site)
- Preview Page Builder
- Install-as-App Screenshots
- Service Worker and Updates
- Staff Profile DB Tests
- Flexible Bodies DB Tests
- Security DB Tests
- V2 Concept DB Tests
- Supabase Keep-Awake Workflow
- Reporter Profile DB Tests
- Community Route DB Tests
- Litter Report Photos (Preview)
- Vite Build Setup
- Nature Background Photos
- NPM Scripts
- Old Logo Mark and App Icons
- Raw Nature Source Photos
- Lint Config
- Raw Litter-Picking Photos
- Site Logo Mark Files
- Root TypeScript Config
- Vercel Hosting Config

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 51 edges
2. `react` - 41 edges
3. `PageBackdrop()` - 25 edges
4. `photoUrl()` - 18 edges
5. `compilerOptions` - 18 edges
6. `CornerHover()` - 17 edges
7. `react-router-dom` - 16 edges
8. `App()` - 16 edges
9. `reducedMotion()` - 16 edges
10. `Reveal()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Working today / Coming next status lists` --semantically_similar_to--> `Planned: AI categorisation, real authority routing, resolution verification, benchmarking dashboards`  [INFERRED] [semantically similar]
  design-preview/index.html → README.md
- `Inline theme detection via prefers-color-scheme and AVIF hero preloads` --semantically_similar_to--> `/theme-init.js pre-render theme script`  [INFERRED] [semantically similar]
  design-preview/index.html → index.html
- `Resolve logo mark - green map pin with checkmark and leaf (design sample)` --semantically_similar_to--> `Resolve logo mark - green map pin with checkmark and leaf (design preview)`  [INFERRED] [semantically similar]
  design-sample/logo-mark.png → design-preview/img/logo-mark.png
- `Reported issue categories (fly-tipping, litter, potholes, graffiti, abandoned vehicles, damaged infrastructure)` --conceptually_related_to--> `Foundation stage (issue types, photo storage by path, GPS accuracy, stage timeline)`  [INFERRED]
  design-preview/index.html → README.md
- `Photo dropzone (photos shrunk before sending)` --conceptually_related_to--> `Foundation stage (issue types, photo storage by path, GPS accuracy, stage timeline)`  [INFERRED]
  design-preview/report.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ordered Supabase SQL setup (schema, community, dashboard, staff-members)** — readme_schema_sql, readme_community_sql, readme_dashboard_sql, readme_staff_members_sql [EXTRACTED 1.00]
- **Design preview page set sharing header, icon sprite, styles.css and app.js** — design_preview_index, design_preview_report, design_preview_reports, design_preview_index_svg_icon_sprite, design_preview_index_site_header [INFERRED 0.95]
- **Report lifecycle from submission through verification** — design_preview_report, design_preview_index_report_journey, design_preview_reports_status_model, design_preview_reports_report_drawer, readme_dashboard_stage [INFERRED 0.85]
- **Sage Green Colour Scheme Palette** — public_branding_resolve_colour_schemes_sage_green_scheme, public_branding_resolve_colour_schemes_sage_green_99b788, public_branding_resolve_colour_schemes_mint_green_94c690, public_branding_resolve_colour_schemes_soft_olive_9ebc85, public_branding_resolve_colour_schemes_clean_green_white_f0f5ec [EXTRACTED 1.00]
- **Deep Green Colour Scheme Palette** — public_branding_resolve_colour_schemes_deep_green_scheme, public_branding_resolve_colour_schemes_deep_green_0b3d36, public_branding_resolve_colour_schemes_mint_green_4fd1a0, public_branding_resolve_colour_schemes_charcoal_1f2937, public_branding_resolve_colour_schemes_clean_white_f7faf8 [EXTRACTED 1.00]
- **Meaning Behind the RESOLVE Logo** — public_branding_resolve_1_pdf_2_r_monogram, public_branding_resolve_1_pdf_2_logo_element_r, public_branding_resolve_1_pdf_2_logo_element_location, public_branding_resolve_1_pdf_2_logo_element_path, public_branding_resolve_1_pdf_2_logo_element_leaf [EXTRACTED 1.00]
- **Hero background photos (Westminster daylight and Thames night, responsive sizes)** — design_preview_img_hero_morning_720, design_preview_img_hero_morning_1280, design_preview_img_hero_morning_1920, design_preview_img_hero_night_720, design_preview_img_hero_night_1280, design_preview_img_hero_night_1620 [INFERRED 0.85]
- **Call-to-action background photos (Edinburgh golden hour and City of London dusk, responsive sizes)** — design_preview_img_cta_morning_720, design_preview_img_cta_morning_1280, design_preview_img_cta_morning_1600, design_preview_img_cta_dusk_720, design_preview_img_cta_dusk_1280, design_preview_img_cta_dusk_1536 [INFERRED 0.85]
- **Litter and waste problem example photos (kerbside bottles, roadside verge, uncollected street rubbish)** — design_preview_img_litter_bottles_400, design_preview_img_litter_bottles_640, design_preview_img_roadside_litter_400, design_preview_img_roadside_litter_480, design_preview_img_rubbish_street_400, design_preview_img_rubbish_street_678 [INFERRED 0.85]
- **Hero backgrounds: London day and night** — public_img_hero_morning_720, public_img_hero_morning_1280, public_img_hero_morning_1920, public_img_hero_night_720, public_img_hero_night_1280, public_img_hero_night_1620 [INFERRED 0.85]
- **CTA backgrounds: Edinburgh morning and London dusk** — public_img_cta_morning_720, public_img_cta_morning_1280, public_img_cta_morning_1600, public_img_cta_dusk_720, public_img_cta_dusk_1280, public_img_cta_dusk_1536 [INFERRED 0.85]
- **Litter problem photos used as report examples** — public_img_litter_bottles_400, public_img_litter_bottles_640, public_img_roadside_litter_400, public_img_roadside_litter_480, public_img_rubbish_street_400, public_img_rubbish_street_678 [INFERRED 0.75]
- **Android Chrome install-as-app steps 0-5** — public_install_step0, public_install_step1, public_install_step2, public_install_step3, public_install_step4, public_install_step5 [INFERRED 0.95]
- **Annotated (red-circled) install guide screenshots** — public_install_step1_marked, public_install_step2_marked, public_install_step3_marked, public_install_step4_marked [INFERRED 0.95]
- **Green nature source photos in new img** — public_new_img_180314174412_best_places_in_uk_somerset_levels_visitbritain_stephen_spraggon, public_new_img_fog, public_new_img_river, public_new_img_pexels_beigh_yabaar_865585625_32584961, public_new_img_long_image [INFERRED 0.75]

## Communities (40 total, 4 thin omitted)

### Community 0 - "App Routes and Pages"
Cohesion: 0.07
Nodes (64): react-router-dom, AboutPage, AccountPage, App(), CommercialPage, CommunityPage, GetInvolvedPage, ReportPage (+56 more)

### Community 1 - "Report Data and Drawer"
Cohesion: 0.07
Nodes (65): BODY_KIND_LABELS, Props, ReportDrawer(), Choice, Props, Select(), toStackCard(), FALLBACK_CATEGORIES (+57 more)

### Community 2 - "Logo Animations and Intro"
Cohesion: 0.07
Nodes (42): react, Touch, TOUCHES, IntroSplash(), pickVariant(), store(), Variant, VARIANTS (+34 more)

### Community 3 - "Auth and Supabase Client"
Cohesion: 0.09
Nodes (34): @supabase/supabase-js, Logo(), GoogleIcon(), AuthOptions, HIDDEN, load(), useAuthOptions(), Ctx (+26 more)

### Community 4 - "Design Preview Pages"
Cohesion: 0.05
Nodes (43): Design preview landing page (index.html), Hero with sample report card and progress bar, How it works: Snap it, Pin it, Follow it, Reported issue categories (fly-tipping, litter, potholes, graffiti, abandoned vehicles, damaged infrastructure), Working today / Coming next status lists, Six-step report journey (Reported to Outcome verified), Glass pill nav header with theme toggle and mobile menu, Inline SVG icon sprite (i-camera, i-pin, i-shield, ...) (+35 more)

### Community 5 - "Brand Kit and Logo Meaning"
Cohesion: 0.09
Nodes (26): Aerial Town Hero Image with Logo Mockup, App Icon Variants (filled tile, light tile, bare mark), Apparel Mockup: Report. Resolve. Build a cleaner, safer tomorrow., RESOLVE Brand Board (logo, colours, mockups), Business Card Mockup: Better places. Together., Brand Board - Deep Green Version, Geometric Sans-Serif Typeface (unnamed), Mobile App Splash Mockup (Get Started) (+18 more)

### Community 6 - "Report Form and Hero Stack"
Cohesion: 0.12
Nodes (26): inUK(), MapPicker, ReportForm(), StepTitle(), TYPE_HINT, TYPE_ICON, UK_BOUNDS, HeroCardStack() (+18 more)

### Community 7 - "Map Picker and Background Shade"
Cohesion: 0.15
Nodes (19): circle(), MapPicker(), pinElement(), Props, START_CENTER, STYLES, BgSwatchPicker(), DARK_SWATCHES (+11 more)

### Community 8 - "Dev Tooling Packages"
Cohesion: 0.13
Nodes (21): devDependencies, oxlint@^1.81.0, sharp@^0.35.4, tailwindcss@^4.3.3, @tailwindcss/cli@^4.3.3, @types/node@^24.13.3, @types/react@^19.2.18, @types/react-dom@^19.2.7 (+13 more)

### Community 9 - "App TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "Dashboard DB Tests"
Cohesion: 0.11
Nodes (13): ADMIN, communitySql, CONTRACTOR, COUNCIL_A, COUNCIL_B, dashboardSql, db, here (+5 more)

### Community 11 - "City Skyline Photos (Preview)"
Cohesion: 0.19
Nodes (17): CTA background - City of London skyline at dusk (1280w), City of London skyline under a red-orange dusk sky (Walkie-Talkie, Cheesegrater, towers under construction), CTA background - City of London skyline at dusk (1536w), CTA background - City of London skyline at dusk (720w), CTA background - Edinburgh skyline in golden light (1280w), Edinburgh skyline from Calton Hill (Castle, Balmoral clock tower, Old Town spires), CTA background - Edinburgh skyline in golden light (1600w), CTA background - Edinburgh skyline in golden light (720w) (+9 more)

### Community 12 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "City Skyline Photos (Site)"
Cohesion: 0.36
Nodes (15): Call-to-action background imagery, Hero background imagery, UK cityscapes (London, Edinburgh), City of London skyline at dusk (CTA background, 1280px), City of London skyline at dusk (CTA background, 1536px), City of London skyline at dusk (CTA background, 720px), Edinburgh skyline at golden hour - Balmoral clock tower and castle (CTA background, 1280px), Edinburgh skyline at golden hour - Balmoral clock tower and castle (CTA background, 1600px) (+7 more)

### Community 14 - "Image Pipeline and Foundation Tests"
Cohesion: 0.14
Nodes (7): here, jobs, out, pub, db, here, schemaSql

### Community 15 - "Runtime Dependencies"
Cohesion: 0.14
Nodes (14): dependencies, @fontsource-variable/hanken-grotesk@^5.3.0, gsap@^3.15.1, lenis@^1.3.27, maplibre-gl@^5.24.0, react@^19.2.8, react-dom@^19.2.8, react-router-dom@^7.18.4 (+6 more)

### Community 16 - "Litter and Clean-up Photos (Site)"
Cohesion: 0.29
Nodes (13): Litter, fly-tipping and uncollected waste, Litter picking / community clean-up, Report example photos, Bottles and cans strewn on street beside black bin bags (litter report example, 400px), Bottles and cans strewn on street beside black bin bags (litter report example, 640px), Volunteers in hi-vis with grabbers and sack by a hedge, Cumbria (community litter pick, 400px), Volunteers in hi-vis with grabbers and sack by a hedge, Cumbria (community litter pick, 640px), Litter-strewn roadside verge by 'No stopping' sign at sunset (litter report example, 400px) (+5 more)

### Community 17 - "Preview Page Builder"
Cohesion: 0.21
Nodes (11): card(), dd(), font, here, ic(), ICONS, nav(), pic() (+3 more)

### Community 18 - "Install-as-App Screenshots"
Cohesion: 0.23
Nodes (13): Install Resolve UK as app (Android Chrome PWA install flow), Install step 0: Chrome Android 'Install Resolve UK' banner over home hero, Install step 1: Resolve UK home hero in Chrome mobile (See it. Report it. Resolve it.), Install step 1 (marked): Chrome three-dot menu button circled, Install step 2: Chrome overflow menu open showing 'Install and create shortcut', Install step 2 (marked): 'Install and create shortcut' menu item circled, Install step 3: 'Install and create shortcut' bottom sheet (Install vs Create shortcut), Install step 3 (marked): 'Install' option circled in bottom sheet (+5 more)

### Community 19 - "Service Worker and Updates"
Cohesion: 0.21
Nodes (8): @fontsource-variable/newsreader@^5.3.0, @fontsource-variable/plus-jakarta-sans@^5.3.0, @fontsource-variable/newsreader, @fontsource-variable/plus-jakarta-sans, UpdateBanner(), applyPendingUpdate(), initServiceWorker(), SW_UPDATE_EVENT

### Community 20 - "Staff Profile DB Tests"
Cohesion: 0.15
Nodes (9): @electric-sql/pglite@^0.5.8, @electric-sql/pglite, communitySql, dashboardSql, db, here, profileFieldsSql, schemaSql (+1 more)

### Community 21 - "Flexible Bodies DB Tests"
Cohesion: 0.15
Nodes (7): communitySql, dashboardSql, db, flexSql, here, schemaSql, securitySql

### Community 22 - "Security DB Tests"
Cohesion: 0.17
Nodes (8): communitySql, dashboardSql, db, here, insertReport(), photo(), schemaSql, securitySql

### Community 23 - "V2 Concept DB Tests"
Cohesion: 0.18
Nodes (10): communitySql, dashboardSql, db, here, newReport(), photo(), schemaSql, securitySql (+2 more)

### Community 24 - "Supabase Keep-Awake Workflow"
Cohesion: 0.17
Nodes (11): jobs, ping, name, on, schedule, workflow_dispatch, runs-on, steps (+3 more)

### Community 25 - "Reporter Profile DB Tests"
Cohesion: 0.17
Nodes (8): communitySql, dashboardSql, db, here, profileFieldsSql, schemaSql, securitySql, v2Sql

### Community 26 - "Community Route DB Tests"
Cohesion: 0.22
Nodes (8): as(), communitySql, db, here, near(), photo(), report(), schemaSql

### Community 27 - "Litter Report Photos (Preview)"
Cohesion: 0.27
Nodes (10): Street litter - bin bags and scattered bottles at kerb (400w), Kerbside litter: black bin bags, cardboard, broken bottles and cans in the road, Litter, fly-tipping and waste problems (example report imagery), Street litter - bin bags and scattered bottles at kerb (640w), Roadside verge litter by dual carriageway at sunset (400w), Roadside verge litter: plastic bottles and bags strewn on grass beside a 'No stopping except in emergency' sign, Roadside verge litter by dual carriageway at sunset (480w), Uncollected rubbish piled outside terraced houses (400w) (+2 more)

### Community 28 - "Vite Build Setup"
Cohesion: 0.22
Nodes (8): @tailwindcss/vite@^4.3.3, vite@^8.3.0, vite-plugin-pwa@^1.3.0, @vitejs/plugin-react@^6.1.1, @tailwindcss/vite, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 29 - "Nature Background Photos"
Cohesion: 0.46
Nodes (8): Page background imagery, Nature and countryside landscapes, Misty pine forest with rushing stream (moody page background, 415px), Tall view through pine branches to a forest gorge and river (vertical page background, 768px), Winding blue river through bright green meadow valley (portrait nature background, 1103px), Winding blue river through bright green meadow valley (portrait nature background, 600px), Somerset Levels countryside - patchwork fields and oak tree (landscape image, 1093px), Somerset Levels countryside - patchwork fields and oak tree (landscape image, 400px)

### Community 30 - "NPM Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, sample:build, sample:css, test:db

### Community 31 - "Old Logo Mark and App Icons"
Cohesion: 0.43
Nodes (7): Resolve logo mark - green map pin with checkmark and leaf (design preview), Resolve logo mark: location pin enclosing a checkmark with a leaf (green), Resolve logo mark - green map pin with checkmark and leaf (design sample), PWA app icon - R monogram with pin and leaf, rounded (192px), PWA app icon - R monogram with pin and leaf, rounded (512px), Resolve 'R' monogram: white R with location pin in the bowl and green leaf legs on dark green, PWA maskable app icon - R monogram on full-bleed dark green (512px)

### Community 32 - "Raw Nature Source Photos"
Cohesion: 0.47
Nodes (6): Green landscape / nature source photos, Photo: patchwork green farmland and hedgerows from hillside with large oak and dry-stone wall (no visible credit), Photo: misty conifer forest with rocky stream, moody green-teal grade (no visible credit), Tall extended image: pine branches framing a gorge with turquoise river and grassy path (no visible credit), Photo: pine branches framing a forested gorge with white-water river (no visible credit), Photo: winding blue river through bright green grassland valley under blue sky (no visible credit)

### Community 33 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 34 - "Raw Litter-Picking Photos"
Cohesion: 1.00
Nodes (3): Community litter picking / clean-up imagery, Photo: volunteers litter picking by a hedge, hi-vis vest, grabber and bag hoop (no visible credit), Photo: volunteers in yellow gloves bagging litter on park grass (no visible credit)

### Community 35 - "Site Logo Mark Files"
Cohesion: 1.00
Nodes (3): Resolve logo mark, Resolve logo mark - green map pin with check mark and leaf (PNG), Resolve logo mark - green map pin with check mark and leaf (WEBP)

## Ambiguous Edges - Review These
- `Custom design system with light/dark theme (morning/night city images, navy dark mode)` → `theme-color meta (light #f0f5ec, dark #0b3d36)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to
- `Install step 1: Resolve UK home hero in Chrome mobile (See it. Report it. Resolve it.)` → `Photo: London street with Georgian brick terraces, red double-decker buses and church spire (no visible credit)`  [AMBIGUOUS]
  public/new img/images.jpg · relation: conceptually_related_to

## Knowledge Gaps
- **20 isolated node(s):** `supabase/community.sql (same-problem search, backing)`, `supabase/dashboard.sql (staff sign-in, roles, report stage actions)`, `supabase/staff-members.sql (link first Resolve admin)`, `MapLibre with OpenFreeMap vector maps (Liberty / Dark styles)`, `Phone / tablet / desktop layouts (1024px breakpoint, bottom sheet vs side panel)` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 271 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Logo Animations and Intro` to `App Routes and Pages`, `Report Data and Drawer`, `Auth and Supabase Client`, `Report Form and Hero Stack`, `Map Picker and Background Shade`, `Dev Tooling Packages`, `Runtime Dependencies`, `Service Worker and Updates`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **What connects `supabase/community.sql (same-problem search, backing)`, `supabase/dashboard.sql (staff sign-in, roles, report stage actions)`, `supabase/staff-members.sql (link first Resolve admin)` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Routes and Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06769936890418818 - nodes in this community are weakly interconnected._
- **Why does `@electric-sql/pglite` connect `Staff Profile DB Tests` to `Dev Tooling Packages`, `Dashboard DB Tests`, `Image Pipeline and Foundation Tests`, `Flexible Bodies DB Tests`, `Security DB Tests`, `V2 Concept DB Tests`, `Reporter Profile DB Tests`, `Community Route DB Tests`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Should `Report Data and Drawer` be split into smaller, more focused modules?**
  _Cohesion score 0.06597819850831899 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Custom design system with light/dark theme (morning/night city images, navy dark mode)` and `theme-color meta (light #f0f5ec, dark #0b3d36)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Install step 1: Resolve UK home hero in Chrome mobile (See it. Report it. Resolve it.)` and `Photo: London street with Georgian brick terraces, red double-decker buses and church spire (no visible credit)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._