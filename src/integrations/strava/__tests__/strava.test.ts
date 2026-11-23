/**
 * @jest-environment node
 */
import { createMemoryStore } from '@/data/memoryStore';
import { decodePolyline } from '@/domain/geo';

import { handle } from '../../../../supabase/functions/strava-token/handler';
import { fetchStravaDetails, syncStrava, validToken, deauthorize, StravaAuthError, StravaRateLimitError, type TokenStore } from '../client';
import { STRAVA } from '../config';
import { mapStravaActivity, mapStravaDetails } from '../map';
import type { StravaActivity, StravaTokens } from '../types';

const act = (id: number, over: Partial<StravaActivity> = {}): StravaActivity => ({
  id,
  name: `Run ${id}`,
  distance: 8046.7,
  moving_time: 2400,
  elapsed_time: 2520,
  total_elevation_gain: 61.2,
  sport_type: 'Run',
  start_date: new Date(Date.UTC(2026, 10, 1) + id * 86_400_000).toISOString(),
  start_date_local: new Date(Date.UTC(2026, 10, 1) + id * 86_400_000 - 7 * 3_600_000).toISOString(),
  map: { summary_polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
  average_heartrate: 151.6,
  max_heartrate: 178,
  ...over,
});

const memTokens = (t: StravaTokens | null): TokenStore & { value: () => StravaTokens | null } => {
  let v = t;
  return { get: async () => v, set: async (x) => void (v = x), clear: async () => void (v = null), value: () => v };
};
const fresh = (): StravaTokens => ({ accessToken: 'AT', refreshToken: 'RT', expiresAt: Date.now() / 1000 + 3600, athleteId: 7, athleteName: 'Sam' });
const jsonRes = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('mapping', () => {
  it('maps a Strava run, keeping its local time zone and route', () => {
    const a = mapStravaActivity(act(3));
    expect(a).toMatchObject({
      source: 'strava',
      externalId: '3',
      type: 'run',
      title: 'Run 3',
      distanceM: 8046.7,
      movingTimeS: 2400,
      elapsedTimeS: 2520,
      elevationGainM: 61.2,
      avgHr: 152,
      maxHr: 178,
      utcOffsetMin: -420,
    });
    expect(decodePolyline(a.routePolyline!)).toHaveLength(3);
  });

  it('maps sport types and handles indoor activities without a map', () => {
    expect(mapStravaActivity(act(1, { sport_type: 'TrailRun' })).type).toBe('trail_run');
    expect(mapStravaActivity(act(1, { sport_type: 'GravelRide', kilojoules: 812.4 }))).toMatchObject({ type: 'ride', calories: 812 });
    expect(mapStravaActivity(act(1, { sport_type: 'Kitesurf' })).type).toBe('other');
    expect(['AlpineSki', 'InlineSkate', 'Rowing', 'RockClimbing', 'Yoga', 'Elliptical'].map((t) => mapStravaActivity(act(1, { sport_type: t })).type)).toEqual(['ski', 'skate', 'row', 'climb', 'yoga', 'elliptical']);
    const indoor = mapStravaActivity(act(1, { trainer: true, map: { summary_polyline: '' }, distance: 0 }));
    expect(indoor).toMatchObject({ routePolyline: null, distanceM: null });
  });
});

describe('sync', () => {
  const realUrl = STRAVA.tokenUrl;
  beforeAll(() => {
    STRAVA.tokenUrl = 'https://example.test/strava-token';
  });
  afterAll(() => {
    STRAVA.tokenUrl = realUrl;
  });

  it('pages through activities, saves them, and is idempotent', async () => {
    let n = 0;
    const store = createMemoryStore(() => `a${++n}`);
    const tokens = memTokens(fresh());
    const all = Array.from({ length: 130 }, (_, i) => act(i + 1, { start_date: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString() }));
    const calls: string[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      calls.push(url);
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer AT');
      const page = Number(new URL(url).searchParams.get('page'));
      return jsonRes(200, all.slice((page - 1) * 100, page * 100));
    }) as typeof fetch;

    const r1 = await syncStrava(store, tokens, 1_700_000_000, f);
    expect(r1).toMatchObject({ added: 130, merged: 0, skipped: 0 });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('after=1700000000&page=1&per_page=100');
    const r2 = await syncStrava(store, tokens, 1_700_000_000, f);
    expect(r2).toMatchObject({ added: 0, skipped: 130 });
    expect(await store.listActivities()).toHaveLength(130);
  });

  it('refreshes an expiring token through the token function and keeps the athlete', async () => {
    const tokens = memTokens({ ...fresh(), expiresAt: Date.now() / 1000 + 60 });
    const f = (async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://example.test/strava-token');
      expect(JSON.parse(String(init?.body))).toEqual({ grant: 'refresh', refresh_token: 'RT' });
      return jsonRes(200, { access_token: 'AT2', refresh_token: 'RT2', expires_at: 9_999_999_999 });
    }) as typeof fetch;
    const t = await validToken(tokens, f);
    expect(t).toMatchObject({ accessToken: 'AT2', refreshToken: 'RT2', athleteName: 'Sam', athleteId: 7 });
    expect(tokens.value()?.accessToken).toBe('AT2');
  });

  it('reports rate limits and revoked access', async () => {
    const store = createMemoryStore(() => 'x');
    await expect(syncStrava(store, memTokens(fresh()), 0, (async () => jsonRes(429, {})) as typeof fetch)).rejects.toThrow(StravaRateLimitError);
    // 401 on the API -> one forced refresh -> still 401 -> give up
    const f = (async (url: string) =>
      url.includes('example.test') ? jsonRes(200, { access_token: 'AT3', refresh_token: 'RT3', expires_at: 9_999_999_999 }) : jsonRes(401, {})) as typeof fetch;
    await expect(syncStrava(store, memTokens(fresh()), 0, f)).rejects.toThrow(StravaAuthError);
    await expect(validToken(memTokens(null))).rejects.toThrow(StravaAuthError);
  });

  it('deauthorizes and forgets the tokens, even offline', async () => {
    const tokens = memTokens(fresh());
    await deauthorize(tokens, (async () => {
      throw new Error('offline');
    }) as typeof fetch);
    expect(tokens.value()).toBeNull();
  });
});

