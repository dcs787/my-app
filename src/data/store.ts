import type { Composition } from '@/domain/composition';
import type { Activity, NewActivity, Units } from '@/domain/types';

export type Settings = {
  units: Units;
  lastFont: string | null;
  lastColour: string | null;
  /** connected Strava athlete's name, null when not connected */
  stravaAthlete: string | null;
  /** ms since epoch of the last successful Strava sync */
  stravaSyncedAt: number | null;
  /** Apple Health connected (permission asked) */
  healthConnected: boolean;
  /** HealthKit anchored-query anchor, so each sync only fetches what's new */
  healthAnchor: string | null;
  healthSyncedAt: number | null;
};

export const DEFAULT_SETTINGS: Settings = {
  units: 'mi',
  lastFont: null,
  lastColour: null,
  stravaAthlete: null,
  stravaSyncedAt: null,
  healthConnected: false,
  healthAnchor: null,
  healthSyncedAt: null,
};

/**
 * duplicate: the same file or provider activity was already saved.
 * merged: the same workout from another app was saved; it was filled in with
 * anything this one adds (route, heart rate...) instead of saving it twice.
 */
export type InsertResult = { activity: Activity; duplicate: boolean; merged?: boolean };

/**
 * Everything the screens need from storage. Two implementations share it:
 * SQLite on device (sqliteStore) and memory for web previews and tests
 * (memoryStore), so screens never know which one they're talking to.
 */
export interface Store {
  listActivities(): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity | null>;
  /** Skips repeats of the same file or provider id, and merges the same workout recorded by another app. */
  insertActivity(a: NewActivity): Promise<InsertResult>;
  /** Edits by the person (title, type, place) and details fetched later (laps, splits). */
  updateActivity(id: string, patch: Partial<Pick<Activity, 'title' | 'type' | 'locationName' | 'laps' | 'splits' | 'detailsAt' | 'deviceName'>>): Promise<void>;
  deleteActivity(id: string): Promise<void>;
  /** Remove everything that came from one source (e.g. after disconnecting Strava). Returns how many. */
  deleteBySource(source: Activity['source']): Promise<number>;
  /** Remove activities a provider says were deleted (e.g. a workout deleted in Apple Health). */
  deleteByExternalIds(source: Activity['source'], ids: string[]): Promise<number>;

  getComposition(id: string): Promise<Composition | null>;
  latestComposition(activityId: string): Promise<Composition | null>;
  saveComposition(c: Omit<Composition, 'createdAt' | 'updatedAt'>): Promise<Composition>;

  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Settings>): Promise<Settings>;

  /** Delete every activity, design and setting. */
  wipe(): Promise<void>;

  /** Called after any write, so screens can refresh. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

/** Small helper both implementations use to notify subscribers. */
export function createEmitter() {
  const listeners = new Set<() => void>();
  return {
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    emit() {
      listeners.forEach((l) => l());
    },
  };
}
