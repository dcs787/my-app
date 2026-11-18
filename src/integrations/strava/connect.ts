import { AuthRequest, makeRedirectUri, ResponseType } from 'expo-auth-session';
import { maybeCompleteAuthSession } from 'expo-web-browser';

import { callTokenServer } from './client';
import { STRAVA, stravaConfigured } from './config';
import type { StravaTokens } from './types';

maybeCompleteAuthSession();

/**
 * Redirect back into the app after Strava sign-in. Its host is "localhost",
 * so the Strava app's Authorization Callback Domain is simply `localhost`.
 */
export const stravaRedirectUri = () => makeRedirectUri({ scheme: 'myapp', path: 'localhost/strava' });

export class StravaCancelled extends Error {}

/** Open Strava's sign-in, then swap the code for tokens through the token function. */
export async function signInWithStrava(): Promise<StravaTokens> {
  if (!stravaConfigured()) throw new Error('Strava isn’t set up in this build yet.');
  const request = new AuthRequest({
    clientId: STRAVA.clientId,
    redirectUri: stravaRedirectUri(),
    responseType: ResponseType.Code,
    scopes: [STRAVA.scope],
    usePKCE: false, // Strava's code exchange uses the client secret, held by the token function
    extraParams: { approval_prompt: 'auto' },
  });
  const result = await request.promptAsync({ authorizationEndpoint: STRAVA.authorizeUrl });
  if (result.type !== 'success') throw new StravaCancelled('Sign-in was cancelled.');
  if (result.params.error) throw new Error('Strava access wasn’t granted.');
  const granted = (result.params.scope ?? '').split(/[ ,]/);
  if (!granted.includes('activity:read_all') && !granted.includes('activity:read')) {
    throw new Error('To sync, allow access to your activities when Strava asks.');
  }
  return callTokenServer({ grant: 'code', code: result.params.code });
}
