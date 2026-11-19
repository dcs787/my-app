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
