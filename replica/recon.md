# Recon map: Share Aura: Track & Create (iOS)

Scope: **the stat-graphic editor** (import an activity, compose a story graphic
from stat templates, export to Instagram Stories / camera roll / clipboard).
Tracker, Runcam and the social layer are mapped below but are later phases.
Platform for the clone: **native iPhone app (Expo / React Native)**, so it can sync Apple Health and Strava (revised 2026-11-17; was web).
For: runners first; positioning to be decided by `/replica-entrepreneur`.
Date: 2026-11-16

Everything here comes from public sources. No account was used, no app binary
or network traffic was inspected. Screenshots in `replica/screens/` are
reference only and are git-ignored (re-download with `urls.txt`).

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | App Store listing | https://apps.apple.com/us/app/share-aura-track-create/id6742422198 | description, ratings, 4 visible reviews, version history, privacy labels |
| 2 | iTunes lookup API | https://itunes.apple.com/lookup?id=6742422198&country=us | metadata, 7 screenshot URLs |
| 3 | App Store screenshots (7) | is1-ssl.mzstatic.com (see `screens/urls.txt`) | Share, Copy, Track (profile), Create, Post, Follow, Record |
| 4 | Customer reviews RSS | https://itunes.apple.com/us/rss/customerreviews/id=6742422198/sortBy=mostRecent/json | returned **0 entries** on 2026-11-16 |
| 5 | Developer site / support | https://www.shareaura.app/ , /support | client-rendered; no readable content without a browser. Not read. |
| 6 | Web search | appgoblin.info/apps/6742422198 (third-party stats) | ~58K-70K installs (third-party, approximate) |

Facts from 1-2: by Aura Movement Technology, Inc.; Health & Fitness (+ Photo &
Video); free, no IAP listed; 4.9 from ~2.7K ratings; iOS 17.6+, iPhone + Apple
Watch; EN, ES; v3.1.10 (2026-11-03); 373 MB.

## Core loop

Finish a workout -> pick the synced activity -> drop stat templates onto a
photo -> post it to Instagram Stories in under a minute.

## Screens

Confidence: **seen** = in a store screenshot; **text** = named in listing or
release notes; **guess** = inferred.

| ID | screen | how to reach | purpose | key components | states | conf. |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | Sign in / onboarding | first launch | account, connect a source | auth buttons, permission prompts | new, returning, error | guess |
| S02 | Connect a data source | onboarding, settings | link tracking device / health data | provider list, connect button | none, connected, error, syncing | text |
| S03 | Activity list | home | pick a synced activity to share | activity rows (type, date, distance, map thumb) | empty, syncing, filled | guess |
| S04 | Story editor (canvas) | pick activity | compose a 9:16 graphic | photo background, route trace, stat block, title + location; right rail: layers, draw, Aa text, colour wheel, more; top: close, frame toggle, collapse; bottom: **+** add, **Aura Story**, **Photos** (save), share | no photo, photo, editing element | seen |
| S05 | Template sheet | **+** on S04 | add a stat element | bottom sheet; tabs **Activity / Totals / Gear**; chips comment, Aa text, @ mention; grid: distance, distance+pace, with route, 2x2 stats, 3x2 stats, chat bubble, big type, splits bars | per tab, scrolled | seen |
| S06 | Clipboard ("Copy") | its own entry point | one-tap copy a sticker to paste in Instagram | colour, font, activity picker ("6.0 mi run"), close; "Tap to copy / press + hold to save"; tabs Activity / Totals / Gear; sticker grid (highlighted text, verified badge, newspaper clipping, heart pill, chat bubbles, big type); pager | idle, copied toast | seen |
| S07 | Totals | tab in S05/S06 | weekly/monthly aggregates as stickers | totals templates | no data, filled | text |
| S08 | Gear | tab; Aura Gear (v3.0) | gear as stickers + on profile | gear list, add gear | empty, filled | text |
| S09 | Tracker | tab "track" | record run/ride (GPS) | 3D map, compass, route/3D/locate buttons, timer, pace, distance, Pause | idle, recording, paused, finished | seen |
| S10 | Runcam | tracker mode | camera with live stat overlay | camera view, live stats | recording, saved | text |
| S11 | Explore feed | tab "explore" | discover activity stories | segments For You / Following / Near You, search, story cards with like | loading, filled, empty | seen |
| S12 | Story viewer | tap card | view a posted activity | progress bar, author, time, place, photo, mini map, 6 stats (distance, pace, time, elevation, calories, avg HR), message box, like, comment, share | | seen |
| S13 | Profile | tab "profile" / avatar | athlete page | cover, avatar, followers / following / this-week distance, name, handle, "follows you", bio, tags, Follow / Message, story grid with date + distance | own, other, private | seen |
| S14 | Messages | tab "messages" | DMs | thread list, badge | empty, unread | seen (tab only) |
| S15 | Home | tab "home" | own feed/activities | | | seen (tab only) |

## Flows

