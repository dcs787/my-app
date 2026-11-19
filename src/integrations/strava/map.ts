import { activityFromTrack } from '@/domain/import';
import type { ActivityType, NewActivity } from '@/domain/types';

import type { StravaActivity } from './types';

const SPORT: Record<string, ActivityType> = {
  Run: 'run',
  VirtualRun: 'run',
  TrailRun: 'trail_run',
  Walk: 'walk',
  Hike: 'hike',
  Ride: 'ride',
  MountainBikeRide: 'ride',
  GravelRide: 'ride',
  EBikeRide: 'ride',
  EMountainBikeRide: 'ride',
  VirtualRide: 'ride',
  Velomobile: 'ride',
  Handcycle: 'ride',
  Swim: 'swim',
  InlineSkate: 'skate',
  IceSkate: 'skate',
  Skateboard: 'skate',
  AlpineSki: 'ski',
  BackcountrySki: 'ski',
  NordicSki: 'ski',
  RollerSki: 'ski',
  Snowboard: 'ski',
  Rowing: 'row',
  VirtualRow: 'row',
  Kayaking: 'row',
  Canoeing: 'row',
  StandUpPaddling: 'row',
  RockClimbing: 'climb',
  Wheelchair: 'run',
  Workout: 'workout',
  WeightTraining: 'workout',
  Crossfit: 'workout',
  HighIntensityIntervalTraining: 'workout',
  Yoga: 'workout',
  Pilates: 'workout',
};

/** Strava summary activity -> our activity. Route comes from Strava's summary polyline as is. */
export function mapStravaActivity(s: StravaActivity): NewActivity {
  const type = SPORT[s.sport_type ?? s.type ?? ''] ?? 'other';
  const startedAt = Date.parse(s.start_date);
  // start_date_local is local wall time written as if it were UTC
  const local = s.start_date_local ? Date.parse(s.start_date_local) : NaN;
  const utcOffsetMin = Number.isNaN(local) ? undefined : Math.round((local - startedAt) / 60000);
  const base = activityFromTrack(
    {
      name: s.name,
      type,
      points: [],
      startedAt,
      utcOffsetMin,
      summary: {
        distanceM: s.distance || undefined,
        movingTimeS: s.moving_time,
        elapsedTimeS: s.elapsed_time,
        elevationGainM: s.total_elevation_gain,
        avgHr: s.average_heartrate != null ? Math.round(s.average_heartrate) : undefined,
        maxHr: s.max_heartrate != null ? Math.round(s.max_heartrate) : undefined,
        // rides report work in kJ; with ~22% efficiency kcal ≈ kJ, Strava shows the same figure
        calories: s.kilojoules != null ? Math.round(s.kilojoules) : undefined,
      },
    },
    'strava',
    { externalId: String(s.id) },
  );
  return { ...base, routePolyline: s.map?.summary_polyline || null };
}
