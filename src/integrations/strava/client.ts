import type { Store } from '@/data/store';

import { STRAVA } from './config';
import type { Activity } from '@/domain/types';

import { mapStravaActivity, mapStravaDetails } from './map';
import type { StravaActivity, StravaDetailedActivity, StravaTokens } from './types';

export type TokenStore = {
  get(): Promise<StravaTokens | null>;
  set(t: StravaTokens): Promise<void>;
  clear(): Promise<void>;
};

export class StravaAuthError extends Error {}
export class StravaRateLimitError extends Error {}

type Fetch = typeof fetch;

/** Calls the token function (it holds the client secret). */
export async function callTokenServer(
  body: { grant: 'code'; code: string } | { grant: 'refresh'; refresh_token: string },
  f: Fetch = fetch,
): Promise<StravaTokens> {
  const res = await f(STRAVA.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 400 || res.status === 401) throw new StravaAuthError('Strava didn’t accept the sign-in. Connect again.');
  if (!res.ok) throw new Error(`Token server error ${res.status}`);
  const j = await res.json();
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: j.expires_at,
    athleteId: j.athlete?.id ?? 0,
    athleteName: [j.athlete?.firstname, j.athlete?.lastname].filter(Boolean).join(' ') || 'Strava athlete',
  };
}

/** A token good for at least 10 more minutes, refreshing (and saving) it if needed. */
export async function validToken(tokens: TokenStore, f: Fetch = fetch, nowS = () => Date.now() / 1000): Promise<StravaTokens> {
  const t = await tokens.get();
  if (!t) throw new StravaAuthError('Not connected to Strava.');
  if (t.expiresAt - nowS() > 600) return t;
  const fresh = await callTokenServer({ grant: 'refresh', refresh_token: t.refreshToken }, f);
  const next = { ...t, ...fresh, athleteId: t.athleteId, athleteName: t.athleteName };
  await tokens.set(next);
  return next;
}

export type SyncResult = { added: number; merged: number; skipped: number; newestStart: number | null };

/**
 * Fetch activities since `after` (seconds) page by page and save them.
 * Stops on a short page. A 429 stops the sync with what was saved so far.
 */
export async function syncStrava(
  store: Store,
  tokens: TokenStore,
  afterS: number,
  f: Fetch = fetch,
): Promise<SyncResult> {
  const result: SyncResult = { added: 0, merged: 0, skipped: 0, newestStart: null };
  let page = 1;
  let refreshed = false;
  for (;;) {
    const t = await validToken(tokens, f);
    const url = `${STRAVA.apiBase}/athlete/activities?after=${Math.floor(afterS)}&page=${page}&per_page=${STRAVA.perPage}`;
    const res = await f(url, { headers: { Authorization: `Bearer ${t.accessToken}` } });
    if (res.status === 401 && !refreshed) {
      // token revoked or clock skew: force one refresh, then give up
      await tokens.set({ ...t, expiresAt: 0 });
      refreshed = true;
      continue;
    }
    if (res.status === 401) throw new StravaAuthError('Strava access was removed. Connect again.');
    if (res.status === 429) throw new StravaRateLimitError('Strava is busy. Try again in 15 minutes.');
    if (!res.ok) throw new Error(`Strava error ${res.status}`);
    const list = (await res.json()) as StravaActivity[];
    for (const s of list) {
      const r = await store.insertActivity(mapStravaActivity(s));
      if (r.merged) result.merged++;
      else if (r.duplicate) result.skipped++;
      else result.added++;
      const start = Date.parse(s.start_date);
      if (!Number.isNaN(start)) result.newestStart = Math.max(result.newestStart ?? 0, start);
    }
    if (list.length < STRAVA.perPage) return result;
    page++;
  }
}

/**
 * Fetch one activity's laps and splits (one API call) and save them. Called
 * when a Strava activity is opened, not during sync, so a big first sync
 * doesn't spend the rate limit on activities nobody looks at. Marks the
 * activity as fetched even when Strava no longer has it, so it isn't asked
 * again.
 */
export async function fetchStravaDetails(
  store: Store,
  tokens: TokenStore,
  activity: Pick<Activity, 'id' | 'source' | 'externalId' | 'splits'>,
  f: Fetch = fetch,
  now: () => number = Date.now,
): Promise<'saved' | 'gone'> {
  if (activity.source !== 'strava' || !activity.externalId) throw new Error('Not a Strava activity');
  let refreshed = false;
  for (;;) {
    const t = await validToken(tokens, f);
    const res = await f(`${STRAVA.apiBase}/activities/${encodeURIComponent(activity.externalId)}?include_all_efforts=false`, {
      headers: { Authorization: `Bearer ${t.accessToken}` },
    });
    if (res.status === 401 && !refreshed) {
      await tokens.set({ ...t, expiresAt: 0 });
      refreshed = true;
      continue;
    }
    if (res.status === 401) throw new StravaAuthError('Strava access was removed. Connect again.');
    if (res.status === 429) throw new StravaRateLimitError('Strava is busy. Try again in 15 minutes.');
    if (res.status === 404) {
      await store.updateActivity(activity.id, { detailsAt: now() });
      return 'gone';
    }
    if (!res.ok) throw new Error(`Strava error ${res.status}`);
    const { laps, splits, deviceName } = mapStravaDetails((await res.json()) as StravaDetailedActivity);
    await store.updateActivity(activity.id, { laps, ...(splits.length ? { splits } : {}), deviceName, detailsAt: now() });
    return 'saved';
  }
}

/** Revoke our access on Strava's side. Best effort: the local data is removed either way. */
export async function deauthorize(tokens: TokenStore, f: Fetch = fetch): Promise<void> {
  const t = await tokens.get();
  if (t) {
    try {
      await f(STRAVA.deauthorizeUrl, { method: 'POST', headers: { Authorization: `Bearer ${t.accessToken}` } });
    } catch {
      // offline: the token expires within 6 hours anyway
    }
  }
  await tokens.clear();
}
