# App Store Connect: everything besides the listing text

The listing text is in `listing.json` (checked with `listing.py`: 0 errors,
0 warnings). This file covers the rest of the submission.

## URLs

| field | value |
| --- | --- |
| Support URL | `https://mileprint.app/support` (page in `site/support.html`) |
| Privacy Policy URL | `https://mileprint.app/privacy` (page in `site/privacy.html`) |
| Marketing URL | `https://mileprint.app` |

If you use a different domain, change these and the links in `site/`.

## App Privacy ("nutrition label")

**Data Not Collected.** Mileprint stores activities, photos and designs only
on the phone. Nothing is sent to us. The only network traffic:
- Apple Health: on-device, no network.
- Strava: the app talks to Strava directly with the user's own tokens. The
  sign-in code goes once through our token function, which swaps it with
  Strava and keeps nothing (`supabase/functions/strava-token/handler.ts`).
  That's transient processing to serve the request, not collection.
- Instagram / share sheet: the image goes where the user sends it.

Re-check this if analytics or crash reporting is added (see
`launch-plan.md`): crash data then becomes "Diagnostics, not linked to you".

## HealthKit review notes

Apple checks HealthKit apps closely (Guidelines 2.5.1 and 5.1.3):
- Purpose string: "Read your workouts, routes, heart rate and distance from
  Apple Health to turn them into story graphics. Nothing is written to Health
  and nothing leaves your phone." (set in `app.json`)
- Read-only. No health data in iCloud, ads or marketing, and none sold.
- The app is fully usable without Health (files, Strava, manual entry,
  sample activities).

## Age rating

4+. No user-generated content shared inside the app, no web browsing, no
ads, no purchases at launch.

## Review notes (paste into "Notes for review")

> Mileprint needs no account. To try it without your own workouts: Settings →
> Add sample activities, then tap any activity to open the story editor. Add
> stickers with +, change the background, and tap Save or Share. Copy
> stickers is the copy icon in the editor's top bar. Apple Health sync is
> under Settings → Connections; it is read-only and optional. Strava sync is
> optional and requires the reviewer's own Strava account.

## Screenshots

Take them from a production build on the sizes App Store Connect asks for at
upload time (they change; currently a 6.9" iPhone set is required). Suggested
five, each with a one-line caption in the brand voice:

1. The editor with a photo story: "Your run, ready to post"
2. The sticker sheet: "25 stickers. No watermark."
3. Activity list with "Updated just now": "Synced before you've caught your breath"
4. Copy stickers page: "Copy any sticker, paste it anywhere"
5. Settings → Connections: "Apple Health, Strava, or a file. No account."

Captions describe Mileprint's own features. No ranking claims ("#1", "best"),
no other app's name.

## Category

Primary: Health & Fitness. Secondary: Photo & Video.
