# Build log

One line per screen. Screenshots in `replica/clone-screens/` (590 px wide, the
reference screenshots' width). Parity: milestone 1 **61.6**, milestone 2
**75.0**, milestone 3 **91.1 / 100**, must-haves **13 of 13**
(`python3 .claude/skills/replica-diff/parity.py replica/features.csv`).

| ID | screen | date | status | missing | harder than expected |
| --- | --- | --- | --- | --- | --- |
| S01 | Onboarding | 2026-11-18 | partial | no welcome flow; connect buttons live in the empty state and Settings | |
| S02 | Import, connections, manual entry | 2026-11-18 | done | "Open in" from the Files app / share sheet | Strava's code exchange needs a client secret, so a tiny server function was unavoidable |
| S03 | Activity list + detail | 2026-11-18 | done | swipe to delete | |
| S04 | Story editor | 2026-11-18 | done | comment/@mention stickers, freehand draw | Skia on web must load after its WebAssembly runtime, so the editor module is loaded lazily on web |
| S05 | Sticker sheet | 2026-11-18 | done | Gear tab says "coming soon" | 20 preview canvases exhausted the browser's WebGL contexts; now one canvas for the grid |
| S06 | Sticker copy page | 2026-11-18 | done | | |
| S07 | Totals | 2026-11-18 | done | | local-date bucketing so a late-evening run stays in its own day and week |
| S08 | Gear | | not started | milestone 4 | |
| — | Settings | 2026-11-18 | done | | |

## Verified, and how

- 45 unit tests: GPX parsing, stats, splits, formatting, both data stores
  (the SQLite store's real SQL on Node's SQLite), templates, layout, hit-testing.
- Browser run of the core loop at 390 x 844: open an activity, add a sticker,
  change background, save (PNG checked: 1080 x 1920), close, reopen (design
  kept), details, units switch, empty state, manual entry. Keyboard Tab
  reaches the list at 1440 px. No console errors.

## Not verified yet (needs an iPhone)

- Photo picker, Save to Photos permission prompt, share sheet, file picker.
- Pinch and twist on stickers (the browser test drives drag only).
- Performance of re-rendering the canvas during gestures on older phones.

## Milestone 2 (2026-11-18)

- TCX and FIT import; device totals win over GPS recomputation.
- Apple Health: read-only, anchored sync, deleted workouts removed, workout
  time zones. Lazy-loaded so Expo Go still runs.
- Strava: mobile OAuth, Keychain tokens, Supabase token function (stores
  nothing), paged sync with overlap, 429 and revoked-access handling;
  disconnect deletes Strava data as the API agreement requires.
- The same workout from two sources is merged, not duplicated.
- Direct Instagram Stories share with share-sheet fallback.
- 20 templates. 71 tests. Generated iOS project checked: HealthKit
  entitlement, permission texts, URL schemes.

### Still needs an iPhone and the accounts (SETUP.md)

- Apple Health permission prompt and real Watch data.
- Strava sign-in round trip (callback domain `localhost`) and token function.
- Instagram hand-off with a real Meta app id.
- Everything in the milestone 1 "not verified yet" list.

## Milestone 3 (2026-11-18)

- Totals stickers (week, week days, week in numbers, month, year), same
  sport family, by local date.
- Free text sticker; layers list (select, reorder, delete).
- S06 sticker copy page: tap copies a transparent 2x PNG, hold saves.
- Apple Health background delivery: workouts arrive without opening the app.
- 76 tests. Browser: text, totals, layers, clipboard PNG (1800x840,
  transparent), long-press save, milestone 1 regression. Background
  delivery entitlement confirmed in the generated iOS project.

### Still needs an iPhone

- Background delivery actually waking the app after a Watch workout.
- Clipboard paste into Instagram (iOS pasteboard image).

## Fix 3: pick the stats on a sticker (2026-11-19)

- The 7 stat stickers (three stats, stat grid, stat list, stacked, one line,
  route and stats, route beside stats) have a "Choose stats" button. Tap
  stats in the order you want them, up to what the sticker fits; it says so
  when full. Max HR is available here but stays out of the default.
- The choice is saved on the sticker; stats the activity lacks are skipped,
  and "Back to the default" clears it.
- Accessibility fix found by the new test: toggle chips (units, sport type,
  stats) had no role on web. They are now buttons with aria-pressed there;
  iOS keeps the native toggle role.
- 83 unit tests, 12 e2e tests.

## Fix 4: watch laps (2026-11-19)

- Laps are stored on each activity (schema v2 migration adds `laps` and
  `details_at`; tested upgrading a v1 database).
- Sources: FIT lap messages and TCX laps keep the device's own distance,
  time, heart rate and climb. Strava: opening an activity fetches its laps
  and Strava's own mile and km splits with one call, not during sync, so a
  first sync doesn't use up the rate limit. Apple Health: segments marked on
  the Watch become laps measured on the route (not verified on a device).
  Merging takes laps from whichever recording has them.
- The activity screen shows Laps (n) first, with Splits a tab away, and says
  where each came from ("Laps from your watch", "Splits from Strava",
  "Worked out from GPS"). New Laps sticker (26 stickers).
- Accessibility: react-native-web ignores accessibilityState, so tabs,
  disabled stickers, the busy state on buttons and help's expanded state were
  silent on web. All now use aria-* props, which work on iOS and web;
  swatches are radios with aria-checked.
- 95 unit tests, 13 e2e tests.

## Fix 5: editor speed budget and crash safety (2026-11-23)

- Drag, pinch and twist run on the UI thread (Reanimated shared values);
  React saves the result once, when the fingers lift, instead of
  re-rendering the editor on every move. No jump on release, and the move
  survives closing and reopening the editor (e2e, screenshot-checked).
- Measured on web with the CPU slowed 6x, 18 stickers, 60-step drag: long
  tasks 57-58 → 8-34, drag 6.4-7.6 s → 3.4-4.3 s, React work per drag
  94 ms → 15 ms. `node scripts/bench-editor.cjs` re-runs it.
- A story holds up to 30 stickers, with a message at the cap.
- Crash recovery: the editor and the app have error boundaries that show
  "Something went wrong" with Try again, Go to activities, and an optional
  pre-filled email (nothing is sent unless the person sends it).
- Crash reporting: App Store Connect and TestFlight crash reports, no SDK,
  so "Data Not Collected" stays true (launch-plan.md). Sentry only if those
  aren't enough, with the privacy label changed in the same release.
- Still needs an iPhone: the 15-sticker check on an older model (SETUP.md).

## Fix 6: a small download (2026-11-23)

- iOS JavaScript and assets: 14.4 MB → 7.7 MB, nothing removed.
  - Icons: importing from lucide-react-native pulled in every icon (2.1 MB
    of the 5.9 MB bundle). Now one module per icon via `src/ui/icons.ts`.
  - Fonts: importing from @expo-google-fonts/inter bundled all 18 Inter
    files to use 5 (assets 6.7 MB → 2.3 MB).
  - A lint rule blocks both imports from coming back.
- `npm run size` exports the iOS bundle and checks it against a budget
  (JS 6.5 MB, assets 3 MB). The native part comes on top; read it from each
  EAS build or App Store Connect's file sizes (target: under 60 MB total).
- No watermark anywhere, by design.

## Fix 7: yoga and elliptical (2026-11-23)

- Own types with icons, mapped from Apple Health (yoga, pilates,
  elliptical), Strava (Yoga, Pilates, Elliptical) and files.
- Each is its own family, so elliptical miles never count towards running
  totals ("1 elliptical session", "3 yoga sessions").

## Fix 8: Arabic on stickers (2026-11-23)

- Text with Arabic (or another right-to-left script) is drawn with Skia's
  paragraph shaper, so letters join and read right to left, with Noto Sans
  Arabic (OFL, one weight, 194 KB) as the fallback for every sticker font.
  Mixed Arabic and Latin works; the first letter sets the direction.
- Covers activity titles (from Strava, Health or typed) and the text sticker.
- Hebrew and other scripts shape correctly but have no glyphs in the
  bundled fonts yet; add a Noto face the same way if people ask.
- 99 unit tests, 14 e2e tests; assets 2.5 MB of the 3 MB budget.

## Strava brand guidelines (2026-11-23)

- Checked against developers.strava.com/guidelines (rev. 2025-09-29):
  OAuth goes to strava.com/oauth/mobile/authorize; interoperability is only
  ever "Compatible with Strava"; Strava's name is never bigger than the text
  around it or than Mileprint's; no Strava logo used as or in the app icon.
- Added "View on Strava" (bold, #FC5200) on activities from Strava, linking
  to the original, and "Recorded on <device>" from Strava's device name, the
  attribution Strava asks for (schema v3 adds `device_name`).