```
F01 Turn a synced activity into an Instagram story          (core loop, in scope)
    S03 pick activity -> S04 editor -> pick photo -> S05 add template(s)
    -> style (font, colour, drag/scale) -> share / save
    happy path taps: ~6 (activity, photo, +, template, share, Instagram)
    edge: no photo (solid/gradient bg), no GPS route (treadmill, gym),
          very long activity names, km vs mi, missing HR/elevation,
          share sheet unavailable (desktop) -> download

F02 Copy one stat sticker to paste into Instagram           (in scope)
    S06 pick activity -> tap template -> "Copied" -> paste in Instagram
    taps: 2-3
    edge: clipboard image write not supported -> fall back to save

F03 Get activities in                                        (in scope, adapted)
    S01 -> S02 connect source -> S03 list fills
    edge: sync fails, duplicate activities, units

F04 Share totals / gear stickers                             (should)
    S06 Totals or Gear tab -> pick period/gear -> copy or add to S04

F05 Record a run with the tracker                            (later phase)
    S09 start -> pause/resume -> finish -> S04

F06 Runcam: film with live stats                             (later phase)

F07 Post to stories, browse, follow, message                 (later phase)
    S04 "Aura Story" -> S12; S11 -> S13 follow; S14
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Icon button (round, translucent) | close, tool, collapse | default, active, disabled | S04, S06, S09 |
| Pill button | primary, secondary (translucent), destructive | default, pressed, loading | S04, S09, S13 |
| Bottom sheet | half, full, with grabber | open, dragging | S05 |
| Segmented tabs | text tabs (Activity/Totals/Gear), pill segments (For You/...) | selected | S05, S06, S11 |
| Chip | action (comment, text, mention), tag | default, selected | S05, S13 |
| Template tile | ~20+ layouts | default, pressed, copied | S05, S06 |
| Stat block | 1-6 stats, label above value, units | | S04, S12 |
| Route trace | line on transparent / on map thumb | | S04, S05, S12 |
| Colour picker | wheel button, palette | | S04, S06 |
| Font picker | "Aa" cycling fonts | | S04, S06 |
| Toast | "Copied to clipboard!" | shown, hidden | S06 |
| Canvas element | text, sticker, route, image | selected, dragging, pinching | S04 |
| Tab bar | 5 items, badge | selected | app shell |
| Story card / grid tile | with date + distance overlay | | S11, S13 |

## Inferred data model

```
User        id, name, handle, email, avatar_url, units (mi|km)
            evidence: privacy labels (email, name, user ID), S13   confidence: high

Connection  id, user_id, provider, external_user_id, tokens, last_synced_at
            evidence: "Connect your tracking device, sync"          confidence: medium

Activity    id, user_id, source, external_id, type (run|ride|walk|workout),
            title, started_at, timezone, location_name, distance_m,
            moving_time_s, elapsed_time_s, avg_pace, elevation_gain_m,
            calories, avg_hr, splits (json), route (polyline)
            evidence: S04, S05, S06, S12 stats                       confidence: high

Template    id, category (activity|totals|gear), layout (json), default_font,
            default_colour, needs (route|hr|splits...)
            evidence: S05, S06 "45+ templates"                       confidence: high

Composition id, user_id, activity_id, background (photo|colour), elements (json:
            template_id, x, y, scale, rotation, font, colour, text), exported_at
            evidence: S04                                            confidence: medium

Gear        id, user_id, name, type (shoes|bike|...), distance_m, photo
            evidence: v3.0 notes "Aura Gear", Gear tab               confidence: medium

Totals      computed: user_id, period (week|month|year), distance, time, count
            evidence: Totals tab, S13 "this week"                    confidence: medium

-- later phases --
Story(post) id, user_id, activity_id, media_url, caption, created_at   (S12)   high
Follow      follower_id, followee_id                                   (S13)   high
Like / Comment / Message                                               (S12, S14) high
```

Relationships: User 1-n Connection, User 1-n Activity, Activity 1-n Composition,
User 1-n Gear, Activity n-1 Gear (guess), User n-n User (Follow).

## Feature matrix

See `features.csv`. Must: 17, should: 9, could: 6, skip: 5.

## Out of scope (cannot or should not be cloned)

- **Their name, logo, template designs, fonts, wording and imagery.** Templates
  are rebuilt as our own layouts; "Aura" appears nowhere in the clone.
- ~~Apple HealthKit~~ now **in scope**: the clone is a native app (revised
  2026-11-17). Strava via its official API is in scope too.
- **Garmin / Coros / Polar direct sync** - partner programs with approval; later.
- **Their users, social graph and content** - the network is not a feature.
- Native "share to Instagram Stories" is now in scope (native app).

## Size

Editor slice: screens 7 (S01-S08 minus native-only), flows 4 (F01-F04),
entities 6. Hard parts:
1. Client-side compositing + export at 1080x1920 that looks identical on screen
   and in the PNG (fonts loaded, retina, route drawing).
2. Touch editing on the canvas: drag, pinch-scale, rotate, select, layering.
3. Getting data in without HealthKit: FIT parsing (binary), GPX/TCX, Strava OAuth.
4. Clipboard image write + Web Share on iOS Safari (gesture rules, fallbacks).

Size: **M** (a few weeks) for the editor slice. Whole app with tracker, Runcam
and social: **XL** - rescope, ship the editor first.
