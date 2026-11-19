import { randomUUID } from 'expo-crypto';
import { openDatabaseAsync } from 'expo-sqlite';

import { createSqliteStore, migrate } from './sqliteStore';
import type { Store } from './store';

/** On device: SQLite file in the app's private storage. */
export async function createStore(): Promise<Store> {
  const db = await openDatabaseAsync('mileprint.db');
  await migrate(db);
  return createSqliteStore(db, randomUUID);
}
