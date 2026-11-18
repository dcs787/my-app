import { haversine } from './geo';
import type { Split, TrackPoint, Units } from './types';

export const METRES_PER = { mi: 1609.344, km: 1000 } as const;

/** Below this speed between two points you're stopped (0.5 m/s ~ 53 min/mi). */
const MOVING_SPEED = 0.5;
/** A gap longer than this between points counts as paused, whatever the distance. */
const MAX_GAP_S = 60;
/** GPS jitter: ignore jumps faster than this (m/s, ~ 180 km/h). */
const MAX_SPEED = 50;
/** Elevation gain counts only climbs larger than this, to cancel GPS/barometer noise. */
const ELEVATION_HYSTERESIS_M = 3;

export type TrackStats = {
  distanceM: number;
  startedAt?: number;
  elapsedTimeS?: number;
  movingTimeS?: number;
  elevationGainM?: number;
  avgHr?: number;
  maxHr?: number;
};

export function computeStats(points: TrackPoint[]): TrackStats {
  let distanceM = 0;
  let movingS = 0;
  let timed = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const d = haversine(a, b);
    if (a.time != null && b.time != null) {
      timed++;
      const dt = (b.time - a.time) / 1000;
      if (dt <= 0) continue;
      const v = d / dt;
      if (v > MAX_SPEED) continue; // GPS spike
      distanceM += d;
      if (v >= MOVING_SPEED && dt <= MAX_GAP_S) movingS += dt;
    } else {
      distanceM += d;
    }
  }

  const first = points.find((p) => p.time != null)?.time;
  const last = [...points].reverse().find((p) => p.time != null)?.time;
  const hrs = points.map((p) => p.hr).filter((h): h is number => h != null && h > 20 && h < 250);

  return {
    distanceM,
    startedAt: first,
    elapsedTimeS: first != null && last != null ? Math.round((last - first) / 1000) : undefined,
    movingTimeS: timed > 0 ? Math.round(movingS) : undefined,
    elevationGainM: elevationGain(points),
    avgHr: hrs.length ? Math.round(hrs.reduce((s, h) => s + h, 0) / hrs.length) : undefined,
    maxHr: hrs.length ? Math.max(...hrs) : undefined,
  };
}

/** Smoothed elevation gain with hysteresis. */
export function elevationGain(points: TrackPoint[]): number | undefined {
  const eles = points.map((p) => p.ele).filter((e): e is number => e != null);
  if (eles.length < 2) return undefined;
  // 5-point moving average
  const smooth = eles.map((_, i) => {
    const w = eles.slice(Math.max(0, i - 2), i + 3);
    return w.reduce((s, e) => s + e, 0) / w.length;
  });
  let gain = 0;
  let ref = smooth[0];
  for (const e of smooth) {
    if (e - ref >= ELEVATION_HYSTERESIS_M) {
      gain += e - ref;
      ref = e;
    } else if (e < ref) {
      ref = e;
    }
  }
  return Math.round(gain);
}

/**
 * Splits per mile or kilometre, timed by interpolating the moment each boundary
 * is crossed. The last split is partial if the distance isn't a whole number.
 */
export function computeSplits(points: TrackPoint[], unit: Units): Split[] {
  const step = METRES_PER[unit];
  if (points.length < 2 || points.some((p) => p.time == null)) return [];
  const splits: Split[] = [];
  let cum = 0;
  let boundary = step;
  let splitStartT = points[0].time!;
  let splitStartCum = 0;
  let splitStartEle = points[0].ele;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const d = haversine(a, b);
    const dt = (b.time! - a.time!) / 1000;
    if (dt <= 0 || d / dt > MAX_SPEED) continue;
    while (cum + d >= boundary) {
      const f = d === 0 ? 0 : (boundary - cum) / d;
      const t = a.time! + f * (b.time! - a.time!);
      const ele = a.ele != null && b.ele != null ? a.ele + f * (b.ele - a.ele) : undefined;
      splits.push({
        unit,
        index: splits.length + 1,
        distanceM: step,
        timeS: Math.round((t - splitStartT) / 1000),
        elevationDeltaM: ele != null && splitStartEle != null ? Math.round(ele - splitStartEle) : undefined,
      });
      splitStartT = t;
      splitStartCum = boundary;
      splitStartEle = ele;
      boundary += step;
    }
    cum += d;
  }
  const rest = cum - splitStartCum;
  if (rest >= step * 0.05) {
    const last = points[points.length - 1];
    splits.push({
      unit,
      index: splits.length + 1,
      distanceM: Math.round(rest),
      timeS: Math.round((last.time! - splitStartT) / 1000),
      elevationDeltaM:
        last.ele != null && splitStartEle != null ? Math.round(last.ele - splitStartEle) : undefined,
    });
  }
  return splits;
}
