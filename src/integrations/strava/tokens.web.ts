import type { TokenStore } from './client';
import type { StravaTokens } from './types';

// Web is a preview target only: tokens are kept in memory for the session.
let current: StravaTokens | null = null;

export const stravaTokens: TokenStore = {
  async get() {
    return current;
  },
  async set(t) {
    current = t;
  },
  async clear() {
    current = null;
  },
};
