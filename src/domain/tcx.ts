import { mapType } from './gpx';
import { ImportError, type ParsedTrack, type TrackSummary } from './track';
import type { Lap, TrackPoint } from './types';

/**
 * Parse a Garmin Training Center (TCX) file: trackpoints for the route, and
 * the laps' own totals (distance, time, calories), which are more accurate
 * than totals recomputed from GPS. Works for indoor files with no positions.
 */
export function parseTcx(xml: string): ParsedTrack {
  if (!/<TrainingCenterDatabase[\s>]/i.test(xml)) throw new ImportError('This file is not a TCX file.');
  const activity = /<Activity\b([^>]*)>([\s\S]*?)<\/Activity>/i.exec(xml);
  if (!activity) throw new ImportError('This TCX file has no activity in it.');
  const sport = /Sport\s*=\s*["']([^"']+)["']/i.exec(activity[1])?.[1];
  const body = activity[2];

  const points: TrackPoint[] = [];
  const hrs: number[] = [];
  let firstTime: number | undefined;
  for (const m of body.matchAll(/<Trackpoint\b[^>]*>([\s\S]*?)<\/Trackpoint>/gi)) {
    const tp = m[1];
    const time = Date.parse(tag(tp, 'Time') ?? '');
    if (!Number.isNaN(time) && firstTime == null) firstTime = time;
    const hr = num(/<HeartRateBpm\b[^>]*>[\s\S]*?<Value>\s*([\d.]+)\s*<\/Value>/i.exec(tp)?.[1]);
    if (hr != null) hrs.push(hr);
    const lat = num(tag(tp, 'LatitudeDegrees'));
    const lon = num(tag(tp, 'LongitudeDegrees'));
    if (lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const p: TrackPoint = { lat, lon };
    const ele = num(tag(tp, 'AltitudeMeters'));
    if (ele != null) p.ele = ele;
    if (!Number.isNaN(time)) p.time = time;
    if (hr != null) p.hr = hr;
    points.push(p);
  }

  // lap totals
  let distanceM = 0;
  let timeS = 0;
  let calories = 0;
  let laps = 0;
  const lapList: Lap[] = [];
  for (const m of body.matchAll(/<Lap\b([^>]*)>([\s\S]*?)<\/Lap>/gi)) {
    laps++;
    const lap = m[2].split(/<Track\b/i)[0]; // lap-level fields come before the track
    const d = num(tag(lap, 'DistanceMeters')) ?? 0;
    const t = num(tag(lap, 'TotalTimeSeconds')) ?? 0;
    distanceM += d;
    timeS += t;
    calories += num(tag(lap, 'Calories')) ?? 0;
    const hr = num(/<AverageHeartRateBpm\b[^>]*>[\s\S]*?<Value>\s*([\d.]+)\s*<\/Value>/i.exec(lap)?.[1]);
    lapList.push({ index: laps, distanceM: d, timeS: Math.round(t), ...(hr != null ? { avgHr: Math.round(hr) } : {}) });
  }
  const startAttr = /StartTime\s*=\s*["']([^"']+)["']/i.exec(body)?.[1];
  const startedAt = Date.parse(tag(body, 'Id') ?? startAttr ?? '') || firstTime;
  if (!startedAt && points.length === 0) throw new ImportError('This TCX file has no times or positions.');

  const summary: TrackSummary = {};
  if (laps && distanceM > 0) summary.distanceM = distanceM;
  if (laps && timeS > 0) summary.movingTimeS = Math.round(timeS);
  if (calories > 0) summary.calories = Math.round(calories);
  if (hrs.length && points.length === 0) summary.avgHr = Math.round(hrs.reduce((s, h) => s + h, 0) / hrs.length);

  return { name: undefined, type: mapType(sport), points, startedAt: startedAt || undefined, summary, laps: lapList };
}

function tag(xml: string, name: string): string | undefined {
  return new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i').exec(xml)?.[1]?.trim();
}

function num(s: string | undefined | null): number | null {
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
