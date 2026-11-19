import type { ActivityType, Lap, TrackPoint } from './types';

/** Totals a device recorded itself. Preferred over values recomputed from GPS points. */
export type TrackSummary = {
  distanceM?: number;
  movingTimeS?: number;
  elapsedTimeS?: number;
  elevationGainM?: number;
  calories?: number;
  avgHr?: number;
  maxHr?: number;
};

/** What every file parser (GPX, TCX, FIT) produces. */
export type ParsedTrack = {
  name?: string;
  type?: ActivityType;
  /** points with a position; may be empty for treadmill or pool files */
  points: TrackPoint[];
  /** ms since epoch, when the file states it separately from the points */
  startedAt?: number;
  /** when the file records local time (FIT does) */
  utcOffsetMin?: number;
  summary?: TrackSummary;
  /** laps with the device's own totals (FIT, TCX) */
  laps?: Lap[];
  /** lap start and end times only (Apple Health segments); timed from the points */
  lapWindows?: { start: number; end: number }[];
};

/** A file we can't use, with a message fit to show the user. */
export class ImportError extends Error {}
