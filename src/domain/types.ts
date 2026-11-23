/** Units are always SI (metres, seconds) in storage; convert only for display. */
export type Units = 'mi' | 'km';

export const ACTIVITY_TYPES = ['run', 'trail_run', 'walk', 'hike', 'ride', 'swim', 'skate', 'ski', 'row', 'climb', 'yoga', 'elliptical', 'workout', 'other'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const SOURCES = ['apple_health', 'strava', 'gpx', 'tcx', 'fit', 'manual'] as const;
export type Source = (typeof SOURCES)[number];

export type LatLng = { lat: number; lon: number };

export type TrackPoint = LatLng & {
  /** metres above sea level */
  ele?: number;
  /** ms since epoch */
  time?: number;
  hr?: number;
};

export type Split = {
  unit: Units;
  /** 1-based index of this split */
  index: number;
  distanceM: number;
  timeS: number;
  elevationDeltaM?: number;
};

/** A lap the device or app recorded: a button press, an auto-lap, or a marked segment. */
export type Lap = {
  /** 1-based */
  index: number;
  distanceM: number;
  /** moving time of the lap */
  timeS: number;
  avgHr?: number;
  climbM?: number;
};

export type Activity = {
  id: string;
  source: Source;
  externalId?: string | null;
  fileHash?: string | null;
  type: ActivityType;
  title: string;
  locationName?: string | null;
  /** ms since epoch, UTC */
  startedAt: number;
  /** minutes east of UTC at the start of the activity */
  utcOffsetMin: number;
  distanceM?: number | null;
  movingTimeS?: number | null;
  elapsedTimeS?: number | null;
  elevationGainM?: number | null;
  avgHr?: number | null;
  maxHr?: number | null;
  calories?: number | null;
  splits: Split[];
  /** laps as recorded by the watch or app; empty when it recorded none */
  laps: Lap[];
  /** when laps and splits were last fetched from the provider (Strava), ms */
  detailsAt?: number | null;
  /** the watch or app that recorded it, as the provider names it ("Garmin Forerunner 265") */
  deviceName?: string | null;
  /** Google encoded polyline, simplified */
  routePolyline?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type NewActivity = Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>;
