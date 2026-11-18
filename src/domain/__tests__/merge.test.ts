import { isSameWorkout } from '../merge';

const base = { type: 'run' as const, startedAt: 1_000_000, distanceM: 5000, source: 'apple_health' as const };

it('matches recordings of one workout and nothing else', () => {
  expect(isSameWorkout(base, { ...base, source: 'strava', startedAt: base.startedAt + 90_000, distanceM: 5120 })).toBe(true);
  expect(isSameWorkout(base, { ...base, source: 'strava', type: 'trail_run' })).toBe(true); // same family
  expect(isSameWorkout(base, { ...base, source: 'strava', type: 'ride' })).toBe(false);
  expect(isSameWorkout(base, { ...base, source: 'strava', startedAt: base.startedAt + 121_000 })).toBe(false);
  expect(isSameWorkout(base, { ...base, source: 'strava', distanceM: 5200 })).toBe(false); // 3.8% off
  expect(isSameWorkout(base, { ...base })).toBe(false); // same source is never "merged"
  expect(isSameWorkout({ ...base, type: 'workout', distanceM: null }, { ...base, type: 'workout', distanceM: null, source: 'strava' })).toBe(true);
  expect(isSameWorkout({ ...base, distanceM: null }, { ...base, source: 'strava' })).toBe(false);
});
