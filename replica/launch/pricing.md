# Pricing: Mileprint

## What others charge

Read from each app's US App Store page on **2026-11-19**. Prices change, so
check again before launch.

| app | what it is | price | source |
| --- | --- | --- | --- |
| Share Aura (the reference) | run graphics, tracker, social | free; no in-app purchases listed | apps.apple.com/us/app/id6742422198 |
| Run Story | run story graphics | free; **Remove Watermark $0.99**, Remove Ads $0.99 | apps.apple.com/us/app/id6737940528 |
| Run Photo (for Garmin, Strava) | run photo overlays | free; Plus **$9.99/mo**, **$59.99/yr**, $39.99 / 6 mo, Lifetime **$99.99**, token packs $0.99 to $2.99 | apps.apple.com/us/app/id1493366642 |
| Strava | tracking + social | free; Subscription **$11.99/mo**, **$79.99/yr**; Strava + Runna $149.99/yr | apps.apple.com/us/app/id426826309 |

## What reviewers said about price

No price or billing complaints: the reference is free (`feedback.md`, pricing
and billing themes: 0 reviews). Reviewers value that, and two mention it
unprompted:
- "Free. No watermark." (5★, Oct 2025)
- "so cool and has tons of free stuff! … Hope it keeps offering lots of freebies." (5★, Oct 2025)

A forced watermark drew a 1★ ("Forced watermark ruins it", Apr 2026).
Competitors charge to remove watermarks (Run Story) or put most designs behind
$60/yr (Run Photo).

## The model

**Launch free. Everything in the app today stays free, forever, with no
watermark.** That's the positioning ("no account, no feed, no waitlist"), and
it matches a free reference.

Add **Mileprint Plus** only when there's something extra worth paying for,
not by locking today's features. Candidates, in order:
1. Video backgrounds and animated stories (stats that count up).
2. Monthly and yearly recap stories with a combined route map.
3. Template builder: save your own sticker layouts and reuse them.
4. Extra font and sticker packs.

| tier | for | price | what's in it |
| --- | --- | --- | --- |
| **Free** | everyone who runs | $0 | everything in the app today: all sources, all 26 stickers and text, copy stickers, Instagram share, no watermark, no ads |
| **Plus** | people who post every week | **$2.99/month** or **$29.99/year** (2 months free) | the extras above as they ship |
| **Plus for life** | people who hate subscriptions | **$59.99 once** | the same as Plus, forever |

Why this price: well under Run Photo ($59.99/yr) and Strava ($79.99/yr), and
above a $0.99 one-off, so it can fund the work. Annual is 10 × monthly. Lifetime
is 2 × annual.

## Billing done right

No billing complaints to fix in the reviews, so these are guardrails:
- **No paywall on launch, ever.** Plus is mentioned once, in Settings, and on
  Plus features themselves.
- **Restore purchases** button next to the Plus offer.
- **Cancel = Apple's subscription settings,** linked from the Plus screen with
  the exact path. Apple sends renewal notices; we add none of our own nags.
- **No trial that silently converts.** If a trial is added, show the renewal
  date and price on the button.
- **Nothing free becomes paid.** If a feature is free at launch, it stays free.

## Products to create (when Plus ships)

Digital features sold inside an iOS app go through **Apple's In-App Purchase**
(App Store Connect), not Stripe. Create:

| product ID | type | price | group |
| --- | --- | --- | --- |
| `mileprint.plus.monthly` | auto-renewable subscription | $2.99 | Mileprint Plus |
| `mileprint.plus.yearly` | auto-renewable subscription | $29.99 | Mileprint Plus |
| `mileprint.plus.lifetime` | non-consumable | $59.99 | (none) |

In the app, read purchases with a maintained StoreKit library (for example
`expo-iap` or RevenueCat). That's a dev-build change and comes with the first
Plus feature. Nothing to create at launch.
