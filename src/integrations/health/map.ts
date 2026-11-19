import { activityFromTrack } from '@/domain/import';
import type { ActivityType, NewActivity, TrackPoint } from '@/domain/types';

/**
 * A HealthKit workout as plain data, converted from the library's objects in
 * healthkit.ts. Keeping this shape plain makes the mapping testable without
 * a phone.
 */
export type HealthWorkout = {
  uuid: string;
  /** HKWorkoutActivityType raw value */
  activityType: number;
  start: Date;
  end: Date;
  durationS: number;
  distanceM?: number;
  energyKcal?: number;
  /** HKTimeZone metadata, e.g. "America/Denver" */
  timeZone?: string;
  indoor?: boolean;
  elevationGainM?: number;
  avgHr?: number;
  maxHr?: number;
  route?: { latitude: number; longitude: number; altitude?: number; date: Date }[];
  /** segments the person marked during the workout (HKWorkoutEventType.segment) */
  segments?: { start: Date; end: Date }[];
};

/** HKWorkoutActivityType raw values we care about (Apple's documented enum). */
const TYPES: Record<number, ActivityType> = {
  37: 'run', // running
  52: 'walk', // walking
  24: 'hike', // hiking
  13: 'ride', // cycling
  46: 'swim', // swimming
  39: 'skate', // skatingSports
  60: 'ski', // crossCountrySkiing
  61: 'ski', // downhillSkiing
  67: 'ski', // snowboarding
  40: 'ski', // snowSports
  9: 'climb', // climbing
  71: 'run', // wheelchairRunPace
  70: 'walk', // wheelchairWalkPace
  74: 'ride', // handCycling
  20: 'workout', // functionalStrengthTraining
  50: 'workout', // traditionalStrengthTraining
  57: 'workout', // yoga
  63: 'workout', // highIntensityIntervalTraining
  73: 'workout', // mixedCardio
  16: 'workout', // elliptical
  35: 'row', // rowing
};

export function mapHealthWorkout(w: HealthWorkout): NewActivity {
  const type = TYPES[w.activityType] ?? 'other';
  const points: TrackPoint[] = (w.route ?? []).map((l) => ({
    lat: l.latitude,
    lon: l.longitude,
    ele: l.altitude,
    time: l.date.getTime(),
  }));
  const startedAt = w.start.getTime();
  return activityFromTrack(
    {
      type,
      points,
      startedAt,
      utcOffsetMin: w.timeZone ? offsetForZone(w.timeZone, startedAt) : undefined,
      lapWindows: w.segments?.map((s) => ({ start: s.start.getTime(), end: s.end.getTime() })),
      summary: {
        distanceM: w.distanceM && w.distanceM > 0 ? w.distanceM : undefined,
        // Apple's duration excludes pauses, so it's the moving time
        movingTimeS: Math.round(w.durationS),
        elapsedTimeS: Math.round((w.end.getTime() - startedAt) / 1000),
        elevationGainM: w.elevationGainM,
        calories: w.energyKcal != null ? Math.round(w.energyKcal) : undefined,
        avgHr: w.avgHr != null ? Math.round(w.avgHr) : undefined,
        maxHr: w.maxHr != null ? Math.round(w.maxHr) : undefined,
      },
    },
    'apple_health',
    { externalId: w.uuid },
  );
}

/** Minutes east of UTC for an IANA zone at a moment, or undefined if the zone is unknown. */
export function offsetForZone(zone: string, at: number): number | undefined {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date(at));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
    return Math.round((asUtc - Math.floor(at / 60000) * 60000) / 60000);
  } catch {
    return undefined;
  }
}
