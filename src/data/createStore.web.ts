import { randomUUID } from 'expo-crypto';

import { createMemoryStore } from './memoryStore';
import { sampleActivities } from './samples';
import type { Store } from './store';

/**
 * Web is only used for previews and screenshots (the product is the iPhone
 * app), so it runs on the memory store, seeded unless the URL has ?empty.
 */
export async function createStore(): Promise<Store> {
  const store = createMemoryStore(randomUUID);
  const empty = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('empty');
  if (!empty) {
    for (const a of sampleActivities()) await store.insertActivity(a);
  }
  return store;
}
