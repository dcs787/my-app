# my-app

Turn your runs and rides into story-ready graphics. Sync from Apple Health or
Strava (or open a GPX/TCX/FIT file), drop stat templates onto a photo, and share
straight to Instagram Stories.

Working name until branding. Native iPhone app built with Expo (React Native).

## Run it

You need Node 20+ and the free **Expo Go** app on your iPhone.

```bash
npm install
```

```bash
npm start
```

Scan the QR code with your iPhone camera to open the app in Expo Go.

Apple Health, Strava and direct Instagram sharing need a development build
and a few free or paid accounts: see **[SETUP.md](SETUP.md)**.

No workout file handy? Settings -> Add sample activities.

To preview in a browser (the editor runs on Skia's WebAssembly build there):

```bash
npm run web
```

Other commands:

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run tokens
```

`npm run tokens` regenerates `src/theme/tokens.ts` after you edit
`replica/design/tokens.json`. Check contrast after any colour change:

```bash
python3 .claude/skills/replica-design/contrast.py replica/design/tokens.json
```

## Layout

```
src/app/          screens (expo-router; every file is a route)
src/ui/           design-system components (Button, Sheet, TemplateTile, ...)
src/domain/       activity model, GPX parsing, stats, formatting (no React)
src/data/         storage: SQLite on device, memory on web and in tests
src/editor/       story editor: templates, Skia scene, export, Instagram share
src/integrations/ Apple Health and Strava
src/features/     import and sync flows used by screens
supabase/         the Strava token function (the only server code)
src/theme/        generated tokens + helpers
replica/          planning: recon, architecture, schema, design specs
.claude/skills/   the replica-* skill pack (MIT, Jake Schincariol)
```

In development, Settings -> Design system opens a gallery of every component.

## Plan

See `replica/architecture.md` for the stack and build order, and
`replica/features.csv` for the feature checklist.
