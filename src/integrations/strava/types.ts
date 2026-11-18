/** The fields we read from Strava's SummaryActivity (GET /athlete/activities). */
export type StravaActivity = {
  id: number;
  name: string;
  distance?: number; // metres
  moving_time?: number; // s
  elapsed_time?: number; // s
  total_elevation_gain?: number; // m
  sport_type?: string;
  type?: string; // deprecated, fallback
  start_date: string; // ISO, UTC
  start_date_local?: string; // ISO local wall time with a Z suffix
  map?: { summary_polyline?: string | null } | null;
  average_heartrate?: number;
  max_heartrate?: number;
  kilojoules?: number;
  trainer?: boolean;
  manual?: boolean;
};

export type StravaTokens = {
  accessToken: string;
  refreshToken: string;
  /** seconds since epoch */
  expiresAt: number;
  athleteId: number;
  athleteName: string;
};
