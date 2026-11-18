/**
 * @jest-environment node
 */
// Runs one behaviour suite against both stores. The SQLite store runs on Node's
// built-in SQLite through a small adapter with expo-sqlite's async API, so the
// real SQL (migrations, unique indexes, cascades, upserts) is exercised.
import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewActivity } from '@/domain/types';

import { createMemoryStore } from '../memoryStore';
import { createSqliteStore, migrate } from '../sqliteStore';
import type { Store } from '../store';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');

type Param = string | number | null;
const flat = (params: (Param | Param[])[]): Param[] =>
  params.length === 1 && Array.isArray(params[0]) ? params[0] : (params as Param[]);

function nodeAdapter(): SQLiteDatabase {
  const db = new DatabaseSync(':memory:');
  const self = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async getFirstAsync(sql: string, ...p: (Param | Param[])[]) {
      return db.prepare(sql).get(...flat(p)) ?? null;
    },
    async getAllAsync(sql: string, ...p: (Param | Param[])[]) {
      return db.prepare(sql).all(...flat(p));
    },
    async runAsync(sql: string, ...p: (Param | Param[])[]) {
      const r = db.prepare(sql).run(...flat(p));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async withTransactionAsync(fn: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    async withExclusiveTransactionAsync(fn: (tx: unknown) => Promise<void>) {
      db.exec('BEGIN EXCLUSIVE');
      try {
        await fn(self);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return self as unknown as SQLiteDatabase;
}

let seq = 0;
let clock = 1_000;
const newId = () => `id-${++seq}`;
const now = () => ++clock;

const sample = (over: Partial<NewActivity> = {}): NewActivity => ({
  source: 'gpx',
  externalId: null,
  fileHash: `hash-${seq}-${Math.random()}`,
  type: 'run',
  title: 'Morning run',
  locationName: null,
  startedAt: Date.UTC(2026, 10, 17, 13),
  utcOffsetMin: -420,
  distanceM: 10000,
  movingTimeS: 2890,
  elapsedTimeS: 3000,
  elevationGainM: 100,
  avgHr: 151,
  maxHr: 170,
  calories: null,
  splits: [{ unit: 'km', index: 1, distanceM: 1000, timeS: 289 }],
  routePolyline: '_p~iF~ps|U_ulLnnqC',
  ...over,
});

const makers: [string, () => Promise<Store>][] = [
  ['memory', async () => createMemoryStore(newId, now)],
  [
    'sqlite',
    async () => {
      const db = nodeAdapter();
      await migrate(db);
      await migrate(db); // idempotent
      return createSqliteStore(db, newId, now);
    },
  ],
];

describe.each(makers)('%s store', (_name, make) => {
  let store: Store;
  beforeEach(async () => {
    store = await make();
  });

  it('inserts, reads back every field, and lists newest first', async () => {
    const { activity: older } = await store.insertActivity(sample({ startedAt: 1 }));
    const { activity: newer, duplicate } = await store.insertActivity(sample({ startedAt: 2, title: 'Long run' }));
    expect(duplicate).toBe(false);
    expect((await store.listActivities()).map((a) => a.id)).toEqual([newer.id, older.id]);
    expect(await store.getActivity(newer.id)).toEqual(newer);
    expect(await store.getActivity('missing')).toBeNull();
  });

  it('skips a file imported twice and a provider activity synced twice', async () => {
    const first = await store.insertActivity(sample({ fileHash: 'same' }));
    const again = await store.insertActivity(sample({ fileHash: 'same', title: 'Other' }));
    expect(again).toEqual({ activity: first.activity, duplicate: true });

    const s1 = await store.insertActivity(sample({ source: 'strava', externalId: '42', fileHash: null }));
    const s2 = await store.insertActivity(sample({ source: 'strava', externalId: '42', fileHash: null }));
    expect(s2.duplicate).toBe(true);
    expect(s2.activity.id).toBe(s1.activity.id);
    // same id from a different source is a different activity
    const h = await store.insertActivity(sample({ source: 'apple_health', externalId: '42', fileHash: null }));
    expect(h.duplicate).toBe(false);
    expect(await store.listActivities()).toHaveLength(3);
  });

  it('updates and deletes, deleting the designs with the activity', async () => {
    const { activity } = await store.insertActivity(sample());
    await store.updateActivity(activity.id, { title: 'Renamed', type: 'trail_run' });
    const got = await store.getActivity(activity.id);
    expect(got).toMatchObject({ title: 'Renamed', type: 'trail_run' });
    expect(got!.updatedAt).toBeGreaterThan(activity.updatedAt);

    await store.saveComposition({ id: 'c1', activityId: activity.id, background: { kind: 'solid', colour: '#000000' }, elements: [] });
    await store.deleteActivity(activity.id);
    expect(await store.getActivity(activity.id)).toBeNull();
    expect(await store.getComposition('c1')).toBeNull();
  });

  it('saves designs and returns the latest one for an activity', async () => {
    const { activity } = await store.insertActivity(sample());
    const el = { id: 'e1', templateId: 'big-distance', x: 540, y: 960, scale: 1, rotation: 0, colour: '#FFFFFF', font: 'inter' as const };
    const c1 = await store.saveComposition({ id: 'c1', activityId: activity.id, background: { kind: 'solid', colour: '#000000' }, elements: [el] });
    expect(c1.elements).toEqual([el]);
    await store.saveComposition({ id: 'c2', activityId: activity.id, background: { kind: 'solid', colour: '#111111' }, elements: [] });
    const updated = await store.saveComposition({ ...c1, elements: [{ ...el, x: 100 }] });
    expect(updated.createdAt).toBe(c1.createdAt);
    expect(updated.updatedAt).toBeGreaterThan(c1.updatedAt);
    expect((await store.latestComposition(activity.id))!.id).toBe('c1');
    expect(await store.latestComposition('none')).toBeNull();
  });

  it('keeps settings with defaults, and wipe clears everything', async () => {
    expect(await store.getSettings()).toEqual({ units: 'mi', lastFont: null, lastColour: null });
    expect(await store.setSettings({ units: 'km', lastColour: '#FFFFFF' })).toEqual({ units: 'km', lastFont: null, lastColour: '#FFFFFF' });
    await store.insertActivity(sample());
    await store.wipe();
    expect(await store.listActivities()).toEqual([]);
    expect((await store.getSettings()).units).toBe('mi');
  });

  it('notifies subscribers on writes', async () => {
    const fn = jest.fn();
    const off = store.subscribe(fn);
    await store.insertActivity(sample());
    await store.setSettings({ units: 'km' });
    off();
    await store.insertActivity(sample());
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
