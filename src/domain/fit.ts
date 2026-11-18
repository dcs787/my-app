import FitParser from 'fit-file-parser';

import { mapType } from './gpx';
import { ImportError, type ParsedTrack, type TrackSummary } from './track';
import type { TrackPoint } from './types';

/**
 * Parse a FIT file (Garmin, Coros, Wahoo, Suunto, Polar exports). Uses the
 * session's own totals and the activity's local timestamp for the time zone.
 */
export async function parseFit(bytes: ArrayBuffer): Promise<ParsedTrack> {
  let data;
  try {
    data = await new FitParser({ force: true, speedUnit: 'm/s', lengthUnit: 'm', mode: 'list' }).parseAsync(bytes);
  } catch {
    throw new ImportError('This FIT file could not be read.');
  }
  const session = data.sessions?.[0];
  const records = data.records ?? [];
  if (!session && records.length === 0) throw new ImportError('This FIT file has no activity in it.');

  const points: TrackPoint[] = [];
  for (const r of records) {
    const lat = r.position_lat;
    const lon = r.position_long;
    if (lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const p: TrackPoint = { lat, lon };
    if (r.altitude != null) p.ele = r.altitude;
    if (r.timestamp) p.time = new Date(r.timestamp).getTime();
    if (r.heart_rate != null) p.hr = r.heart_rate;
    points.push(p);
  }

  const startedAt = session?.start_time ? new Date(session.start_time).getTime() : records.find((r) => r.timestamp)?.timestamp?.getTime();

  // FIT stores local time as a timestamp shifted by the UTC offset
  let utcOffsetMin: number | undefined;
  const local = data.activity?.local_timestamp;
  const utc = data.activity?.timestamp;
  if (local && utc) {
    const off = Math.round((new Date(local).getTime() - new Date(utc).getTime()) / 60000 / 15) * 15;
    if (Math.abs(off) <= 14 * 60) utcOffsetMin = off;
  }

  const summary: TrackSummary = {};
  if (session?.total_distance) summary.distanceM = session.total_distance;
  if (session?.total_timer_time) summary.movingTimeS = Math.round(session.total_timer_time);
  if (session?.total_elapsed_time) summary.elapsedTimeS = Math.round(session.total_elapsed_time);
  if (session?.total_ascent != null) summary.elevationGainM = session.total_ascent;
  if (session?.total_calories) summary.calories = session.total_calories;
  if (session?.avg_heart_rate) summary.avgHr = session.avg_heart_rate;

  return {
    type: mapType(typeof session?.sport === 'string' ? (session.sub_sport === 'trail' ? 'trail_running' : session.sport) : undefined),
    points,
    startedAt,
    utcOffsetMin,
    summary,
  };
}
