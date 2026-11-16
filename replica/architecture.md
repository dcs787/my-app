# Architecture: my-app (a rebuild of Share Aura's stat-graphic editor)

Working name `my-app` until `/replica-brand`. Reads `replica/recon.md` and
`replica/features.csv`; S-IDs and F-IDs refer to the recon map.

## The big decision: local-first, no server for v1

Every must-have in `features.csv` runs in the browser: import a file, keep
activities, compose, export, share. So v1 has **no backend, no accounts and no
database server**. Activities, photos and designs live in the phone's
IndexedDB. That means zero hosting cost, no personal health data on our
servers, works offline, and nothing to secure yet.

A server arrives in milestone 4, only for what needs one: accounts that sync
across devices and the Strava connection (OAuth secrets, webhooks). The
Postgres schema for that is already written (`replica/schema.sql`), so the
local schema mirrors it and the move is an upload, not a redesign.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js 16 (App Router) + TypeScript, React 19 | default; static pages now, API routes ready for M4 |
| styling | Tailwind CSS 4, tokens from `/replica-design` | default; tokens map straight onto its theme |
| canvas | Konva 10 + react-konva | one scene graph for editing *and* export, so the PNG matches the screen; built-in drag/scale/rotate transformer and `toBlob({pixelRatio})` |
| local data | Dexie 4 (IndexedDB) | typed tables, indexes, live queries; stores photo blobs |
| file parsing | `fit-file-parser` (MIT) for FIT; own `DOMParser` code for GPX/TCX | FIT is binary, worth a library; GPX/TCX are small XML |
| PWA | web app manifest + a hand-written service worker | install to home screen, offline editor |
| mobile | none (the web app is mobile-first) | a native iOS app can't be built or tested in this environment; revisit after launch |
| database (M4) | Postgres on Supabase | one managed DB with auth and storage alongside |
| auth (M4) | Supabase Auth (email magic link + Sign in with Apple) | no passwords to store; Apple sign-in matters for an iPhone audience |
| files (M4) | Supabase Storage, private bucket | background photos for synced designs |
| payments | none yet | the original is free; `/replica-launch` decides pricing, then Stripe |
| email | Supabase Auth's sender, then Resend at launch | only login emails until there's something to send |
| jobs (M4) | Supabase Edge Function / Vercel Cron | Strava backfill queue, token refresh |
| hosting | Vercel | default; zero-config Next.js, preview URL per branch |

One app, one database (from M4). No microservices.

## Local schema (v1, Dexie)

Mirrors the Postgres tables so M4 sync is a straight copy. Units are always SI
(metres, seconds); convert to mi/km only for display.

```ts
db.version(1).stores({
  activities:   'id, startedAt, type, source, [source+externalId], fileHash',
  compositions: 'id, activityId, updatedAt',
  gear:         'id, type, retired',
  photos:       'id',            // { id, blob, width, height }
  settings:     'key',           // units, lastFont, lastColour, ...
});
```

## Server schema (M4, Postgres)

Tables: 6 (`profiles`, `connections`, `activities`, `gear`,
`compositions`, `photos`). Templates are code, not rows. **Access rules: row-level security in
Postgres** on every table, `user_id = auth.uid()`; the service role (webhook
handler, jobs) bypasses it and is only used server-side. Full SQL in
`replica/schema.sql`. The constraints that matter:

- `activities (user_id, source, external_id)` unique, so a re-import or a
  duplicate Strava webhook upserts instead of duplicating.
- `activities (user_id, file_hash)` unique where not null, so the same file
  uploaded twice is the same activity.
- `connections (provider, external_user_id)` unique, so one Strava athlete maps to
  exactly one of our users (the webhook only tells us the athlete id).
- Deleting a user cascades to everything; deleting a connection keeps the
  activities but clears their link to it (`on delete set null`).

## Templates: code, not data

A template is a TypeScript module, so layouts can do real logic (hide HR if
missing, fit long titles, draw splits):

```ts
type TemplateDef = {
  id: string; name: string;
  category: 'activity' | 'totals' | 'gear';
  needs?: ('route' | 'hr' | 'splits' | 'elevation' | 'calories')[];
  size: { w: number; h: number };              // natural size, px
  render(input: { activity?: Activity; totals?: Totals; gear?: Gear;
                  units: 'mi' | 'km'; font: FontId; colour: string }): Shape[];
};
```

`Shape` is a small union (text, line/polyline, rect, path, image). One
renderer turns `Shape[]` into Konva nodes, used by the editor canvas (S04),
the template sheet thumbnails (S05) and the sticker export (S06). Tiles whose
`needs` aren't met are shown disabled with the reason.

The canvas is a fixed **1080 x 1920** design space scaled to fit the screen;
export is that stage at `pixelRatio` 1 (or 2 for a sharper upload).
A composition is stored as `{ background, elements: [{ templateId | 'text' |
'route', x, y, scale, rotation, font, colour, text?, z }] }`, then re-rendered
from the activity, so fixing a template fixes old designs too.

## Routes

### Pages (v1, all client-rendered)

