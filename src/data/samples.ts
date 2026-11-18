import { encodePolyline, simplify } from '@/domain/geo';
import { computeSplits, computeStats } from '@/domain/stats';
import type { ActivityType, NewActivity, TrackPoint } from '@/domain/types';

/**
 * Made-up activities for previews and for trying the app without a watch file.
 * Routes are generated loops; no real person's data.
 */
export function sampleActivities(now = Date.now()): NewActivity[] {
  const day = 86_400_000;
  const at = (daysAgo: number, hour: number) => {
    const d = new Date(now - daysAgo * day);
    d.setHours(hour, 10, 0, 0);
    return d.getTime();
  };
  return [
    fromLoop({ title: 'Sunrise loop by the river', type: 'run', start: at(0, 6), km: 10.2, paceS: 290, hills: 18, seed: 1 }),
    fromLoop({ title: 'Hill repeats', type: 'run', start: at(2, 17), km: 8.1, paceS: 318, hills: 60, seed: 2 }),
    fromLoop({ title: 'Saturday long ride out to the reservoir and back', type: 'ride', start: at(4, 8), km: 52.4, paceS: 120, hills: 35, seed: 3 }),
    {
      source: 'manual',
      externalId: null,
      fileHash: null,
      type: 'run',
      title: 'Treadmill intervals',
      locationName: null,
      startedAt: at(5, 12),
      utcOffsetMin: -new Date(at(5, 12)).getTimezoneOffset(),
      distanceM: 6437,
      movingTimeS: 1860,
      elapsedTimeS: 1860,
      elevationGainM: null,
      avgHr: 162,
      maxHr: null,
      calories: 480,
      splits: [],
      routePolyline: null,
    },
  ];
}

function fromLoop(o: {
  title: string;
  type: ActivityType;
  start: number;
  km: number;
  paceS: number; // seconds per km
  hills: number; // metres of rolling amplitude
  seed: number;
}): NewActivity {
  const pts = loop(o);
  const s = computeStats(pts);
  return {
    source: 'gpx',
    externalId: null,
    fileHash: `sample-${o.seed}`,
    type: o.type,
    title: o.title,
    locationName: null,
    startedAt: o.start,
    utcOffsetMin: -new Date(o.start).getTimezoneOffset(),
    distanceM: s.distanceM,
    movingTimeS: s.movingTimeS ?? null,
    elapsedTimeS: s.elapsedTimeS ?? null,
    elevationGainM: s.elevationGainM ?? null,
    avgHr: s.avgHr ?? null,
    maxHr: s.maxHr ?? null,
    calories: null,
    splits: [...computeSplits(pts, 'mi'), ...computeSplits(pts, 'km')],
    routePolyline: encodePolyline(simplify(pts, 5)),
  };
}

/** A wobbly closed loop of roughly `km` length, one point every ~10 m. */
function loop(o: { start: number; km: number; paceS: number; hills: number; seed: number }): TrackPoint[] {
  const n = Math.round((o.km * 1000) / 10);
  const lat0 = 39.7 + o.seed * 0.01;
  const lon0 = -105.0 - o.seed * 0.01;
  const mPerDegLat = 111_195;
  const mPerDegLon = mPerDegLat * Math.cos((lat0 * Math.PI) / 180);
  // unit-size wobbly shape, then scaled so its perimeter is exactly `km`
  const shape = Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * 2 * Math.PI;
    const r = 1 + 0.25 * Math.sin(3 * t + o.seed) + 0.1 * Math.sin(7 * t);
    return { t, x: r * Math.cos(t) * (1.3 + 0.2 * o.seed), y: r * Math.sin(t) };
  });
  let perimeter = 0;
  for (let i = 1; i < shape.length; i++) perimeter += Math.hypot(shape[i].x - shape[i - 1].x, shape[i].y - shape[i - 1].y);
  const k = (o.km * 1000) / perimeter;
  const pts: TrackPoint[] = shape.map(({ t, x, y }) => ({
    lat: lat0 + (y * k) / mPerDegLat,
    lon: lon0 + (x * k) / mPerDegLon,
    ele: 1600 + o.hills * Math.sin(4 * t) + o.hills * 0.3 * Math.sin(11 * t),
    time: o.start,
    hr: Math.round(145 + 15 * Math.sin(2 * t) + o.seed),
  }));
  // time from distance so pace is realistic
  let tMs = o.start;
  for (let i = 1; i < pts.length; i++) {
    const dx = (pts[i].lon - pts[i - 1].lon) * mPerDegLon;
    const dy = (pts[i].lat - pts[i - 1].lat) * mPerDegLat;
    tMs += (Math.hypot(dx, dy) / 1000) * o.paceS * 1000;
    pts[i].time = Math.round(tMs);
  }
  return pts;
}
