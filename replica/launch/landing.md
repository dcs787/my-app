# Landing page: mileprint.app

Built in `site/index.html` (static, no build step, no trackers). Copy in the
brand voice (`brand.md`): direct, warm, proud of the run, not the app.

## 1. Hero

- **Headline:** Your run, ready to post.
- **Line:** Mileprint turns any workout into an Instagram story in seconds.
  No account, no feed, no waitlist.
- **Button:** Download on the App Store (link added at launch)
- **Image:** the editor with a run on the teal "Tide" background (real app
  screenshot).

## 2. The problem

Paraphrased from the review research (`fixes.md`), not quoted:
- Posting a run shouldn't mean signing up for another social network.
- When you stop your watch, you want to post now, not wait for it to show up.

## 3. How it works

1. **Finish your run.** It arrives from Apple Health or Strava on its own,
   or open a file from your watch.
2. **Make it yours.** Drop on stickers: distance, pace, route, splits, your
   week. Pick a photo, font and colour.
3. **Post it.** Straight to Instagram Stories, or save it, or copy one sticker.

## 4. Features, led by the fixes

| feature | answers |
| --- | --- |
| No account, no sign-up, nothing to join | access/onboarding complaints (8) |
| Ready when you stop: background sync, "Updated just now" | sync complaints (11), the top one |
| Works with whatever you run with: Apple Health, Strava, GPX/TCX/FIT | "my watch isn't supported" (7) |
| No watermark, ever | watermark (2) |
| One run, shown once, even from two apps | duplicate workouts |
| Help built in | "no support of any kind" (4) |
| 26 stickers, totals for your week, copy any sticker | parity: the price of entry |

## 5. Pricing

Free, with everything in the app today. A paid Plus may come later with
extras. Nothing that's free becomes paid. (`pricing.md`)

## 6. FAQ

- Do I need an account? No.
- Which watches work?
- Can I bring in runs from Garmin, Coros, Wahoo or Strava? Yes: Health,
  Strava, or GPX/TCX/FIT files.
- Is it really free? Yes, and no watermark.
- Where is my data? On your phone.
- Android? Not yet.

## 7. Final call to action

"Your next run is your first story." + the App Store button.

## Proof

None yet, so no proof section. No testimonials, user counts, ratings or press
logos until they're real and used with permission.

## Contrast

The site uses the app's tokens (`replica/design/tokens.css`): all 20 text and
control pairs pass AA (`contrast.py`). Body text #F4F4F5 on #0A0A0B is 18:1;
muted #A1A1AA on #161618 is 7.05:1; teal links on #0A0A0B are 11.9:1; dark
text on the teal button is 11.9:1.