describe('token function', () => {
  const env = { STRAVA_CLIENT_ID: '123', STRAVA_CLIENT_SECRET: 'shh' };
  const post = (body: unknown) => new Request('https://fn.test', { method: 'POST', body: JSON.stringify(body) });

  it('exchanges a code with the secret and passes back only what the app needs', async () => {
    let sent: URLSearchParams | null = null;
    const f = (async (_url: string, init?: RequestInit) => {
      sent = init?.body as URLSearchParams;
      return jsonRes(200, { access_token: 'a', refresh_token: 'r', expires_at: 1, athlete: { id: 9, firstname: 'Sam', lastname: 'R', city: 'Boulder' }, token_type: 'Bearer' });
    }) as typeof fetch;
    const res = await handle(post({ grant: 'code', code: 'abcdef123456' }), env, f);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: 'a', refresh_token: 'r', expires_at: 1, athlete: { id: 9, firstname: 'Sam', lastname: 'R' } });
    expect(Object.fromEntries(sent!)).toEqual({ client_id: '123', client_secret: 'shh', grant_type: 'authorization_code', code: 'abcdef123456' });
  });

  it('rejects bad requests and reports Strava refusals', async () => {
    const never = (async () => {
      throw new Error('should not call Strava');
    }) as typeof fetch;
    expect((await handle(new Request('https://fn.test'), env, never)).status).toBe(405);
    expect((await handle(post({ grant: 'code', code: 'x' }), env, never)).status).toBe(400);
    expect((await handle(post({ grant: 'steal' }), env, never)).status).toBe(400);
    expect((await handle(post({ grant: 'code', code: 'abcdef123456' }), {}, never)).status).toBe(500);
    const refused = (async () => jsonRes(400, { message: 'Bad Request' })) as typeof fetch;
    expect((await handle(post({ grant: 'refresh', refresh_token: 'abcdef123456' }), env, refused)).status).toBe(401);
  });
});

describe('activity details', () => {
  const detail = {
    ...act(9),
    laps: [
      { lap_index: 1, distance: 1609.3, elapsed_time: 470, moving_time: 465, average_heartrate: 148.6, total_elevation_gain: 4 },
      { lap_index: 2, distance: 1609.3, elapsed_time: 455, moving_time: 455, average_heartrate: 155.2, total_elevation_gain: 12 },
      { lap_index: 3, distance: 0, elapsed_time: 0 }, // an accidental double press
    ],
    splits_metric: [
      { distance: 1000, elapsed_time: 290, moving_time: 288, elevation_difference: 2.1, split: 1 },
      { distance: 1000, elapsed_time: 285, moving_time: 285, elevation_difference: -1, split: 2 },
    ],
    splits_standard: [{ distance: 1609.3, elapsed_time: 465, moving_time: 462, elevation_difference: 1, split: 1 }],
  };

  it('maps laps and Strava splits, dropping empty laps', () => {
    const d = mapStravaDetails(detail);
    expect(d.laps).toEqual([
      { index: 1, distanceM: 1609.3, timeS: 465, avgHr: 149, climbM: 4 },
      { index: 2, distanceM: 1609.3, timeS: 455, avgHr: 155, climbM: 12 },
    ]);
    expect(d.splits.filter((s) => s.unit === 'km').map((s) => s.timeS)).toEqual([288, 285]);
    expect(d.splits.find((s) => s.unit === 'mi')).toMatchObject({ index: 1, distanceM: 1609.3, timeS: 462, elevationDeltaM: 1 });
  });

  it('fetches one activity on demand and saves its laps, splits and when', async () => {
    const store = createMemoryStore(() => 'x', () => 1);
    const { activity } = await store.insertActivity(mapStravaActivity(act(9)));
    const urls: string[] = [];
    const f = (async (url: string) => {
      urls.push(url);
      return jsonRes(200, detail);
    }) as typeof fetch;
    expect(await fetchStravaDetails(store, memTokens(fresh()), activity, f, () => 1234)).toBe('saved');
    expect(urls).toEqual([`${STRAVA.apiBase}/activities/9?include_all_efforts=false`]);
    const saved = await store.getActivity(activity.id);
    expect(saved).toMatchObject({ detailsAt: 1234 });
    expect(saved!.laps).toHaveLength(2);
    expect(saved!.splits.length).toBe(3);
  });

  it('marks an activity Strava no longer has, and reports limits', async () => {
    const store = createMemoryStore(() => 'x', () => 1);
    const { activity } = await store.insertActivity(mapStravaActivity(act(9)));
    await fetchStravaDetails(store, memTokens(fresh()), activity, (async () => jsonRes(404, {})) as typeof fetch, () => 55);
    expect(await store.getActivity(activity.id)).toMatchObject({ detailsAt: 55, laps: [] });
    await expect(fetchStravaDetails(store, memTokens(fresh()), activity, (async () => jsonRes(429, {})) as typeof fetch)).rejects.toThrow(StravaRateLimitError);
  });
});
