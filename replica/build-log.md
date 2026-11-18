# Build log

One line per screen. Screenshots in `replica/clone-screens/` (590 px wide, the
reference screenshots' width). Parity: milestone 1 **61.6**, milestone 2
**75.0 / 100**, must-haves **13 of 13**
(`python3 .claude/skills/replica-diff/parity.py replica/features.csv`).

| ID | screen | date | status | missing | harder than expected |
| --- | --- | --- | --- | --- | --- |
| S01 | Onboarding | 2026-11-18 | partial | no welcome flow; connect buttons live in the empty state and Settings | |
| S02 | Import, connections, manual entry | 2026-11-18 | done | "Open in" from the Files app / share sheet | Strava's code exchange needs a client secret, so a tiny server function was unavoidable |
| S03 | Activity list + detail | 2026-11-18 | done | swipe to delete | |
| S04 | Story editor | 2026-11-18 | done | free text; layers list | Skia on web must load after its WebAssembly runtime, so the editor module is loaded lazily on web |
| S05 | Sticker sheet | 2026-11-18 | done | Totals and Gear tabs say "coming soon" | 20 preview canvases exhausted the browser's WebGL contexts; now one canvas for the grid |
| S06 | Sticker copy page | | not started | milestone 3 | |
| S07 | Totals | | not started | milestone 3 | |
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
