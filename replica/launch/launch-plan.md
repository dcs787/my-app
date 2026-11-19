# Launch plan: Mileprint

The angle is "no account, no feed, no waitlist", so the launch can't have a
waitlist either. The beta is a public TestFlight link anyone can join.

## Before anything (you)

From `SETUP.md`, in order. Each unblocks the next:

- [ ] Register **mileprint.app** (unregistered as of 2026-11-19). Run the
      official trademark searches in `brand.md`, and talk to a lawyer before
      spending more on the name.
- [ ] Apple Developer Program; set your own `ios.bundleIdentifier`.
- [ ] Strava API app (callback domain `localhost`), Supabase token function,
      Meta app ID, support email; set them with `eas env:set`.
- [ ] Fill the highlighted placeholders in `site/privacy.html` and
      `site/support.html` (your name or company, support email).
- [ ] Put `site/` online at mileprint.app (any static host). The App Store
      needs the privacy and support URLs to resolve.

## Week 1: on your own phone

- Development build (`SETUP.md` step 2) and the checklist in `SETUP.md` step 7.
- Post three real runs to your own Instagram with it. Note every moment of
  friction. That's the first bug list.

## Weeks 2 to 4: public TestFlight beta

- `npx eas-cli@latest build --profile preview --platform ios`, then add it to
  TestFlight external testing with a **public link**. No sign-up form, so no
  email list to manage or protect.
- Link it from the landing page button ("Try the beta") until launch.
- **Measure without an SDK** (keeps the "Data Not Collected" label true):
  - Crashes and hangs: App Store Connect / TestFlight crash reports and
    Xcode Organizer.
  - Feedback: TestFlight's screenshot feedback, and Settings → Help and
    feedback email.
  - Usage: App Store Connect App Analytics (aggregate, from users who opted
    in with Apple).
- **The one number that matters:** of testers who imported a workout, how
  many shared a story the same day. Ask them directly if analytics can't say.
- If crash reports aren't enough, add Sentry (Expo plugin) and change the
  privacy label to "Diagnostics, not linked to you" in the same release.

## The first 10 users, by hand

Find them through your own runs and clubs, not ads. Aim for this mix,
because it covers the complaints the research found:

| # | who | why |
| --- | --- | --- |
| 3 | Apple Watch runners who post on Instagram weekly | the core loop |
| 2 | Garmin or Coros owners | sync through Health, splits accuracy |
| 1 | Amazfit, Hammerhead or Polar owner | "my device isn't supported" (7 reviews) |
| 2 | Strava-first runners who don't use Health | the Strava path, merge with Health |
| 1 | cyclist | speed instead of pace, ride totals |
| 1 | someone who quit an app over sign-ups or a waitlist | the angle itself |

Watch each one make their first story (in person or on a call), say nothing,
take notes. Ask afterwards: "What did you expect to be able to do that you
couldn't?" Five of these beat a hundred survey answers.

## Where to talk about it

The research found **no public threads about the reference app** (Reddit, HN,
G2, Trustpilot), so there's no pool of its unhappy users to point at. Go
where runners who post their runs already are, and follow each place's
self-promotion rules:
- Running clubs and run crews you're part of: the best channel by far.
- r/running (self-promotion only where the rules allow), r/AppleWatchFitness,
  r/Garmin, r/Strava: share it when someone asks how to make run graphics,
  and say you made it.
- Your own Instagram: every story you post with Mileprint is the ad.
- Never post fake reviews or ask testers for 5 stars. Ask for honest
  feedback; the App Store review prompt can come later, after a successful
  share.

## Launch day

- App Store release, landing page button switched to the store link.
- **Product Hunt**, leading with the fix, not the clone:
  - Name: Mileprint
  - Tagline: Your run, ready to post. No account needed.
  - First comment: why it exists (posting a run shouldn't need another social
    network), what it reads (Apple Health, Strava, files), what it doesn't
    do (no account, no feed, no watermark, nothing uploaded), and that it's
    free.
- A short "Show HN" only if there's something technical worth discussing
  (local-first, HealthKit background sync, Skia rendering). Otherwise skip.
- Don't name the reference app anywhere. Compare features, not brands.

## After launch

- Reply to every App Store review, especially the bad ones, within a day.
- Rerun `/replica-entrepreneur` on Mileprint's own reviews at 100 reviews.
- Remaining fixes from `fixes.md`: choose the stats on a sticker, watch laps
  for splits, the editor speed budget. Then Plus (`pricing.md`).
