# Architecture: my-app (a rebuild of Share Aura's stat-graphic editor)

Working name `my-app` until `/replica-brand`. Reads `replica/recon.md` and
`replica/features.csv`; S-IDs and F-IDs refer to the recon map.

**Revised 2026-11-17:** native app (Expo) instead of a web app, because the
product needs **Apple Health and Strava sync**. Apple Health can only be read by
an installed iOS app.

## The big decisions

1. **Native iPhone app with Expo (React Native).** Apple Health, direct share
   to Instagram Stories, save to Photos and image clipboard all need a native
   app. Expo gives us cloud builds (no Mac needed), over-the-air updates, and
   Android later from the same code.
2. **Local-first.** Activities, photos and designs live in an on-device SQLite
   database. No accounts in v1, and no health data on our servers.
3. **One tiny server function for Strava.** Strava's token exchange needs a
   client secret that must not ship inside the app, so a single serverless
   function swaps the code for tokens. The tokens are then kept on the phone
   (Keychain) and the app talks to Strava directly. Accounts and cloud sync come
   later (milestone 5) using the Postgres schema in `replica/schema.sql`.

## Stack

| layer | choice | why |
| --- | --- | --- |
| app | Expo SDK 58, expo-router, TypeScript, React Native 0.88 | managed native builds (EAS), file-based routes, Android later |
| canvas | @shopify/react-native-skia 2 | GPU 2D drawing; the same Skia picture renders on screen and exports to PNG, so the post matches the screen |
| gestures | react-native-gesture-handler 3 + Reanimated 4 | drag, pinch, rotate on canvas elements at 60 fps |
| local data | expo-sqlite + Drizzle ORM | typed tables and migrations; mirrors the Postgres schema |
| Apple Health | @kingstinct/react-native-healthkit 16 (MIT) | workouts, workout routes, heart rate, energy; needs a dev build |
| Strava | expo-auth-session (OAuth) + Strava API v3 | official API with our own keys; tokens in expo-secure-store |
| token server | one Supabase Edge Function (`strava-token`) | holds the Strava client secret; exchange + refresh only, stores nothing |
| files | expo-document-picker + `fit-file-parser` (MIT) + own GPX/TCX parser | import from Garmin/Coros/watch exports |
| photos | expo-image-picker, expo-media-library | pick backgrounds, save posts to Photos |
| sharing | react-native-share (Instagram Stories), expo-clipboard (image), system share sheet | the original's "share to stories" and "copy" flows |
| fonts | open fonts (OFL) bundled with expo-font | same fonts on screen and in the export; nothing of the original's |
| styling | tokens from `replica/design` -> `theme.ts`, React Native StyleSheet | no web CSS in a native app |
| tests | Jest for parsing, stats and templates; Expo web build for screen checks | the parts that can be tested without a phone |
| builds | EAS Build (cloud) -> TestFlight | no Mac required |
| payments | none yet | the original is free; `/replica-launch` decides |
| later | Supabase Postgres + Auth (Sign in with Apple) + Storage | accounts and cross-device sync (M5) |

## Local schema (v1, SQLite via Drizzle)

Same tables and columns as `replica/schema.sql` minus server-only parts:
`activities`, `compositions`, `gear`, `photos` (file URI instead of storage
path), `settings`, and `connections` without tokens (tokens live in the
Keychain via expo-secure-store, never in SQLite). Units are SI (metres,
seconds); convert to mi/km only for display.

`activities.source` is one of `apple_health`, `strava`, `gpx`, `tcx`, `fit`,
`manual`. `external_id` is the HealthKit workout UUID or the Strava activity id.

## Server schema (M5, Postgres)

Tables: 6. Access: row-level security, `user_id = auth.uid()`. Full SQL in
`replica/schema.sql`, tested against Postgres 2026-11-16 (duplicate imports
rejected, cross-user reads blocked, tokens unreadable by clients, cascading
delete).

## Data sources

### Apple Health (F03)

- Ask for read access only: workouts, workout routes, distance (walking/running,
  cycling, swimming), heart rate, active energy, flights climbed/elevation.
  Never write in v1.
- Import: query workouts since the last sync anchor (`HKAnchoredObjectQuery`),
  then per workout its route (`HKWorkoutRoute` locations), average HR, energy.
  First run backfills 90 days.
- Later: background delivery so new workouts appear without opening the app.
- Rules: purpose strings in `Info.plist`, a privacy policy, no health data for
  ads or sold, and the HealthKit entitlement (paid Apple Developer account).

### Strava (F03)

- OAuth in an in-app browser, scope `activity:read_all`; the redirect returns
  a code; `strava-token` swaps it for access + refresh tokens (6 h expiry).
- Sync: `GET /athlete/activities?after=<last>` (list includes
  `summary_polyline`, distance, times, elevation, HR); detail or streams only
  when a template needs splits.
- Strava limits: 100 requests / 15 min and 1,000 / day for the **whole app**,
  and new Strava apps allow **one connected athlete** until Strava reviews the
  app. Apply for review before launch.
- Strava's API agreement has rules on attribution ("Powered by Strava"),
  display and data retention. Read it before building M2; delete synced Strava
  data when the user disconnects.

### Files and manual (F03)

