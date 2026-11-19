import type { Activity, ActivityType, NewActivity } from './types';

/** How far apart two recordings of the same workout can start. */
export const MERGE_WINDOW_MS = 2 * 60_000;
/** How far apart their distances can be (GPS vs. watch vs. phone). */
export const MERGE_DISTANCE_TOLERANCE = 0.03;

export type SportFamily = 'run' | 'walk' | 'ride' | 'swim' | 'skate' | 'ski' | 'row' | 'climb' | 'other';

const FAMILY: Record<ActivityType, SportFamily> = {
  run: 'run',
  trail_run: 'run',
  walk: 'walk',
  hike: 'walk',
  ride: 'ride',
  swim: 'swim',
  skate: 'skate',
  ski: 'ski',
  row: 'row',
  climb: 'climb',
  workout: 'other',
  other: 'other',
};

export const sportFamily = (t: ActivityType): SportFamily => FAMILY[t];

type Comparable = Pick<Activity, 'type' | 'startedAt' | 'distanceM' | 'source'>;

/** True when two activities are the same workout recorded by different apps (e.g. Apple Health and Strava). */
export function isSameWorkout(a: Comparable, b: Comparable): boolean {
  if (a.source === b.source) return false; // same source: the exact-id/hash check handles it
  if (FAMILY[a.type] !== FAMILY[b.type]) return false;
  if (Math.abs(a.startedAt - b.startedAt) > MERGE_WINDOW_MS) return false;
  const da = a.distanceM ?? 0;
  const db = b.distanceM ?? 0;
  if (!da && !db) return true; // e.g. two recordings of a gym workout
  if (!da || !db) return false;
  return Math.abs(da - db) / Math.max(da, db) <= MERGE_DISTANCE_TOLERANCE;
}

export type MergePatch = Partial<
  Pick<Activity, 'title' | 'routePolyline' | 'splits' | 'laps' | 'avgHr' | 'maxHr' | 'calories' | 'elevationGainM' | 'locationName' | 'type'>
>;

/**
 * What the incoming recording adds to the one already saved: anything the
 * saved one is missing. Strava titles win, because people name runs there.
 */
export function mergePatch(existing: Activity, incoming: NewActivity): MergePatch {
  const p: MergePatch = {};
  if (!existing.routePolyline && incoming.routePolyline) p.routePolyline = incoming.routePolyline;
  if (existing.splits.length === 0 && incoming.splits.length > 0) p.splits = incoming.splits;
  if (existing.laps.length < 2 && incoming.laps.length >= 2) p.laps = incoming.laps;
  if (existing.avgHr == null && incoming.avgHr != null) p.avgHr = incoming.avgHr;
  if (existing.maxHr == null && incoming.maxHr != null) p.maxHr = incoming.maxHr;
  if (existing.calories == null && incoming.calories != null) p.calories = incoming.calories;
  if (existing.elevationGainM == null && incoming.elevationGainM != null) p.elevationGainM = incoming.elevationGainM;
  if (!existing.locationName && incoming.locationName) p.locationName = incoming.locationName;
  if (incoming.source === 'strava' && existing.source !== 'strava' && incoming.title && incoming.title !== existing.title) {
    p.title = incoming.title;
  }
  // a trail run is more specific than a run
  if (existing.type === 'run' && incoming.type === 'trail_run') p.type = 'trail_run';
  return p;
}
