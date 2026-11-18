# Build log

One line per screen. Screenshots in `replica/clone-screens/` (590 px wide, the
reference screenshots' width). Parity after milestone 1: **61.6 / 100**,
must-haves **10 of 13** (`python3 .claude/skills/replica-diff/parity.py replica/features.csv`).

| ID | screen | date | status | missing | harder than expected |
| --- | --- | --- | --- | --- | --- |
| S01 | Onboarding | 2026-11-18 | not started | whole screen (milestone 2, with Apple Health / Strava connect) | |
| S02 | Import + manual entry | 2026-11-18 | partial | TCX and FIT; "Open in" from the Files app / share sheet | React Native has no DOMParser, so GPX is read by a small tested scanner |
| S03 | Activity list + detail | 2026-11-18 | done | swipe to delete | |
| S04 | Story editor | 2026-11-18 | done | direct Instagram Stories share (M2); free text; layers list | Skia on web must load after its WebAssembly runtime, so the editor module is loaded lazily on web |
| S05 | Sticker sheet | 2026-11-18 | partial | 13 more templates to reach 20; Totals and Gear tabs say "coming soon" | |
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
