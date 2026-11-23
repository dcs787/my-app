# Deploy checklist: Mileprint

Date: 2026-11-19. **Go from user: not yet.** Nothing is live, and nothing goes
live until you say so and have done the account steps below. Claude doesn't
buy domains, enter cards, sign in to your accounts or paste live keys.

What ships: an **iPhone app** (Expo build → TestFlight → App Store), a
**static website** (`site/`: landing, privacy, help), and one **server
function** (`supabase/functions/strava-token`). There is no database server,
no Stripe and no email sending in v1.

## Preflight

| check | result |
| --- | --- |
| e2e suite (`npm run build && npm run e2e`) | **14 / 14 passed** (core loop with 1080×1920 export and reopen, drag, text/totals/layers, unavailable stickers, choosing a sticker's stats, laps and splits, Arabic text, drag persistence, clipboard PNG + long-press save, empty state, manual entry, units, help, keyboard, delete all data) |
| unit tests (`npm test`) | **99 / 99 passed** |
| typecheck + lint (`npm run typecheck`, `npx expo lint`) | **0 errors, 0 warnings** |
| no open S1 or S2 bugs | **none known**, but the device checklist (`SETUP.md` step 7) hasn't been run, so device-only bugs are unknown |
| parity (`parity.py`) | **13 / 13 must-haves**, score **91.1** |
| rebrand sweep (`sweep.py`) | **exit 0, clean** |
| store listing (`listing.py`) | **exit 0**, 0 errors, 0 warnings |
| production build (`npm run build`) | **passes** (web export, 12 routes). iOS production build: needs your Expo + Apple accounts |
| expo-doctor | 18/20; the 2 failures need exp.host and reactnative.directory, which this environment can't reach. Versions match SDK 58 |
| privacy policy and terms live, every processor listed | **not yet**: `site/privacy.html` is written (processors: Supabase for the Strava token swap; Strava; Apple). Fill in its placeholders and put it online. No separate terms page is needed for a free app with no accounts; Apple's standard EULA applies |
| account deletion works | **yes**: there are no accounts; Settings → Delete all data wipes everything and revokes Strava (e2e-tested) |
| favicon, titles, OG image, app icon are yours | **placeholders that are yours** (generated from the logo brief); a designer's final icon is still to come |

**Blocked, not failed:** device checks, the iOS build and the live privacy URL
all need your accounts. Code-side, nothing blocks.

## Production services

| item | what to do | status |
| --- | --- | --- |
| Supabase | a **separate production project** for the token function (not the one you test with). Deploy: `npx supabase functions deploy strava-token --no-verify-jwt`; secrets `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` via `npx supabase secrets set` | you |
| app env vars (EAS, `--environment production`) | `EXPO_PUBLIC_STRAVA_CLIENT_ID`, `EXPO_PUBLIC_STRAVA_TOKEN_URL`, `EXPO_PUBLIC_META_APP_ID`, `EXPO_PUBLIC_SUPPORT_EMAIL` (matches `.env.example`) | you |
| Strava | callback domain `localhost` (redirect `mileprint://localhost/strava`). Request capacity beyond 1 athlete before the public beta | you |
| Meta | app ID for Instagram Stories sharing | you |
| Apple | bundle ID set in `app.json`, HealthKit capability (added by the build), App Store Connect app record | you |
| Stripe / email / OAuth web origins | not used in v1 | n/a |

## Website hosting and domain

`site/` is plain static files: no build, no server. Any static host works.
Default suggestion: **Cloudflare Pages** or **Netlify** (free, automatic
HTTPS, deploy from the repo with the publish directory `site`). Vercel works
too.

`.app` domains only work over HTTPS (the TLD is on the browser HSTS preload
list). All three hosts issue certificates automatically; just check the
padlock after DNS settles.

DNS at your registrar for `mileprint.app`. Use the exact values the host
shows when you add the domain; typical ones:

| record | name | value |
| --- | --- | --- |
| CNAME (or ALIAS/flattened) | @ | Netlify: `apex-loadbalancer.netlify.com` · Cloudflare Pages: `<project>.pages.dev` · Vercel: A record to the IP Vercel shows |
| CNAME | www | Netlify: `<site>.netlify.app` · Cloudflare: `<project>.pages.dev` · Vercel: `cname.vercel-dns.com` |
| TXT | as asked | the host's verification value, if it asks |

Canonical host: **mileprint.app** (apex); redirect `www` to it.

Email (only if `support@mileprint.app` is a real mailbox or forward): add the
provider's SPF (TXT) and DKIM records, plus DMARC starting at
`v=DMARC1; p=none; rua=mailto:YOUR_ADDRESS`, tightened to `p=quarantine`
once reports are clean. Mileprint sends no email itself, so this only
affects your replies.

## iPhone app

```bash
npx eas-cli@latest build --profile production --platform ios
```

```bash
npx eas-cli@latest submit --platform ios
```

Then in App Store Connect: TestFlight external testing with a public link
(`launch-plan.md`), and later submit for review with `listing.json`,
`app-store-extras.md` (privacy label "Data Not Collected", review notes,
HealthKit notes) and screenshots from the production build.

## Watch it (first week)

| what | how | notes |
| --- | --- | --- |
| download size | `npm run size` before each build (JS + assets budget); EAS build page or App Store Connect → App Store File Sizes for the full download | target under 60 MB |
| crashes and hangs | App Store Connect / TestFlight crash reports, Xcode Organizer | no SDK, so "Data Not Collected" stays true |
| token function | Supabase function logs and invocation errors | a failure spike means Strava sign-ins are failing |
| website up | any free uptime monitor on `https://mileprint.app` | optional |
| usage | App Store Connect App Analytics | aggregate, opt-in by Apple |
| feedback | TestFlight feedback, support email | answer within a day |
| the core flow | you, on your phone: import → story → Instagram | and two testers on other watches |

## Go / no-go

Ready to go once you have:
1. done the account steps (`SETUP.md`),
2. passed the device checklist (`SETUP.md` step 7) on your phone, and
3. put `site/` online with the placeholders filled.

Then reply "go" and I'll walk through the TestFlight build and submission
with you, checking each step's output.
