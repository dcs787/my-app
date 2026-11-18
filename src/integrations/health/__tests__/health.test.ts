import { createMemoryStore } from '@/data/memoryStore';
import { DEFAULT_SETTINGS } from '@/data/store';
import { decodePolyline } from '@/domain/geo';
import { northTrack } from '@/domain/__fixtures__/gpx';
import { syncHealthNow } from '@/features/sources';

import { mapHealthWorkout, offsetForZone, type HealthWorkout } from '../map';

const start = new Date(Date.UTC(2026, 6, 4, 13, 0)); // July: daylight saving time in Denver
const run = (over: Partial<HealthWorkout> = {}): HealthWorkout => ({
  uuid: 'hk-1',
  activityType: 37,
  start,
  end: new Date(start.getTime() + 2700_000),
  durationS: 2580,
  distanceM: 8050,
  energyKcal: 612.4,
  timeZone: 'America/Denver',
  elevationGainM: 88,
  avgHr: 154.4,
  maxHr: 181,
  route: northTrack(301, 10, 3, start.getTime()).map((p) => ({ latitude: p.lat, longitude: p.lon, altitude: p.ele, date: new Date(p.time!) })),
  ...over,
});

describe('Apple Health mapping', () => {
  it('maps a Watch run with route, heart rate and its own time zone', () => {
    const a = mapHealthWorkout(run());
    expect(a).toMatchObject({
      source: 'apple_health',
      externalId: 'hk-1',
      type: 'run',
      distanceM: 8050,
      movingTimeS: 2580,
      elapsedTimeS: 2700,
      calories: 612,
      elevationGainM: 88,
      avgHr: 154,
      maxHr: 181,
      utcOffsetMin: -360,
      title: 'Morning run', // 07:00 in Denver
    });
    expect(decodePolyline(a.routePolyline!).length).toBeGreaterThanOrEqual(2);
    expect(a.splits.filter((s) => s.unit === 'km')).toHaveLength(3);
  });

  it('maps indoor and non-distance workouts', () => {
    const tread = mapHealthWorkout(run({ route: [], indoor: true }));
    expect(tread).toMatchObject({ routePolyline: null, distanceM: 8050, splits: [] });
    const yoga = mapHealthWorkout(run({ activityType: 57, distanceM: undefined, route: [] }));
    expect(yoga).toMatchObject({ type: 'workout', distanceM: null });
    expect(mapHealthWorkout(run({ activityType: 9999 })).type).toBe('other');
  });

  it('works out time zone offsets, including half hours and unknown zones', () => {
    expect(offsetForZone('America/Denver', Date.UTC(2026, 0, 15))).toBe(-420);
    expect(offsetForZone('Asia/Kolkata', Date.UTC(2026, 0, 15))).toBe(330);
    expect(offsetForZone('Not/AZone', Date.UTC(2026, 0, 15))).toBeUndefined();
  });
});

describe('Apple Health sync', () => {
  it('imports, keeps the anchor, removes deleted workouts and merges with Strava', async () => {
    let n = 0;
    const store = createMemoryStore(() => `a${++n}`);
    const calls: (string | null)[] = [];
    const first = async (anchor: string | null) => {
      calls.push(anchor);
      return { workouts: [run(), run({ uuid: 'hk-2', start: new Date(start.getTime() + 86_400_000), end: new Date(start.getTime() + 86_400_000 + 1800_000) })], deletedIds: [], anchor: 'A1' };
    };
    expect(await syncHealthNow(store, DEFAULT_SETTINGS, first)).toEqual({ added: 2, merged: 0 });
    let settings = await store.getSettings();
    expect(settings.healthAnchor).toBe('A1');

    const second = async (anchor: string | null) => {
      calls.push(anchor);
      return { workouts: [], deletedIds: ['hk-2'], anchor: 'A2' };
    };
    await syncHealthNow(store, settings, second);
    expect(calls).toEqual([null, 'A1']);
    expect((await store.listActivities()).map((a) => a.externalId)).toEqual(['hk-1']);

    // the same run arrives from Strava with its real name: one activity, renamed
    const r = await store.insertActivity({ ...mapHealthWorkout(run()), source: 'strava', externalId: '555', title: 'Fourth of July 5 miler' });
    expect(r.merged).toBe(true);
    settings = await store.getSettings();
    expect(settings.healthAnchor).toBe('A2');
    expect((await store.listActivities())[0].title).toBe('Fourth of July 5 miler');
  });
});
