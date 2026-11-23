# Setup: accounts and keys

The app runs in **Expo Go** with no accounts at all: files, manual entry, the
editor, Save and Share all work there. Apple Health, Strava and direct
Instagram sharing each need one more thing. Do them in this order.

Commands run in the project folder on your computer. `npx eas-cli@latest`
runs Expo's build tool without installing it.

---

## 1. Expo account (free)

Sign up at expo.dev, then log in from the project folder:

```bash
npx eas-cli@latest login
```

Link the project to your account (creates it on expo.dev):

```bash
npx eas-cli@latest init
```

## 2. Apple Developer Program ($99/year) and your app's ID

Needed for Apple Health and for installing your own build on your iPhone.

1. Enrol at developer.apple.com/programs.
2. In `app.json`, change `ios.bundleIdentifier` from `com.example.mileprint` to
   your own reverse-domain ID, e.g. `com.yourname.storyapp`. It can't be
   changed after the app is on the App Store.

Register your iPhone so it can install development builds (open the link it
prints on the phone):

```bash
npx eas-cli@latest device:create
```

Build the development app in Expo's cloud (no Mac needed; about 15 minutes):

```bash
npx eas-cli@latest build --profile development --platform ios
```

Install it from the link the build prints, then run the dev server and open
the app on your phone:

```bash
npm start
```

Apple Health now works: Settings → Connections → Connect Apple Health.

## 3. Strava API application (free)

1. Go to strava.com/settings/api and create an application.
   - **Category:** Visualizer
   - **Website:** any page about the app (can be a placeholder for now)
   - **Authorization Callback Domain:** `localhost`
2. Note the **Client ID** (public) and **Client Secret** (private: it goes
   only into the token function below, never into the app).
3. New Strava apps can connect **one athlete** (you). When it works, request
   more capacity from the same page before inviting testers.

Read Strava's API agreement (strava.com/legal/api) before launch. In short:
show a person's Strava data only to that person, don't call the app
anything with "Strava" in it, use "Compatible with Strava" when you mention
it, and delete Strava data when someone disconnects (the app already does).

## 4. Supabase project for the token function (free tier)

Strava's sign-in needs the Client Secret, which can't ship in the app. One
small function holds it. It stores nothing.

1. Create a project at supabase.com and note its **project ref** (in the URL).
2. Install the Supabase CLI (supabase.com/docs/guides/cli), then:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

```bash
npx supabase secrets set STRAVA_CLIENT_ID=YOUR_CLIENT_ID STRAVA_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

The app calls the function without a Supabase login, so deploy it without
JWT checks:

```bash
npx supabase functions deploy strava-token --no-verify-jwt
```

Its URL is `https://YOUR_PROJECT_REF.supabase.co/functions/v1/strava-token`.

## 5. Meta app ID for Instagram Stories (free)

1. Create an app at developers.facebook.com (type: "Other" → "Consumer").
2. Copy its **App ID**. Instagram uses it to show which app the story came
   from. No review is needed for sharing to Stories.

## 6. Put the keys in the app

For cloud builds, store them in Expo (once per environment you build):

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_STRAVA_CLIENT_ID --value YOUR_CLIENT_ID --environment development --visibility plaintext
```

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_STRAVA_TOKEN_URL --value https://YOUR_PROJECT_REF.supabase.co/functions/v1/strava-token --environment development --visibility plaintext
```

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_META_APP_ID --value YOUR_META_APP_ID --environment development --visibility plaintext
```

Optionally, set where "Email us" in Help sends feedback (the button is hidden
without it):

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPPORT_EMAIL --value YOUR_SUPPORT_EMAIL --environment development --visibility plaintext
```

Repeat with `--environment preview` and `--environment production` when you
make those builds. For local development, copy `.env.example` to
`.env.local` and fill in the same three values.

These three values are not secrets (anyone can read them out of an app). The
Strava Client Secret is the only secret, and it lives only in Supabase.

Then rebuild the development app (step 2) so it picks up the new values and
the Instagram URL scheme.

## 7. Check it on your iPhone

- [ ] Settings → Connect Apple Health → allow → your Watch runs appear
- [ ] Settings → Connect to Strava → sign in → activities appear; the same run
      from both shows once, with Strava's name
- [ ] Pull down on the activity list → "Up to date"
- [ ] Open a run → add a photo → Instagram → the story opens in Instagram
- [ ] Save → the image is in Photos
- [ ] Settings → Disconnect Strava → its activities are removed
- [ ] Close the app, record a Watch workout, wait a few minutes, open the app:
      the workout is already there (background sync)
- [ ] Copy stickers → tap one → paste it onto a photo in an Instagram story
- [ ] Open a Strava run you pressed the lap button on → after a second or two
      the Laps tab appears, and Splits says "Splits from Strava"
- [ ] On Apple Watch, start a run and double-tap the screen to mark a few
      segments → in Mileprint the run shows them as laps. (Not tested on a
      device yet: if they don't appear, tell me what the Health app shows
      under the workout.)
- [ ] Import a FIT file from a Garmin with auto-laps → Laps (n) matches the watch
- [ ] Editor speed: on the oldest iPhone you can borrow, add 15 or more
      stickers, then drag, pinch and twist one. It should follow your finger
      without stutter, and nothing jumps when you let go.

## Later: App Store

```bash
npx eas-cli@latest build --profile production --platform ios
```

```bash
npx eas-cli@latest submit --platform ios
```

Apple asks for a privacy policy URL and a description of how Health data is
used (read-only, stays on the phone, never used for ads). `/replica-launch`
writes the listing.
