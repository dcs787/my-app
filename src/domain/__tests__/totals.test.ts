import type { Activity } from '../types';
import { computeTotals, countLabel, periodBounds } from '../totals';

const act = (iso: string, over: Partial<Activity> = {}): Activity => ({
  id: iso,
  source: 'manual',
  type: 'run',
  title: 'x',
  startedAt: Date.parse(iso),
  utcOffsetMin: -420, // Denver
  distanceM: 5000,
  movingTimeS: 1500,
  elevationGainM: 30,
  splits: [],
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

it('finds Monday-based weeks, months and years', () => {
  const wed = new Date(Date.UTC(2026, 10, 18, 9)); // Wed Nov 18 2026
  expect(new Date(periodBounds('week', wed).start).toISOString()).toBe('2026-11-16T00:00:00.000Z');
  const sun = new Date(Date.UTC(2026, 10, 22, 23));
  expect(periodBounds('week', sun).start).toBe(periodBounds('week', wed).start);
  expect(new Date(periodBounds('month', wed).end).toISOString()).toBe('2026-12-01T00:00:00.000Z');
});

it('sums the same sport in the same week, by local date', () => {
  const runs = [
    act('2026-11-16T14:00:00Z'), // Mon 07:00 local
    act('2026-11-18T13:00:00Z'), // Wed
    act('2026-11-23T05:30:00Z'), // Sun 22:30 local: still this week, though Monday in UTC
    act('2026-11-23T14:00:00Z'), // next Monday
    act('2026-11-17T14:00:00Z', { type: 'ride', distanceM: 40000 }), // different sport
    act('2026-11-19T14:00:00Z', { type: 'trail_run', distanceM: 8000 }), // same family
  ];
  const wk = computeTotals(runs, runs[1], 'week', Date.parse('2026-11-20T12:00:00Z'));
  expect(wk).toMatchObject({ count: 4, distanceM: 23000, movingTimeS: 6000, elevationGainM: 120, label: 'This week' });
  expect(wk.activeDays).toEqual([true, false, true, true, false, false, true]);
  expect(countLabel(wk)).toBe('4 runs');

  const older = computeTotals(runs, runs[1], 'week', Date.parse('2027-01-10T12:00:00Z'));
  expect(older.label).toBe('Week of Nov 16');
  const month = computeTotals(runs, runs[4], 'month', Date.parse('2026-11-20T12:00:00Z'));
  expect(month).toMatchObject({ count: 1, label: 'November', family: 'ride' });
  expect(countLabel(month)).toBe('1 ride');
  expect(computeTotals(runs, runs[0], 'year', Date.parse('2027-03-01T00:00:00Z')).label).toBe('2026');
  expect(computeTotals(runs, runs[0], 'month', Date.parse('2027-03-01T00:00:00Z')).label).toBe('November 2026');
});
