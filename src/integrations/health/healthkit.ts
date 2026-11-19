import { Platform } from 'react-native';

import type { HealthWorkout } from './map';

/**
 * Apple Health through @kingstinct/react-native-healthkit. The native module
 * only exists in a development or App Store build (not Expo Go, not web), so
 * it's loaded lazily and every entry point says when it's unavailable.
 */
type HK = typeof import('@kingstinct/react-native-healthkit');

let hk: HK | null | undefined;
function load(): HK | null {
  if (hk !== undefined) return hk;
  if (Platform.OS !== 'ios') return (hk = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: HK = require('@kingstinct/react-native-healthkit');
    hk = mod.isHealthDataAvailable() ? mod : null;
  } catch {
    hk = null; // Expo Go: native module missing
  }
  return hk;
}

export const healthAvailable = () => load() != null;

const READ = [
  'HKWorkoutTypeIdentifier',
  'HKWorkoutRouteTypeIdentifier',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierDistanceCycling',
  'HKQuantityTypeIdentifierDistanceSwimming',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
] as const;

/**
 * Ask to read workouts, routes, heart rate, distance and energy. Read-only:
 * nothing is ever written to Health. (iOS never reveals whether read access
 * was granted; a sync with nothing in it is the only sign.)
 */
export async function requestHealthAccess(): Promise<void> {
  const mod = load();
  if (!mod) throw new Error('Apple Health needs the full app build. See SETUP.md.');
  await mod.requestAuthorization({ toRead: READ });
}

export type HealthBatch = { workouts: HealthWorkout[]; deletedIds: string[]; anchor: string };

/** Workouts added or deleted since `anchor` (all from `since` on the first run). */
export async function fetchWorkouts(anchor: string | null, since: Date): Promise<HealthBatch> {
  const mod = load();
  if (!mod) throw new Error('Apple Health isn’t available on this device.');
  const res = await mod.queryWorkoutSamplesWithAnchor({
    limit: 0,
    anchor: anchor ?? undefined,
    filter: anchor ? undefined : { date: { startDate: since } },
  });
  const workouts: HealthWorkout[] = [];
  for (const w of res.workouts) {
    const meta = (w.metadata ?? {}) as Record<string, unknown>;
    const elevation = meta.HKElevationAscended as { unit?: string; quantity?: number } | undefined;
    let route: HealthWorkout['route'] = [];
    try {
      const routes = await w.getWorkoutRoutes();
      route = routes.flatMap((r) => r.locations.map((l) => ({ latitude: l.latitude, longitude: l.longitude, altitude: l.altitude, date: l.date })));
    } catch {
      // no route permission or indoor workout
    }
    let avgHr: number | undefined;
    let maxHr: number | undefined;
    try {
      const hr = await w.getStatistic('HKQuantityTypeIdentifierHeartRate', 'count/min');
      avgHr = hr?.averageQuantity?.quantity;
      maxHr = hr?.maximumQuantity?.quantity;
    } catch {
      // no heart rate permission
    }
    workouts.push({
      uuid: w.uuid,
      activityType: Number(w.workoutActivityType),
      start: w.startDate,
      end: w.endDate,
      durationS: toSeconds(w.duration),
      distanceM: w.totalDistance ? toMetres(w.totalDistance) : undefined,
      energyKcal: w.totalEnergyBurned ? toKcal(w.totalEnergyBurned) : undefined,
      timeZone: typeof meta.HKTimeZone === 'string' ? meta.HKTimeZone : undefined,
      indoor: meta.HKIndoorWorkout === true,
      elevationGainM: elevation?.quantity != null ? toMetres({ unit: elevation.unit ?? 'm', quantity: elevation.quantity }) : undefined,
      avgHr,
      maxHr,
      route,
      // HKWorkoutEventType.segment = 7: what the Workout app records when you mark a segment
      segments: (w.events ?? []).filter((e) => Number(e.type) === 7).map((e) => ({ start: e.startDate, end: e.endDate })),
    });
  }
  return { workouts, deletedIds: res.deletedSamples.map((d) => d.uuid), anchor: res.newAnchor };
}

type Q = { unit: string; quantity: number };
const toSeconds = (q: Q) => (q.unit === 'min' ? q.quantity * 60 : q.unit === 'hr' ? q.quantity * 3600 : q.quantity);
const toKcal = (q: Q) => (q.unit === 'kJ' ? q.quantity / 4.184 : q.unit === 'Cal' || q.unit === 'kcal' ? q.quantity : q.quantity);
function toMetres(q: Q): number {
  switch (q.unit) {
    case 'km':
      return q.quantity * 1000;
    case 'mi':
      return q.quantity * 1609.344;
    case 'ft':
      return q.quantity * 0.3048;
    case 'yd':
      return q.quantity * 0.9144;
    case 'cm':
      return q.quantity / 100;
    default:
      return q.quantity;
  }
}

/** UpdateFrequency.immediate: wake the app as soon as a workout is saved (iOS may batch). */
const IMMEDIATE = 1;

/**
 * Ask iOS to wake the app when a workout is saved, even if the app was
 * closed. The library persists this and re-registers the observer at launch.
 */
export async function enableBackgroundSync(): Promise<void> {
  const mod = load();
  if (!mod) return;
  await mod.configureBackgroundTypes(['HKWorkoutTypeIdentifier'], IMMEDIATE as never);
}

export async function disableBackgroundSync(): Promise<void> {
  const mod = load();
  if (!mod) return;
  await mod.clearBackgroundTypes();
}

/** Called when Health has new or deleted workouts (foreground, or a background wake-up). */
export function onWorkoutsChanged(cb: () => void): () => void {
  const mod = load();
  if (!mod) return () => {};
  const sub = mod.subscribeToChanges('HKWorkoutTypeIdentifier', () => cb());
  return () => {
    sub.remove();
  };
}
