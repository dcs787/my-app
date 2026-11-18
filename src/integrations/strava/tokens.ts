import { AFTER_FIRST_UNLOCK, deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

import type { TokenStore } from './client';
import type { StravaTokens } from './types';

const KEY = 'strava.tokens';

/** Strava tokens live in the iOS Keychain, never in the SQLite database. */
export const stravaTokens: TokenStore = {
  async get() {
    const s = await getItemAsync(KEY);
    if (!s) return null;
    try {
      return JSON.parse(s) as StravaTokens;
    } catch {
      return null;
    }
  },
  async set(t) {
    await setItemAsync(KEY, JSON.stringify(t), { keychainAccessible: AFTER_FIRST_UNLOCK });
  },
  async clear() {
    await deleteItemAsync(KEY);
  },
};
