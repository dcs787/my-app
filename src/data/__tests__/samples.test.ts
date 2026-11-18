import { decodePolyline } from '@/domain/geo';

import { sampleActivities } from '../samples';

it('generates realistic sample activities', () => {
  const s = sampleActivities(Date.UTC(2026, 10, 18, 12));
  expect(s).toHaveLength(4);
  const [run, , ride, treadmill] = s;
  expect(run.distanceM! / 1000).toBeGreaterThan(9);
  expect(run.distanceM! / 1000).toBeLessThan(12);
  expect(run.movingTimeS! / (run.distanceM! / 1000)).toBeCloseTo(290, -1); // ~4:50 /km
  expect(decodePolyline(run.routePolyline!).length).toBeGreaterThan(20);
  expect(run.splits.some((x) => x.unit === 'mi')).toBe(true);
  expect(ride.type).toBe('ride');
  expect(treadmill.routePolyline).toBeNull();
});
