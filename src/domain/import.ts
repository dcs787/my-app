import { parseFit } from './fit';
import { defaultTitle } from './format';
import { encodePolyline, simplify } from './geo';
import { parseGpx } from './gpx';
import { cleanLaps, computeSplits, computeStats, lapsFromWindows } from './stats';
import { parseTcx } from './tcx';
import { ImportError, type ParsedTrack } from './track';
import type { ActivityType, NewActivity, Source, Units } from './types';

/** Route stored at ~5 m tolerance: plenty for a story graphic, a few KB at most. */
const ROUTE_TOLERANCE_M = 5;

type BuildOpts = {
  fileHash?: string | null;
  externalId?: string | null;
  /** the device's UTC offset at a moment; used when the file doesn't record its own */
  utcOffsetMin?: (startedAt: number) => number;
};

/**
 * Turn any parsed track (GPX, TCX, FIT, Apple Health, Strava streams) into an
 * activity ready to save. Device totals win over values recomputed from points.
 */
export function activityFromTrack(track: ParsedTrack, source: Source, opts: BuildOpts = {}): NewActivity {
  const timed = track.points.filter((p) => p.time != null);
  const stats = computeStats(timed.length >= 2 ? timed : track.points);
  const sum = track.summary ?? {};
  const startedAt = track.startedAt ?? stats.startedAt;
  if (startedAt == null) throw new ImportError('This file has no start time.');
  const offset =
    track.utcOffsetMin ?? (opts.utcOffsetMin ? opts.utcOffsetMin(startedAt) : -new Date(startedAt).getTimezoneOffset());
  const type: ActivityType = track.type ?? 'run';
  const route = simplify(track.points, ROUTE_TOLERANCE_M);
  const distanceM = sum.distanceM ?? (track.points.length >= 2 ? stats.distanceM : null);

  return {
    source,
    externalId: opts.externalId ?? null,
    fileHash: opts.fileHash ?? null,
    type,
    title: track.name?.slice(0, 120) || defaultTitle(type, startedAt, offset),
    locationName: null,
    startedAt,
    utcOffsetMin: offset,
    distanceM,
    movingTimeS: sum.movingTimeS ?? stats.movingTimeS ?? sum.elapsedTimeS ?? stats.elapsedTimeS ?? null,
    elapsedTimeS: sum.elapsedTimeS ?? stats.elapsedTimeS ?? null,
    elevationGainM: sum.elevationGainM ?? stats.elevationGainM ?? null,
    avgHr: sum.avgHr ?? stats.avgHr ?? null,
    maxHr: sum.maxHr ?? stats.maxHr ?? null,
    calories: sum.calories ?? null,
    // splits in both units so switching units later doesn't need the raw track
    splits: timed.length >= 2 ? [...computeSplits(timed, 'mi'), ...computeSplits(timed, 'km')] : [],
    laps: track.laps?.length ? cleanLaps(track.laps) : track.lapWindows?.length ? lapsFromWindows(track.points, track.lapWindows) : [],
    routePolyline: route.length >= 2 ? encodePolyline(route) : null,
  };
}

/** GPX times are UTC with no zone, so the device's offset at the start time is used. */
export function activityFromGpx(
  xml: string,
  opts: { fileHash: string; units?: Units; utcOffsetMin?: (startedAt: number) => number },
): NewActivity {
  return activityFromTrack(parseGpx(xml), 'gpx', opts);
}

export function activityFromTcx(xml: string, opts: { fileHash: string; utcOffsetMin?: (startedAt: number) => number }): NewActivity {
  return activityFromTrack(parseTcx(xml), 'tcx', opts);
}

export async function activityFromFit(
  bytes: ArrayBuffer,
  opts: { fileHash: string; utcOffsetMin?: (startedAt: number) => number },
): Promise<NewActivity> {
  return activityFromTrack(await parseFit(bytes), 'fit', opts);
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
      laps: [],
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

