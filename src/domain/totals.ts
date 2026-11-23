import { localDate } from './format';
import { sportFamily, type SportFamily } from './merge';
import type { Activity } from './types';

export type Period = 'week' | 'month' | 'year';

export type Totals = {
  period: Period;
  family: SportFamily;
  /** local-time bounds of the period, as UTC-shifted ms (same convention as localDate) */
  start: number;
  end: number;
  count: number;
  distanceM: number;
  movingTimeS: number;
  elevationGainM: number;
  /** one flag per day of the period: did any matching activity happen that day */
  activeDays: boolean[];
  /** "This week", "Week of Nov 16", "November", "November 2025", "2026" */
  label: string;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 86_400_000;

/** Local-time bounds [start, end) of the period that contains `at`. Weeks start on Monday. */
export function periodBounds(period: Period, at: Date): { start: number; end: number } {
  const y = at.getUTCFullYear();
  const m = at.getUTCMonth();
  if (period === 'year') return { start: Date.UTC(y, 0, 1), end: Date.UTC(y + 1, 0, 1) };
  if (period === 'month') return { start: Date.UTC(y, m, 1), end: Date.UTC(y, m + 1, 1) };
  const day = Date.UTC(y, m, at.getUTCDate());
  const sinceMonday = (at.getUTCDay() + 6) % 7;
  const start = day - sinceMonday * DAY;
  return { start, end: start + 7 * DAY };
}

/**
 * Totals for the week, month or year containing `anchor`, counting activities
 * of the same sport family (runs with runs, rides with rides). Each activity
 * is placed by its own local date, so a run at 11 pm doesn't slip into the
 * next day because of time zones.
 */
export function computeTotals(activities: Activity[], anchor: Activity, period: Period, now = Date.now()): Totals {
  const family = sportFamily(anchor.type);
  const { start, end } = periodBounds(period, localDate(anchor));
  const days = Math.round((end - start) / DAY);
  const activeDays = Array.from({ length: days }, () => false);
  let count = 0;
  let distanceM = 0;
  let movingTimeS = 0;
  let elevationGainM = 0;
  for (const a of activities) {
    if (sportFamily(a.type) !== family) continue;
    const t = localDate(a).getTime();
    if (t < start || t >= end) continue;
    count++;
    distanceM += a.distanceM ?? 0;
    movingTimeS += a.movingTimeS ?? 0;
    elevationGainM += a.elevationGainM ?? 0;
    activeDays[Math.floor((t - start) / DAY)] = true;
  }
  return { period, family, start, end, count, distanceM, movingTimeS, elevationGainM, activeDays, label: periodLabel(period, start, end, now, anchor.utcOffsetMin) };
}

function periodLabel(period: Period, start: number, end: number, now: number, offsetMin: number): string {
  const today = now + offsetMin * 60_000;
  const current = today >= start && today < end;
  const d = new Date(start);
  if (period === 'year') return String(d.getUTCFullYear());
  if (period === 'month') {
    const sameYear = d.getUTCFullYear() === new Date(today).getUTCFullYear();
    return sameYear ? MONTHS[d.getUTCMonth()] : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  return current ? 'This week' : `Week of ${SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

const NOUN: Record<SportFamily, [string, string]> = {
  run: ['run', 'runs'],
  walk: ['walk', 'walks'],
  ride: ['ride', 'rides'],
  swim: ['swim', 'swims'],
  skate: ['skate', 'skates'],
  ski: ['ski day', 'ski days'],
  row: ['row', 'rows'],
  climb: ['climb', 'climbs'],
  yoga: ['yoga session', 'yoga sessions'],
  elliptical: ['elliptical session', 'elliptical sessions'],
  other: ['workout', 'workouts'],
};

/** "1 run", "4 rides" */
export const countLabel = (t: Pick<Totals, 'count' | 'family'>) => `${t.count} ${NOUN[t.family][t.count === 1 ? 0 : 1]}`;
