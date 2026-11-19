import { activityFromGpx, activityFromManual, parseDuration } from '../import';
import { decodePolyline, encodePolyline, haversine, projectToBox, simplify, trimEnds } from '../geo';
import { formatDay, formatDistance, formatDuration, formatElevation, formatPace, defaultTitle } from '../format';
import { GpxError, mapType, parseGpx } from '../gpx';
import { computeSplits, computeStats, elevationGain } from '../stats';
import { northTrack, toGpx } from '../__fixtures__/gpx';

describe('geo', () => {
  it('round-trips the reference polyline from the algorithm spec', () => {
    const pts = [
      { lat: 38.5, lon: -120.2 },
      { lat: 40.7, lon: -120.95 },
      { lat: 43.252, lon: -126.453 },
    ];
    const enc = encodePolyline(pts);
    expect(enc).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(decodePolyline(enc)).toEqual(pts);
  });

  it('measures distance', () => {
    expect(haversine({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111195, -1);
  });

  it('simplifies a straight line to its ends', () => {
    expect(simplify(northTrack(100, 10, 3), 1)).toHaveLength(2);
  });

  it('fits a route inside the box keeping aspect ratio', () => {
    const xy = projectToBox(northTrack(11, 100, 30), 200, 100, 10);
    xy.forEach((p) => {
      expect(p.y).toBeGreaterThanOrEqual(9.99);
      expect(p.y).toBeLessThanOrEqual(90.01);
    });
    expect(xy[0].y).toBeGreaterThan(xy[10].y); // north is up
    expect(xy[0].x).toBeCloseTo(100); // centred
  });

  it('trims the ends of a route for privacy', () => {
    const pts = northTrack(101, 10, 3); // 1 km
    const t = trimEnds(pts, 200);
    expect(haversine(pts[0], t[0])).toBeGreaterThanOrEqual(199);
    expect(trimEnds(pts, 600)).toEqual([]);
  });
});

describe('gpx', () => {
  it('parses points, name, type and heart rate', () => {
    const t = parseGpx(toGpx(northTrack(5, 10, 3)));
    expect(t.points).toHaveLength(5);
    expect(t.name).toBe('Lunch loop & hills');
    expect(t.type).toBe('run');
    expect(t.points[2].hr).toBe(152);
    expect(t.points[0].ele).toBe(1600);
  });

  it('decodes entities outside CDATA only', () => {
    expect(parseGpx(toGpx(northTrack(2, 10, 3), 'Tom &amp; Jerry&#39;s 10K')).name).toBe("Tom & Jerry's 10K");
    expect(parseGpx(toGpx(northTrack(2, 10, 3), '<![CDATA[a &amp; b]]>')).name).toBe('a &amp; b');
  });

  it('handles self-closing points and route points', () => {
    const xml = '<gpx><rte><rtept lat="1" lon="2"/><rtept lat="1.001" lon="2"/></rte></gpx>';
    expect(parseGpx(xml).points).toEqual([
      { lat: 1, lon: 2 },
      { lat: 1.001, lon: 2 },
    ]);
  });

  it('maps exporters\u2019 sport names, including the newer sports', () => {
    expect(mapType('trail_running')).toBe('trail_run');
    expect(mapType('running')).toBe('run');
    expect(mapType('inline_skating')).toBe('skate');
    expect(mapType('cross_country_skiing')).toBe('ski');
    expect(mapType('Snowboarding')).toBe('ski');
    expect(mapType('rowing')).toBe('row');
    expect(mapType('rock_climbing')).toBe('climb');
    expect(mapType('Biking')).toBe('ride');
    expect(mapType('kitesurfing')).toBe('other');
  });

  it('rejects files that are not GPX or have no points', () => {
    expect(() => parseGpx('<tcx></tcx>')).toThrow(GpxError);
    expect(() => parseGpx('<gpx><trk></trk></gpx>')).toThrow('no track points');
  });
});

describe('stats', () => {
  // 10 km straight, 10 m every 3 s => 3.33 m/s, 3000 s
  const pts = northTrack(1001, 10, 3);

  it('computes distance, times and heart rate', () => {
    const s = computeStats(pts);
    expect(s.distanceM).toBeCloseTo(10000, 0);
    expect(s.elapsedTimeS).toBe(3000);
    expect(s.movingTimeS).toBe(3000);
    expect(s.avgHr).toBe(151);
    expect(s.maxHr).toBe(152);
  });

  it('excludes stops from moving time but not elapsed', () => {
    const stopped = [...pts.slice(0, 501)];
    const last = stopped[500];
    for (let i = 1; i <= 100; i++) stopped.push({ ...last, time: last.time! + i * 3000 }); // standing 5 min
    const s = computeStats(stopped);
    expect(s.elapsedTimeS).toBe(1500 + 300);
    expect(s.movingTimeS).toBe(1500);
  });

  it('ignores GPS spikes', () => {
    const spiky = pts.slice(0, 10).map((p) => ({ ...p }));
    spiky[5] = { ...spiky[5], lat: spiky[5].lat + 1 }; // 111 km jump in 3 s
    expect(computeStats(spiky).distanceM).toBeLessThan(100);
  });

  it('counts real climbs, not noise', () => {
    const noisy = pts.slice(0, 200).map((p, i) => ({ ...p, ele: 100 + (i % 2) })); // 1 m jitter
    expect(elevationGain(noisy)).toBe(0);
    const climb = pts.slice(0, 101).map((p, i) => ({ ...p, ele: 100 + i })); // +100 m
    expect(elevationGain(climb)).toBeGreaterThanOrEqual(95);
  });

  it('splits by km with a partial last split', () => {
    const km = computeSplits(northTrack(551, 10, 3), 'km'); // 5.5 km
    expect(km).toHaveLength(6);
    expect(km[0]).toMatchObject({ index: 1, distanceM: 1000, timeS: 300 });
    expect(km[5].distanceM).toBeCloseTo(500, -1);
    const mi = computeSplits(pts, 'mi');
    expect(mi).toHaveLength(7); // 6.21 mi
    expect(mi[0].timeS).toBe(483); // 1609.344 m at 3.333 m/s
  });
});

describe('format', () => {
  it('formats distance, duration, pace and elevation', () => {
    expect(formatDistance(10000, 'mi')).toBe('6.21');
    expect(formatDistance(10000, 'km')).toBe('10.00');
    expect(formatDistance(160934.4, 'mi')).toBe('100.0');
    expect(formatDuration(2890)).toBe('48:10');
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(formatPace(10000, 2890, 'mi')).toBe('7:45');
    expect(formatPace(10000, 2890, 'km')).toBe('4:49');
    expect(formatPace(5, 100, 'km')).toBeNull();
    expect(formatElevation(100, 'mi')).toBe('328');
    expect(formatElevation(null, 'km')).toBeNull();
  });

  it('names activities by local time of day', () => {
    const t = Date.UTC(2026, 10, 17, 13, 0); // 13:00 UTC
    expect(defaultTitle('run', t, 0)).toBe('Afternoon run');
    expect(defaultTitle('ride', t, -420)).toBe('Morning ride'); // 06:00 in Denver
    expect(formatDay({ startedAt: t, utcOffsetMin: -420 }, t)).toBe('Tue, Nov 17');
    expect(formatDay({ startedAt: Date.UTC(2025, 0, 2, 12), utcOffsetMin: 0 }, t)).toBe('Thu, Jan 2, 2025');
  });
});

describe('import', () => {
  it('builds an activity from a GPX file', () => {
    const a = activityFromGpx(toGpx(northTrack(1001, 10, 3)), { fileHash: 'abc', units: 'mi', utcOffsetMin: () => -420 });
    expect(a).toMatchObject({ source: 'gpx', type: 'run', title: 'Lunch loop & hills', fileHash: 'abc', utcOffsetMin: -420 });
    expect(a.distanceM).toBeCloseTo(10000, 0);
    expect(a.movingTimeS).toBe(3000);
    expect(decodePolyline(a.routePolyline!)).toHaveLength(2);
    expect(a.splits.filter((s) => s.unit === 'km')).toHaveLength(10);
  });

  it('defaults the title from the time of day when the file has none', () => {
    const xml = toGpx(northTrack(10, 10, 3)).replace(/<name>.*<\/name>/, '');
    expect(activityFromGpx(xml, { fileHash: 'x', units: 'mi', utcOffsetMin: () => 0 }).title).toBe('Afternoon run');
  });

  it('parses durations', () => {
    expect(parseDuration('48:10')).toBe(2890);
    expect(parseDuration('1:02:03')).toBe(3723);
    expect(parseDuration('48')).toBe(2880);
    expect(parseDuration('4:75')).toBeNull();
    expect(parseDuration('abc')).toBeNull();
  });

  it('validates and converts manual entries', () => {
    const now = Date.UTC(2026, 10, 17, 13);
    const ok = activityFromManual({ type: 'run', startedAt: now, distance: '6.2', duration: '48:10', elevation: '328' }, 'mi');
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.activity.distanceM).toBeCloseTo(9978, 0);
      expect(ok.activity.movingTimeS).toBe(2890);
      expect(ok.activity.elevationGainM).toBeCloseTo(100, 0);
    }
    const bad = activityFromManual({ type: 'run', startedAt: now, distance: 'abc', duration: '4:75' }, 'mi');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['distance', 'duration']);
    const empty = activityFromManual({ type: 'workout', startedAt: now }, 'km');
    expect(empty.ok).toBe(false);
  });
});