| path | does | screen | flow |
| --- | --- | --- | --- |
| `/` | activity list, newest first; empty state points to import | S03 | F01, F03 |
| `/import` | pick GPX/TCX/FIT files (multi), parse, dedupe, save | S02 | F03 |
| `/activities/new` | manual entry: type, date, distance, time, optional HR/elev/calories | S02 | F03 |
| `/activities/[id]` | edit title/type/gear, delete | S03 | F03 |
| `/edit/[activityId]` | editor canvas + template sheet; `?c=<compositionId>` reopens a design | S04, S05 | F01 |
| `/stickers/[activityId]` | tap-to-copy sticker grid, Activity/Totals/Gear tabs | S06, S07, S08 | F02, F04 |
| `/settings` | units, default font/colour, gear list, export/delete all data | S08 | |

### API (M4 only)

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| `GET /api/strava/connect` | redirect to Strava OAuth (scope `activity:read_all`) | signed-in user | | 302 | F03 |
| `GET /api/strava/callback` | swap code for tokens, upsert `connections`, queue 90-day backfill | Strava redirect + session | `code`, `state` | 302 `/` | F03 |
| `GET /api/strava/webhook` | answer Strava's subscription challenge | Strava | `hub.challenge`, `hub.verify_token` | JSON echo | |
| `POST /api/strava/webhook` | activity create/update/delete or athlete deauthorise; upsert, delete, or wipe the connection | Strava (verify subscription id) | event JSON | 200 within 2 s, work queued | F03 |
| `POST /api/sync` | push/pull local rows changed since a cursor | signed-in user | rows + cursor | rows + cursor | |
| `DELETE /api/account` | delete user, cascade, deauthorise Strava | signed-in user | | 204 | |

Webhooks in: Strava (activity + deauthorisation). Webhooks out: none.
Jobs: `strava-backfill` (on connect; pages through history under rate
limits), `strava-token-refresh` (on use, tokens last 6 h), `orphan-photos`
(daily, deletes storage objects with no composition).

Only official, public APIs with our own keys. Nothing of Share Aura's.

## The parts that bite

- **Matching screen and export:** fonts must be loaded (`document.fonts.load`)
  before Konva draws, or the PNG falls back to system fonts. Bundle open
  fonts (OFL) through `next/font`; never use Share Aura's fonts.
- **iOS Safari canvas limits:** max ~16.7 M pixels per canvas and tight
  memory. Downscale photos on import to 2160 px on the long edge with
  `createImageBitmap(..., { imageOrientation: 'from-image' })` (fixes EXIF
  rotation). iPhone HEIC photos arrive as JPEG through the file input.
- **Clipboard and share need a user gesture:** call
  `navigator.clipboard.write([new ClipboardItem({ 'image/png': promise })])`
  synchronously in the tap handler and pass a *promise* of the blob (Safari).
  `navigator.share({ files })` likewise. Fall back to download, then to
  "press and hold to save" on the image.
- **Time zones:** GPX/TCX times are UTC. Labels like "Wednesday" or
  "Afternoon Run" need local time: use FIT `local_timestamp` when present,
  else the device's time zone, and store the offset with the activity.
- **Derived stats:** GPX has no moving time; compute it with a speed threshold
  (paused below ~0.5 m/s). Elevation gain from raw GPS is noisy: smooth and
  apply a 2-3 m hysteresis. Pace = moving time / distance. Splits per mi or km.
- **Idempotency:** dedupe imports by SHA-256 of the file; Strava webhooks can
  repeat, so upsert on `(source, external_id)` and answer 200 fast.
- **Rate limits (M4):** Strava's default app limit is 100 requests / 15 min and
  1,000 / day for the whole app. Backfill is queued and resumable.
- **Strava's API agreement (M4):** has rules on display, attribution ("Powered
  by Strava"), data retention and deleting data on deauthorisation. Read it
  before building M4. If it rules out this use, M4 ships accounts only.
- **Privacy:** a route trace can reveal a home address. Offer trimming the
  first/last 200-500 m on the route element (an improvement over the original).
- **GDPR / deletion:** v1 stores nothing server-side. "Delete all data" in
  settings clears IndexedDB. M4: account deletion cascades and Strava deauth
  wipes that connection's activities.
- **Offline:** the editor works offline; the service worker caches the app
  shell, fonts and templates. Not needed: realtime, search, multi-tenancy.

## Build order

1. **Vertical slice (M1).** GPX import -> activity list -> editor with photo
   background, one stat template and the route -> export PNG -> share/download.
   Screens S03, S04, S05 (one tile). Tables: `activities`, `compositions`,
   `photos`. Pages: `/`, `/import`, `/edit/[activityId]`. Proves Konva export
   matches the screen on an iPhone.
2. **Must-haves (M2).** FIT + TCX import, manual entry, mi/km setting,
   solid/gradient backgrounds, drag/pinch/rotate, font + colour, 20 original
   templates, share sheet with fallbacks. Adds `/activities/new`,
   `/activities/[id]`, `/settings`.
3. **Should-haves (M3).** Sticker copy page (S06) with press-and-hold save,
   Totals tab, free text, splits chart, layers (delete/reorder), remembered
   style, route privacy trim, PWA install + offline.
4. **Accounts + Strava (M4).** Supabase project, `schema.sql` as the first
   migration, auth, sync, the Strava routes and jobs.
5. **Could-haves (M5).** Gear tab and stickers, comment/@mention elements,
   Spanish, freehand draw, video background.
6. **Fixes from `/replica-entrepreneur`.** Once it has run.