GPX, TCX and FIT through the share sheet ("Open in my-app") or the document
picker; manual entry for treadmill and gym.

### The same run from two places

A Watch run often lands in Apple Health *and* Strava. Treat two activities as
one when type matches, start times are within 2 minutes, and distance is within
3%. Keep one, prefer the source with a route, then HR, then Strava's title.

## Templates: code, not data

```ts
type TemplateDef = {
  id: string; name: string;
  category: 'activity' | 'totals' | 'gear';
  needs?: ('route' | 'hr' | 'splits' | 'elevation' | 'calories')[];
  size: { w: number; h: number };
  render(input: { activity?: Activity; totals?: Totals; gear?: Gear;
                  units: 'mi' | 'km'; font: FontId; colour: string }): Shape[];
};
```

`Shape` is a small union (text, polyline, rect, path, image). One renderer
draws `Shape[]` with Skia for the editor canvas (S04), the template sheet
thumbnails (S05) and sticker export (S06). Tiles whose `needs` aren't met are
disabled with the reason. The canvas is a fixed 1080 x 1920 design space scaled
to the screen; export renders the same picture offscreen at 1080 x 1920.
A composition stores `{ background, elements: [{ templateId | 'text' | 'route',
x, y, scale, rotation, font, colour, text?, z }] }` and is re-rendered from the
activity.

## Screens (expo-router)

| route | does | screen | flow |
| --- | --- | --- | --- |
| `/onboarding` | welcome, units, connect Apple Health / Strava / skip | S01, S02 | F03 |
| `/` (tab: Activities) | activity list, pull to sync, empty state with connect buttons | S03 | F01, F03 |
| `/import` | document picker, results, duplicates skipped | S02 | F03 |
| `/activities/new` | manual entry | S02 | F03 |
| `/activities/[id]` | details, edit title/type/gear, delete | S03 | |
| `/edit/[activityId]` | editor canvas + template sheet (modal) | S04, S05 | F01 |
| `/stickers/[activityId]` | tap-to-copy grid, Activity/Totals/Gear tabs | S06-S08 | F02, F04 |
| `/settings` (tab) | connections, units, default style, gear, delete all data | S02, S08 | |

## Server functions

| function | does | who | input | output |
| --- | --- | --- | --- | --- |
| `POST strava-token` (exchange) | code -> tokens | the app | `code` | access, refresh, expires_at, athlete id |
| `POST strava-token` (refresh) | refresh -> new tokens | the app | `refresh_token` | access, refresh, expires_at |

Stores nothing, logs no tokens, rate-limited per IP. Later (M5): Strava webhook,
accounts, sync endpoints, account deletion.

## The parts that bite

- **Screen matches export:** fonts loaded before drawing; draw the same Skia
  picture offscreen. Big photos (48 MP) downscaled to 2160 px long edge on pick.
- **HealthKit only on a dev build:** Expo Go can't load it. M1 runs in Expo Go;
  from M2 testing needs an EAS development build on a real iPhone (the
  simulator has no real workouts).
- **Duplicates across sources:** see "the same run from two places".
- **Time zones:** HealthKit and Strava give UTC plus a zone (`start_date_local`
  / workout metadata); GPX is UTC. Store the offset with the activity.
- **Derived stats:** moving time from speed threshold when missing; elevation
  smoothing with 2-3 m hysteresis; splits per mi/km.
- **Strava quotas and single-athlete limit:** queue syncs, back off on 429,
  apply for Strava review early.
- **Instagram Stories hand-off:** needs a Meta app ID and the
  `instagram-stories` URL scheme in `LSApplicationQueriesSchemes`.
- **Route privacy:** offer trimming the first/last 200-500 m (home address).
- **App Store review:** HealthKit apps need a clear purpose, a privacy policy
  and must not hide core features behind Health permission.
- **Deletion:** "Delete all data" wipes SQLite, files and Keychain tokens and
  deauthorises Strava.

## Build order

1. **M1, vertical slice (works in Expo Go).** App shell + tabs; GPX import and
   manual entry; activity list; editor with photo background, one template and
   the route; export to Photos and the share sheet.
2. **M2, data sources + must-haves (dev build).** Apple Health import, Strava
   connect + sync + `strava-token` function, duplicate merging, FIT/TCX, units,
   backgrounds, drag/pinch/rotate, font + colour, 20 original templates, direct
   Instagram Stories share.
3. **M3, should-haves.** Sticker copy page, totals, text, splits, layers,
   remembered style, route privacy trim, Health background delivery.
4. **M4, could-haves.** Gear, comment/@mention elements, Spanish, draw, video.
5. **M5, accounts + cloud sync.** Supabase, `schema.sql`, Sign in with Apple.
6. **Fixes from `/replica-entrepreneur`.**

## What the owner needs, and when

| when | what | cost |
| --- | --- | --- |
| M1 | Expo Go app on your iPhone; a free Expo account | free |
| M2 | Apple Developer Program (HealthKit, TestFlight) | $99 / year |
| M2 | Strava API application (client id + secret) | free |
| M2 | Meta developer app ID (Instagram Stories share) | free |
| M2 | Supabase project (for `strava-token`) | free tier |
| launch | App Store listing, privacy policy URL | included above |
