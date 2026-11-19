# Brand: Mileprint

Angle (from `fixes.md`): **No account, no feed, no waitlist.** For runners who
want to post a run, not join another social network.

## 1. Name

### 20 candidates

| style | candidates |
| --- | --- |
| descriptive | Postrun, Runcard, Splitcard, Finishcard |
| compound | Mileprint, Paceprint, Runstamp, Bibshot, Stridecard, Lapnote, Mileframe, Aftermile |
| invented | Kilomark, Tempofold, Mileday |
| metaphor | Chalkline, Cooldown, Milepost |
| verb | Tally, Postmark |

Out at once: Tally and Postmark (big existing software brands), Cooldown and
Milepost (generic, crowded), anything meaning glow, energy or aura (too close
in meaning to the reference).

Out after checks:
- **Paceprint**: an existing App Store app, "PacePrint", turns runs into
  Instagram story cards. Same job.
- **Runstamp**: two existing App Store running-poster apps.
- **Postrun**: "Post Run: Stretch-Timer", Health & Fitness.
- **Chalkline**: five App Store apps.
- **Splitcard**: pending US filings in classes 9 and 42, and a finance app.
- **Stridecard**: a crowded field of "Stride" running apps.

### Shortlist and checks

Checks run on **2026-11-19**. "To run" means nobody has checked it yet. These
are screening checks, not legal clearance.

| check | Mileprint | Bibshot | Finishcard | Mileframe | Aftermile |
| --- | --- | --- | --- | --- | --- |
| App Store, exact name (Apple search API) | none found | none found | none found | none found | none found; "after run - running app" is similar |
| the web (name + category) | nothing found | nothing found | "Finisher Wall" app (race medals) | nothing found | "after run" running app |
| US trademark (screened via Justia/USPTO.report search) | none found | none found | "START TO FINISH CARD" (credit cards); FINISH LINE (athletic retail) | none found | none found |
| US trademark, official (tmsearch.uspto.gov, classes 9 and 42) | to run | to run | to run | to run | to run |
| EU trademark (EUIPO eSearch / TMview) | to run | to run | to run | to run | to run |
| Canada (ised-isde.canada.ca) | to run | to run | to run | to run | to run |
| WIPO Global Brand Database | to run | to run | to run | to run | to run |
| .com (Verisign RDAP) | registered | registered | registered | registered | registered |
| .app (Google Registry RDAP) | **not registered** | **not registered** | **not registered** | registered | registered |
| Google Play, exact name | to run | to run | to run | to run | to run |
| handles: X, Instagram, TikTok, GitHub | to run | to run | to run | to run | to run |

**Recommended: Mileprint.** "Print your miles": the story you make is the
print. It's short and spellable on first hearing. It shares no sound, look or
meaning with the reference ("Share Aura") or with Strava, Runna or Stryd, and
it's the cleanest of the five on every check run so far.

Before spending money: register `mileprint.app` (unregistered as of
2026-11-19), run the official trademark searches above, check handles, and
have a trademark lawyer do a proper clearance search. Bibshot is the backup
(.app free; "shot" can read as a drink, and it leans towards race photos).

## 2. Palette

The reference uses an electric blue/violet (#524de5) and a hot pink
(#ff018f). Strava owns orange (#FC5200) in this category. Mileprint uses a
different family:

| role | value | use |
| --- | --- | --- |
| accent (primary) | **#3EE0C5** teal | primary buttons, selected tabs and chips, focus ring |
| on-accent | #06221D | text on teal |
| highlight (secondary) | **#FFC24D** amber | small doses: badges, live states |
| bg / surface / surfaceRaised | #0A0A0B / #161618 / #232326 | unchanged dark UI |

Contrast: 20 pairs, **0 AA failures**
(`python3 .claude/skills/replica-design/contrast.py replica/design/tokens.json`).
Sticker swatches start with white, black, Mileprint teal and amber.

## 3. Logo brief

- **Idea:** one continuous route line that draws a lowercase **m** and ends
  in a dot: a run, printed. The same end dot the app puts on every route.
- **Mark type:** symbol + wordmark. Symbol alone is the app icon.
- **Wordmark:** "mileprint", lowercase, in a heavy geometric sans (open
  licence, e.g. Inter ExtraBold, which the app already ships), tight tracking.
- **Colours:** teal line on near-black (#0A0A0B); one-colour versions in black
  and white.
- **Must work at 16 px** (favicon: the m line alone, thick stroke, no dot)
  **and as a 1024 px app icon**.
- **Deliverables:** SVG (symbol, wordmark, lockup); iOS app icon 1024×1024
  with no transparency; favicon set; social image 1200×630.
- **Must not resemble the reference's mark:** no orb, glow or gradient halo,
  no blue/pink pairing, no "a" letterform tricks. Put the reference's icon
  next to the drafts and check before choosing.

A placeholder icon built from this brief is in `assets/images/` (replacing
Expo's template icon). A designer should do the final version.

## 4. Voice

**Direct, not blunt.** Say what happened and what to do next, in as few
words as that takes.
**Warm, not cutesy.** Sound like a running friend: no exclamation marks, no
puns on "aura" or "vibes".
**Proud, not boastful.** Celebrate the run, never the app.

| do | don't |
| --- | --- |
| "Saved to Photos" | "Woohoo! Your masterpiece is saved! 🎉" |
| "Couldn’t save. Try again." | "Oops! Something went wrong :(" |
| "No account needed." | "Join the community!" |
| "Bring in a run to get started" | "Unleash your inner athlete" |
| "Up to date" | "You're all caught up, superstar!" |

### The 10 most-seen strings

| # | where | string |
| --- | --- | --- |
| 1 | first screen title | Bring in a run to get started |
| 2 | first screen body | Sync from Apple Health or Strava, open a GPX, TCX or FIT file from your watch, or type one in. No account needed. |
| 3 | primary editor action | Share / Instagram |
| 4 | after saving | Saved to Photos |
| 5 | after copying a sticker | Copied. Paste it into your story. |
| 6 | save or share failed | Couldn’t save. Try again. / Couldn’t share. Try again. |
| 7 | pull to refresh | Up to date / 2 new, 1 matched to activities you already had |
| 8 | Settings, your data | Everything stays on this phone. Nothing is uploaded. |
| 9 | Settings footer | Mileprint 1.0.0 · No account. Your runs stay on this phone. |
| 10 | deleting | Delete this activity? Its story designs are deleted too. This can’t be undone. |

All written fresh. None echo the reference's phrasing.

## 5. Sweep

```bash
python3 .claude/skills/replica-brand/sweep.py . --config replica/brand.json
```

Result 2026-11-19: **Clean.** Checked by eye too: app name, URL scheme
(`mileprint://`), database file, README and setup guide. The app icon,
splash and favicon now use the placeholder Mileprint mark.

Changes for whoever sets up accounts: the Strava redirect is now
`mileprint://localhost/strava` (callback domain stays `localhost`), and the
bundle ID placeholder is `com.example.mileprint`.
