/**
 * Strava settings, from environment variables baked in at build time
 * (see SETUP.md). The client id is public; the client secret never ships in
 * the app, it lives only in the token function.
 */
export const STRAVA = {
  clientId: process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? '',
  /** URL of the deployed supabase/functions/strava-token function */
  tokenUrl: process.env.EXPO_PUBLIC_STRAVA_TOKEN_URL ?? '',
  authorizeUrl: 'https://www.strava.com/oauth/mobile/authorize',
  apiBase: 'https://www.strava.com/api/v3',
  deauthorizeUrl: 'https://www.strava.com/oauth/deauthorize',
  /** read all activities, including private ones (they're the user's own) */
  scope: 'activity:read_all',
  /** first sync looks back this far */
  backfillDays: 90,
  perPage: 100,
};

export const stravaConfigured = () => Boolean(STRAVA.clientId && STRAVA.tokenUrl);
