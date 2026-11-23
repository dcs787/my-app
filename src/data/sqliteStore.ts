import type { SQLiteDatabase } from 'expo-sqlite';

import type { Composition } from '@/domain/composition';
import { isSameWorkout, MERGE_WINDOW_MS, mergePatch, type MergePatch } from '@/domain/merge';
import type { Activity, NewActivity } from '@/domain/types';

import { createEmitter, DEFAULT_SETTINGS, type Settings, type Store } from './store';

/**
 * Local schema. Mirrors replica/schema.sql (minus server-only columns) so the
 * accounts milestone can upload rows as they are. Times are ms since epoch.
 */
export const MIGRATIONS: string[] = [
  `
  PRAGMA journal_mode = WAL;
  CREATE TABLE activities (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('apple_health','strava','gpx','tcx','fit','manual')),
    external_id TEXT,
    file_hash TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    location_name TEXT,
    started_at INTEGER NOT NULL,
    utc_offset_min INTEGER NOT NULL DEFAULT 0,
    distance_m REAL,
    moving_time_s INTEGER,
    elapsed_time_s INTEGER,
    elevation_gain_m REAL,
    avg_hr INTEGER,
    max_hr INTEGER,
    calories INTEGER,
    splits TEXT NOT NULL DEFAULT '[]',
    route_polyline TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX activities_source_external ON activities (source, external_id) WHERE external_id IS NOT NULL;
  CREATE UNIQUE INDEX activities_file_hash ON activities (file_hash) WHERE file_hash IS NOT NULL;
  CREATE INDEX activities_started ON activities (started_at DESC);

  CREATE TABLE compositions (
    id TEXT PRIMARY KEY NOT NULL,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX compositions_activity ON compositions (activity_id, updated_at DESC);

  CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  `,
  // v2: watch laps, and when provider details (Strava laps and splits) were fetched
  `
  ALTER TABLE activities ADD COLUMN laps TEXT NOT NULL DEFAULT '[]';
  ALTER TABLE activities ADD COLUMN details_at INTEGER;
  `,
  // v3: the recording device, for attribution ("Recorded on Garmin Forerunner 265")
  `
  ALTER TABLE activities ADD COLUMN device_name TEXT;
  `,
];

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[version]);
      await tx.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
    version++;
  }
}

type ActivityRow = {
  id: string;
  source: Activity['source'];
  external_id: string | null;
  file_hash: string | null;
  type: Activity['type'];
  title: string;
  location_name: string | null;
  started_at: number;
  utc_offset_min: number;
  distance_m: number | null;
  moving_time_s: number | null;
  elapsed_time_s: number | null;
  elevation_gain_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
  splits: string;
  laps: string;
  details_at: number | null;
  device_name: string | null;
  route_polyline: string | null;
  created_at: number;
  updated_at: number;
};

