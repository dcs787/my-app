/**
 * @jest-environment node
 */
import { decodePolyline } from '../geo';
import { activityFromFit, activityFromTcx } from '../import';
import { parseTcx } from '../tcx';
import { ImportError } from '../track';
import { toFit, toTcx } from '../__fixtures__/devices';
import { northTrack } from '../__fixtures__/gpx';

const pts = northTrack(301, 10, 3); // 3 km, 900 s

describe('TCX', () => {
  it('uses the lap totals and keeps the route', () => {
    const a = activityFromTcx(toTcx(pts, { distanceM: 3020, timeS: 905, calories: 210 }), { fileHash: 'h', utcOffsetMin: () => 60 });
    expect(a).toMatchObject({ source: 'tcx', type: 'run', distanceM: 3020, movingTimeS: 905, calories: 210, utcOffsetMin: 60 });
    expect(a.avgHr).toBe(151);
    expect(decodePolyline(a.routePolyline!).length).toBeGreaterThanOrEqual(2);
    expect(a.splits.filter((s) => s.unit === 'km')).toHaveLength(3);
  });

  it('imports an indoor session with no positions', () => {
    const a = activityFromTcx(toTcx(pts, { sport: 'Biking', distanceM: 12000, timeS: 1800, positions: false }), { fileHash: 'h' });
    expect(a).toMatchObject({ type: 'ride', distanceM: 12000, movingTimeS: 1800, routePolyline: null, avgHr: 151 });
    expect(a.startedAt).toBe(pts[0].time);
  });

  it('rejects files that are not TCX', () => {
    expect(() => parseTcx('<gpx></gpx>')).toThrow(ImportError);
  });
});

describe('FIT', () => {
  it('reads records, session totals and the local time zone', async () => {
    const bytes = toFit(pts, { sport: 1, distanceM: 3005, timerS: 900, elapsedS: 960, calories: 230, ascentM: 42, utcOffsetMin: -300 });
    const a = await activityFromFit(bytes, { fileHash: 'f' });
    expect(a).toMatchObject({
      source: 'fit',
      type: 'run',
      distanceM: 3005,
      movingTimeS: 900,
      elapsedTimeS: 960,
      calories: 230,
      elevationGainM: 42,
      avgHr: 150,
      utcOffsetMin: -300,
    });
    expect(Math.abs(a.startedAt - pts[0].time!)).toBeLessThan(1000);
    expect(decodePolyline(a.routePolyline!)[0].lat).toBeCloseTo(40, 4);
    expect(a.splits.filter((s) => s.unit === 'km')).toHaveLength(3);
  });

  it('reads a treadmill run and trail sub-sport', async () => {
    const tread = await activityFromFit(
      toFit(pts, { sport: 1, distanceM: 5000, timerS: 1500, elapsedS: 1500, calories: 400, ascentM: 0, utcOffsetMin: 0, positions: false }),
      { fileHash: 'f' },
    );
    expect(tread).toMatchObject({ distanceM: 5000, routePolyline: null, splits: [] });
    const trail = await activityFromFit(
      toFit(pts, { sport: 1, subSport: 3, distanceM: 3000, timerS: 900, elapsedS: 900, calories: 1, ascentM: 1, utcOffsetMin: 0 }),
      { fileHash: 'f' },
    );
    expect(trail.type).toBe('trail_run');
  });

  it('rejects garbage', async () => {
    await expect(activityFromFit(new Uint8Array([1, 2, 3, 4]).buffer, { fileHash: 'x' })).rejects.toThrow(ImportError);
  });
});
