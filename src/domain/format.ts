import { METRES_PER } from './stats';
import type { Activity, ActivityType, Units } from './types';

const FT_PER_M = 3.28084;

/** "6.21" (two decimals under 100, one above). */
export function formatDistance(m: number | null | undefined, units: Units): string | null {
  if (m == null) return null;
  const v = m / METRES_PER[units];
  return v >= 100 ? v.toFixed(1) : v.toFixed(2);
}

/** "48:10", "1:02:03" */
export function formatDuration(s: number | null | undefined): string | null {
  if (s == null || !Number.isFinite(s)) return null;
  const t = Math.round(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** Pace per mile/km: "7:45". Null when it would be meaningless. */
export function formatPace(distanceM: number | null | undefined, timeS: number | null | undefined, units: Units) {
  if (!distanceM || !timeS || distanceM < 10) return null;
  const perUnit = timeS / (distanceM / METRES_PER[units]);
  if (perUnit > 60 * 60) return null; // slower than an hour per unit: not a pace worth showing
  return formatDuration(perUnit);
}

/** Speed for rides: "18.4" mph or km/h. */
export function formatSpeed(distanceM: number | null | undefined, timeS: number | null | undefined, units: Units) {
  if (!distanceM || !timeS) return null;
  return (distanceM / METRES_PER[units] / (timeS / 3600)).toFixed(1);
}

export function formatElevation(m: number | null | undefined, units: Units): string | null {
  if (m == null) return null;
  return units === 'mi' ? String(Math.round(m * FT_PER_M)) : String(Math.round(m));
}

export const unitLabel = {
  distance: (u: Units) => (u === 'mi' ? 'mi' : 'km'),
  pace: (u: Units) => (u === 'mi' ? '/mi' : '/km'),
  speed: (u: Units) => (u === 'mi' ? 'mph' : 'km/h'),
  elevation: (u: Units) => (u === 'mi' ? 'ft' : 'm'),
};

/** Rides show speed, everything on foot shows pace. */
export const usesSpeed = (t: ActivityType) => t === 'ride';

const TYPE_NOUN: Record<ActivityType, string> = {
  run: 'run',
  trail_run: 'trail run',
  walk: 'walk',
  hike: 'hike',
  ride: 'ride',
  swim: 'swim',
  workout: 'workout',
  other: 'activity',
};

export const typeLabel = (t: ActivityType) => TYPE_NOUN[t][0].toUpperCase() + TYPE_NOUN[t].slice(1);

/** Local wall-clock Date for an activity (shifted so getUTC* reads local time). */
export function localDate(a: Pick<Activity, 'startedAt' | 'utcOffsetMin'>): Date {
  return new Date(a.startedAt + a.utcOffsetMin * 60_000);
}

/** "Morning run", "Evening ride": a default title when the file has none. */
export function defaultTitle(type: ActivityType, startedAt: number, utcOffsetMin: number): string {
  const h = localDate({ startedAt, utcOffsetMin }).getUTCHours();
  const part = h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
  return `${part} ${TYPE_NOUN[type]}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Tue, Nov 17" (adds the year if it isn't this year). */
export function formatDay(a: Pick<Activity, 'startedAt' | 'utcOffsetMin'>, now = Date.now()): string {
  const d = localDate(a);
  const sameYear = d.getUTCFullYear() === new Date(now).getUTCFullYear();
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${sameYear ? '' : `, ${d.getUTCFullYear()}`}`;
}

export const weekdayName = (a: Pick<Activity, 'startedAt' | 'utcOffsetMin'>) => DAYS_LONG[localDate(a).getUTCDay()];

export const SOURCE_LABEL = {
  apple_health: 'Apple Health',
  strava: 'Strava',
  gpx: 'GPX file',
  tcx: 'TCX file',
  fit: 'FIT file',
  manual: 'Added by hand',
} as const;