const fromRow = (r: ActivityRow): Activity => ({
  id: r.id,
  source: r.source,
  externalId: r.external_id,
  fileHash: r.file_hash,
  type: r.type,
  title: r.title,
  locationName: r.location_name,
  startedAt: r.started_at,
  utcOffsetMin: r.utc_offset_min,
  distanceM: r.distance_m,
  movingTimeS: r.moving_time_s,
  elapsedTimeS: r.elapsed_time_s,
  elevationGainM: r.elevation_gain_m,
  avgHr: r.avg_hr,
  maxHr: r.max_hr,
  calories: r.calories,
  splits: safeJson(r.splits, []),
  laps: safeJson(r.laps, []),
  detailsAt: r.details_at,
  deviceName: r.device_name,
  routePolyline: r.route_polyline,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function safeJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function createSqliteStore(db: SQLiteDatabase, newId: () => string, now: () => number = Date.now): Store {
  const events = createEmitter();

  async function findDuplicate(a: NewActivity) {
    if (a.fileHash) {
      const r = await db.getFirstAsync<ActivityRow>('SELECT * FROM activities WHERE file_hash = ?', a.fileHash);
      if (r) return fromRow(r);
    }
    if (a.externalId) {
      const r = await db.getFirstAsync<ActivityRow>(
        'SELECT * FROM activities WHERE source = ? AND external_id = ?',
        a.source,
        a.externalId,
      );
      if (r) return fromRow(r);
    }
    return null;
  }

  async function applyMerge(id: string, p: MergePatch) {
    const cols: Record<keyof MergePatch, string> = {
      title: 'title',
      routePolyline: 'route_polyline',
      splits: 'splits',
      laps: 'laps',
      avgHr: 'avg_hr',
      maxHr: 'max_hr',
      calories: 'calories',
      elevationGainM: 'elevation_gain_m',
      locationName: 'location_name',
      type: 'type',
    };
    const keys = Object.keys(p) as (keyof MergePatch)[];
    if (!keys.length) return;
    const vals = keys.map((k) => (k === 'splits' || k === 'laps' ? JSON.stringify(p[k]) : (p[k] as string | number | null)));
    await db.runAsync(
      `UPDATE activities SET ${keys.map((k) => `${cols[k]} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
      [...vals, now(), id],
    );
  }

  async function getComposition(id: string): Promise<Composition | null> {
    const r = await db.getFirstAsync<{ data: string; created_at: number; updated_at: number }>(
      'SELECT data, created_at, updated_at FROM compositions WHERE id = ?',
      id,
    );
    const c = r ? safeJson<Composition | null>(r.data, null) : null;
    return c && r ? { ...c, createdAt: r.created_at, updatedAt: r.updated_at } : null;
  }

  async function getSettings(): Promise<Settings> {
    const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
    const s: Settings = { ...DEFAULT_SETTINGS };
    for (const r of rows) {
      if (r.key in s) (s as Record<string, unknown>)[r.key] = safeJson(r.value, null);
    }
    return s;
  }

  return {
    async listActivities() {
      const rows = await db.getAllAsync<ActivityRow>('SELECT * FROM activities ORDER BY started_at DESC');
      return rows.map(fromRow);
    },
    async getActivity(id) {
      const r = await db.getFirstAsync<ActivityRow>('SELECT * FROM activities WHERE id = ?', id);
      return r ? fromRow(r) : null;
    },
    async insertActivity(a) {
      const dup = await findDuplicate(a);
      if (dup) return { activity: dup, duplicate: true };
      const near = await db.getAllAsync<ActivityRow>(
        'SELECT * FROM activities WHERE started_at BETWEEN ? AND ? AND source != ?',
        [a.startedAt - MERGE_WINDOW_MS, a.startedAt + MERGE_WINDOW_MS, a.source],
      );
      const twin = near.map(fromRow).find((x) => isSameWorkout(x, a));
      if (twin) {
        await applyMerge(twin.id, mergePatch(twin, a));
        events.emit();
        const row = await db.getFirstAsync<ActivityRow>('SELECT * FROM activities WHERE id = ?', twin.id);
        return { activity: fromRow(row!), duplicate: true, merged: true };
      }
      const t = now();
      const activity: Activity = { ...a, detailsAt: a.detailsAt ?? null, deviceName: a.deviceName ?? null, id: newId(), createdAt: t, updatedAt: t };
      await db.runAsync(
        `INSERT INTO activities (id, source, external_id, file_hash, type, title, location_name, started_at,
          utc_offset_min, distance_m, moving_time_s, elapsed_time_s, elevation_gain_m, avg_hr, max_hr, calories,
          splits, laps, details_at, device_name, route_polyline, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          activity.id,
          activity.source,
          activity.externalId ?? null,
          activity.fileHash ?? null,
          activity.type,
          activity.title,
          activity.locationName ?? null,
          activity.startedAt,
          activity.utcOffsetMin,
          activity.distanceM ?? null,
          activity.movingTimeS ?? null,
          activity.elapsedTimeS ?? null,
          activity.elevationGainM ?? null,
          activity.avgHr ?? null,
          activity.maxHr ?? null,
          activity.calories ?? null,
          JSON.stringify(activity.splits),
          JSON.stringify(activity.laps ?? []),
          activity.detailsAt ?? null,
          activity.deviceName ?? null,
          activity.routePolyline ?? null,
          t,
          t,
        ],
      );
      events.emit();
      return { activity, duplicate: false };
    },
    async updateActivity(id, patch) {
      const sets: string[] = [];
      const vals: (string | number | null)[] = [];
      const add = (col: string, v: string | number | null) => {
        sets.push(`${col} = ?`);
        vals.push(v);
      };
      if (patch.title !== undefined) add('title', patch.title);
      if (patch.type !== undefined) add('type', patch.type);
      if (patch.locationName !== undefined) add('location_name', patch.locationName ?? null);
      if (patch.laps !== undefined) add('laps', JSON.stringify(patch.laps));
      if (patch.splits !== undefined) add('splits', JSON.stringify(patch.splits));
      if (patch.detailsAt !== undefined) add('details_at', patch.detailsAt ?? null);
      if (patch.deviceName !== undefined) add('device_name', patch.deviceName ?? null);
      if (!sets.length) return;
      await db.runAsync(`UPDATE activities SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [...vals, now(), id]);
      events.emit();
    },
    async deleteActivity(id) {
      await db.runAsync('DELETE FROM activities WHERE id = ?', id);
      events.emit();
    },
    async deleteBySource(source) {
      const r = await db.runAsync('DELETE FROM activities WHERE source = ?', source);
      if (r.changes) events.emit();
      return r.changes;
    },
    async deleteByExternalIds(source, ids) {
      if (!ids.length) return 0;
      let changes = 0;
      // chunks keep us under SQLite's bound-parameter limit
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const r = await db.runAsync(
          `DELETE FROM activities WHERE source = ? AND external_id IN (${chunk.map(() => '?').join(',')})`,
          [source, ...chunk],
        );
        changes += r.changes;
      }
      if (changes) events.emit();
      return changes;
    },
    getComposition,
    async latestComposition(activityId) {
      const r = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM compositions WHERE activity_id = ? ORDER BY updated_at DESC LIMIT 1',
        activityId,
      );
      return r ? getComposition(r.id) : null;
    },
    async saveComposition(c) {
      const t = now();
      await db.runAsync(
        `INSERT INTO compositions (id, activity_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
        [c.id, c.activityId, JSON.stringify(c), t, t],
      );
      events.emit();
      return (await getComposition(c.id))!;
    },
    getSettings,
    async setSettings(patch) {
      await db.withTransactionAsync(async () => {
        for (const [k, v] of Object.entries(patch)) {
          await db.runAsync(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
            [k, JSON.stringify(v)],
          );
        }
      });
      events.emit();
      return getSettings();
    },
    async wipe() {
      await db.execAsync('DELETE FROM compositions; DELETE FROM activities; DELETE FROM settings;');
      events.emit();
    },
    subscribe: events.subscribe,
  };
}
