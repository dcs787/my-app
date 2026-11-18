import { defaultTitle } from './format';
import { encodePolyline, simplify } from './geo';
import { parseGpx } from './gpx';
import { computeSplits, computeStats } from './stats';
import type { ActivityType, NewActivity, Units } from './types';

/** Route stored at ~5 m tolerance: plenty for a story graphic, a few KB at most. */
const ROUTE_TOLERANCE_M = 5;

/**
 * Turn a GPX file into an activity ready to save.
 * `utcOffsetMin` defaults to the device's offset at the activity's start time,
 * since GPX times are UTC and carry no zone.
 */
export function activityFromGpx(
  xml: string,
  opts: { fileHash: string; units: Units; utcOffsetMin?: (startedAt: number) => number },
): NewActivity {
  const track = parseGpx(xml);
  const stats = computeStats(track.points);
  const startedAt = stats.startedAt ?? Date.now();
  const offset = opts.utcOffsetMin
    ? opts.utcOffsetMin(startedAt)
    : -new Date(startedAt).getTimezoneOffset();
  const type: ActivityType = track.type ?? 'run';
  const route = simplify(track.points, ROUTE_TOLERANCE_M);

  return {
    source: 'gpx',
    externalId: null,
    fileHash: opts.fileHash,
    type,
    title: track.name?.slice(0, 120) || defaultTitle(type, startedAt, offset),
    locationName: null,
    startedAt,
    utcOffsetMin: offset,
    distanceM: stats.distanceM,
    movingTimeS: stats.movingTimeS ?? stats.elapsedTimeS ?? null,
    elapsedTimeS: stats.elapsedTimeS ?? null,
    elevationGainM: stats.elevationGainM ?? null,
    avgHr: stats.avgHr ?? null,
    maxHr: stats.maxHr ?? null,
    calories: null,
    // splits in both units so switching units later doesn't need the raw track
    splits: [...computeSplits(track.points, 'mi'), ...computeSplits(track.points, 'km')],
    routePolyline: route.length >= 2 ? encodePolyline(route) : null,
  };
}

export type ManualInput = {
  type: ActivityType;
  title?: string;
  startedAt: number;
  distance?: string; // in the user's units, as typed
  duration?: string; // "48:10" or "1:02:03" or minutes "48"
  elevation?: string; // ft or m
  avgHr?: string;
  calories?: string;
};

export type ManualErrors = Partial<Record<keyof ManualInput, string>>;

/** Validate and convert the manual-entry form. Returns errors keyed by field, or the activity. */
export function activityFromManual(
  input: ManualInput,
  units: Units,
): { ok: true; activity: NewActivity } | { ok: false; errors: ManualErrors } {
  const errors: ManualErrors = {};
  const dist = parseNumber(input.distance);
  const secs = parseDuration(input.duration);
  const elev = parseNumber(input.elevation);
  const hr = parseNumber(input.avgHr);
  const cal = parseNumber(input.calories);

  if (input.distance?.trim() && (dist == null || dist <= 0 || dist > 1000)) errors.distance = 'Enter a distance, like 6.2';
  if (input.duration?.trim() && (secs == null || secs <= 0 || secs > 7 * 86400))
    errors.duration = 'Enter a time like 48:10 or 1:02:03';
  if (!input.distance?.trim() && !input.duration?.trim()) errors.distance = 'Add a distance, a time, or both';
  if (input.elevation?.trim() && (elev == null || elev < 0)) errors.elevation = 'Enter a number, like 300';
  if (input.avgHr?.trim() && (hr == null || hr < 25 || hr > 240)) errors.avgHr = 'Heart rate is usually 40 to 200';
  if (input.calories?.trim() && (cal == null || cal < 0 || cal > 20000)) errors.calories = 'Enter a number, like 640';
  if (!Number.isFinite(input.startedAt) || input.startedAt > Date.now() + 86400_000) errors.startedAt = 'Pick a date that isn’t in the future';
  if (Object.keys(errors).length) return { ok: false, errors };

  const offset = -new Date(input.startedAt).getTimezoneOffset();
  const metresPer = units === 'mi' ? 1609.344 : 1000;
  return {
    ok: true,
    activity: {
      source: 'manual',
      externalId: null,
      fileHash: null,
      type: input.type,
      title: input.title?.trim().slice(0, 120) || defaultTitle(input.type, input.startedAt, offset),
      locationName: null,
      startedAt: input.startedAt,
      utcOffsetMin: offset,
      distanceM: dist != null ? dist * metresPer : null,
      movingTimeS: secs ?? null,
      elapsedTimeS: secs ?? null,
      elevationGainM: elev != null ? (units === 'mi' ? elev / 3.28084 : elev) : null,
      avgHr: hr != null ? Math.round(hr) : null,
      maxHr: null,
      calories: cal != null ? Math.round(cal) : null,
      splits: [],
      routePolyline: null,
    },
  };
}

export function parseNumber(s?: string): number | null {
  if (s == null || !s.trim()) return null;
  const n = Number(s.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** "48:10" -> 2890, "1:02:03" -> 3723, "48" -> 2880 (minutes). */
export function parseDuration(s?: string): number | null {
  if (s == null || !s.trim()) return null;
  const parts = s.trim().split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  const n = parts.map(Number);
  if (n.length === 1) return Math.round(n[0] * 60);
  if (n.slice(1).some((v) => v >= 60)) return null;
  return n.length === 2 ? n[0] * 60 + n[1] : n[0] * 3600 + n[1] * 60 + n[2];
}

