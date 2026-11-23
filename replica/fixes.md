# What to fix, and the angle

Source: **232 App Store reviews** of Share Aura (229 after the ranking tool
removed 3 duplicates), from Apple's public review feed for the US, UK, Canada
and Australia, Aug 11 2025 to Nov 7 2026. Full rows with links:
`replica/reviews.csv`. Ranking: `replica/feedback.md` (run
`python3 .claude/skills/replica-entrepreneur/reviews.py replica/reviews.csv --themes replica/themes.json`).

**Read with care.**
- **One source only.** Searches found no Reddit, G2, Capterra, Trustpilot or
  Hacker News discussion of Share Aura. Google Play reviews exist, but their
  terms forbid scraping, so they weren't collected. The tool therefore marks
  every theme **thin**.
- **Skewed positive.** 199 of 232 reviews are 5 stars, many from launch week,
  and several praise the founder by name. Only 33 reviews are 1 to 4 stars.
  The counts below are small: read them as signals, not trends.
- Each quote is copied exactly from the review it links to.

## 1. What they hate

Ranked by the tool's weighted score (low stars weigh more).

1. **Sync is slow, stops, or misses the latest workout.** 11 reviews, 1 source, avg 2.0★.
   - "The app stopped syncing all activity." ([1★](https://itunes.apple.com/us/rss/customerreviews/page=3/id=6742422198/sortBy=mostHelpful/json#review-13901754889))
   - "It’s showing workouts / runs from 3+ days ago, not today’s." ([2★](https://itunes.apple.com/gb/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-13961475665))
   - "Pull to refresh on the home page hangs constantly so new activities don’t show up immediately after finishing a workout from Apple Health." ([3★](https://itunes.apple.com/us/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-14396738753))
2. **Crashes, freezes, lag.** 8 reviews, 1 source, avg 2.1★.
   - "lately the app crashes every time I add more than one element to the screen" ([3★](https://itunes.apple.com/us/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-14390997915))
   - "after trying to share my recent hike, all it does is freeze and force me to restart again and again." ([2★](https://itunes.apple.com/us/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-13452449038))
3. **My watch or app isn't supported.** 7 reviews, 1 source, avg 2.0★.
   - "Not compatible with Strava" ([1★](https://itunes.apple.com/au/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-13596614446))
   - "Aura only works for Garmin and Coros users." ([1★](https://itunes.apple.com/us/rss/customerreviews/page=3/id=6742422198/sortBy=mostHelpful/json#review-13703592870))
   - "Recently changed to the Amazfit product line and it’s not option for Aura!" ([4★](https://itunes.apple.com/us/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-13577302282))
4. **Hard to get in: waitlist, sign-up, onboarding.** 8 reviews, 1 source, avg 2.9★.
   - "Only allows sign up using Gmail or Apple." ([1★](https://itunes.apple.com/us/rss/customerreviews/page=3/id=6742422198/sortBy=mostHelpful/json#review-14098748548))
   - "Initial onboarding failed which then blocked me from picking the username I wanted" ([1★](https://itunes.apple.com/us/rss/customerreviews/page=4/id=6742422198/sortBy=mostHelpful/json#review-14486859948))
5. **No help or support.** 4 reviews, 1 source, avg 1.5★.
   - "No FAQ’s section or support of any kind through the app." ([1★](https://itunes.apple.com/us/rss/customerreviews/page=3/id=6742422198/sortBy=mostHelpful/json#review-13901754889))
6. **Wrong numbers: splits, elevation, workout type, combined mileage.** 5 reviews by the tool’s patterns, plus 1 it missed (a title), 1 source.
   - "The splits are always wrong" ([2★, title](https://itunes.apple.com/us/rss/customerreviews/page=3/id=6742422198/sortBy=mostHelpful/json#review-13932182607))
   - "it combines the total walking and running distance towards my weekly running mileage" ([4★](https://itunes.apple.com/gb/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-14323200945))
   - "can duplicate workouts if you have apple health and Garmin connected" ([3★](https://itunes.apple.com/gb/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-14103764104))
7. **Big download, permission nags, layout doesn't fit.** 4 reviews, 1 source.
   - "the app is half a gb? Ok" ([1★](https://itunes.apple.com/us/rss/customerreviews/page=4/id=6742422198/sortBy=mostHelpful/json#review-13012047703))
   - "constantly asks for you to share all your pictures every time you open the app" ([3★](https://itunes.apple.com/gb/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-14103764104))
8. **Forced watermark.** 2 reviews (one complaint, one praising its earlier absence), 1 source. **Thin.**
   - "Forced watermark ruins it. Who approved this?" ([1★](https://itunes.apple.com/us/rss/customerreviews/page=4/id=6742422198/sortBy=mostHelpful/json#review-13996472584))

## 2. What is missing

1. **Choose which stats a sticker shows** (and add max HR etc.), more fonts. 6 reviews, 1 source. **Thin.**
   - "needs the ability for you to customise the input and remove what you don’t want / add in additional data" ([3★](https://itunes.apple.com/gb/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-14103764104))
   - "Maybe just a big more serifs to go through or other fonts" ([5★](https://itunes.apple.com/us/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-14051402743))
   - "Add arabic fonts please." ([5★](https://itunes.apple.com/us/rss/customerreviews/page=3/id=6742422198/sortBy=mostHelpful/json#review-13848973923))
2. **Android.** 1 review. **Thin.** "Please support for Android :)" ([5★](https://itunes.apple.com/us/rss/customerreviews/page=4/id=6742422198/sortBy=mostHelpful/json#review-13169196156))
3. **More sports** (skating). 1 review. **Thin.** "Would love to see skating sessions on there." ([3★](https://itunes.apple.com/us/rss/customerreviews/page=3/id=6742422198/sortBy=mostHelpful/json#review-13170430018))

## 3. What is unsolved (positioning)

1. **People who just want to post a run, not join another network.** The
   social layer (v3.0, Aug 2026) brought accounts, usernames and onboarding;
   sign-up and onboarding complaints appear alongside it, and one reviewer asks
   outright: "Why copy instagram and strava? Who asked for it?"
   ([1★](https://itunes.apple.com/ca/rss/customerreviews/page=1/id=6742422198/sortBy=mostHelpful/json#review-14546246670)).
   8 access + 1 "who asked" reviews. **Thin.**
2. **Athletes on anything other than Garmin or Coros** (Apple Watch via
   Health, Hammerhead, Amazfit, Strava-first users). 7 reviews. **Thin.**
3. **People who post right after they stop.** The top complaint: today's
   workout isn't there yet. 11 reviews. **Thin.**

## Already solved by this build

Don't spend effort here again; say it in the listing instead.

| complaint | what the build does |
| --- | --- |
| waitlist, sign-up, username | no account at all; data stays on the phone |
| duplicates from Health + Garmin | same-workout merge (sport, ±2 min, ±3% distance) |
| walking counted as running mileage | totals count one sport family; walks and runs are separate |
| workout read as the wrong type | type is editable in activity details |
| Strava / Apple Health / other devices | Apple Health (any device that writes to it), Strava, GPX/TCX/FIT |
| latest workout missing | Health background delivery + anchored sync; Strava re-reads 3 days |
| photo permission nags | asked only when picking or saving a photo |
| layout doesn't fit the screen | canvas scales to any screen |

## 4. Fix plan

Evidence × cheapness, top first. Each is now a row in `features.csv`
(`original` = no).

| # | change | size | skill | evidence |
| --- | --- | --- | --- | --- |
| 1 | **Sync you can see**: "Syncing…" and "Updated 2 min ago" on the list, a toast when a background sync adds a workout, and a "Missing a workout?" sheet that checks Health permission and Strava connection | S | replica-build | sync, 11 reviews |
| 2 | **Help and feedback in the app**: short FAQ plus "Email us" pre-filled with app version and device | S | replica-build | support, 4 |
| 3 | **Done.** **Pick the stats on a sticker**: stat grid, three stats, stat list and one-line stickers let you choose which stats appear and in what order (incl. max HR) | M | replica-build | customise, 6 |
| 4 | **Done.** **Watch laps for splits**: use laps from FIT files and Strava's laps when present, GPS splits otherwise, and say which | M | replica-backend | accuracy, 5 (+1) |
| 5 | **Done (device check pending).** **Speed budget for the editor**: test with 15 stickers on an older iPhone; no crash or freeze adding elements; crash reporting before launch | S | replica-test | stability, 8 |
| 6 | **Done (check the native size on the first build).** **Small app, no watermark**: keep the download under ~60 MB (check each build); never force a watermark | S | replica-launch | footprint 4, watermark 2 |
| 7 | **More sports**: skate, ski, row, elliptical, yoga, climb as their own types with icons | S | replica-build | sports 1, wrong type 1 (**thin**) |
| 8 | **Arabic-capable font** (Noto Sans Arabic, OFL) | S | replica-build | 1 (**thin**) |

Android is out of scope for now. The codebase is Expo, so it's possible later.
Pricing: no complaints, because the original is free. Reviewers value that
("Free. No watermark."), which goes to `/replica-launch`.

## 5. The angle

**A. No account, no feed, no waitlist.**
For runners who want to post a run, not join another social network, [app]
turns any workout into a story without an account, a waitlist or a watermark.
Evidence: access 8 + watermark 2 + "who asked" 1 (11 reviews, 1 source).

**B. Works with whatever you run with.**
For athletes whose watch isn't Garmin or Coros, [app] works with anything that
saves to Apple Health or Strava, plus GPX, TCX and FIT files.
Evidence: sources, 7 reviews, 1 source.

**C. Your run is ready when you stop.**
For runners who post right after a workout, [app] has today's run waiting the
moment it's saved, with no refreshing or waiting days.
Evidence: sync, 11 reviews, 1 source (the top complaint).

**Recommended: A, with C as the proof.** A is the clearest difference from
where Share Aura is heading (social, accounts). It's true of this build today,
and it's cheap to keep true. C is the most-cited pain and the build already
answers it (background sync). B belongs in the listing's feature list, not the
headline. Never use Share Aura's name in the app name, ads or store listing.
