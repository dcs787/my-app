import { useCallback, useState } from 'react';

import { useSettings, useStore } from '@/data';
import type { Settings, Store } from '@/data/store';
import { deauthorize, StravaAuthError, StravaRateLimitError, syncStrava } from '@/integrations/strava/client';
import { STRAVA, stravaConfigured } from '@/integrations/strava/config';
import { signInWithStrava, StravaCancelled } from '@/integrations/strava/connect';
import { stravaTokens } from '@/integrations/strava/tokens';

/** Re-read a few days before the last sync: Strava filters by start time, and uploads can arrive late. */
const STRAVA_OVERLAP_MS = 3 * 86_400_000;

export type SyncSummary = { added: number; merged: number };

export async function syncStravaNow(store: Store, settings: Settings): Promise<SyncSummary> {
  const since = settings.stravaSyncedAt
    ? settings.stravaSyncedAt - STRAVA_OVERLAP_MS
    : Date.now() - STRAVA.backfillDays * 86_400_000;
  const r = await syncStrava(store, stravaTokens, since / 1000);
  await store.setSettings({ stravaSyncedAt: Date.now() });
  return { added: r.added, merged: r.merged };
}

/** A friendly sentence for a sync error. */
export function syncErrorMessage(e: unknown): string {
  if (e instanceof StravaCancelled) return '';
  if (e instanceof StravaRateLimitError || e instanceof StravaAuthError) return e.message;
  if (e instanceof Error && /Network|fetch/i.test(e.message)) return 'You’re offline. Try again when connected.';
  return e instanceof Error && e.message.length < 120 ? e.message : 'Sync failed. Try again.';
}

export function describeSync(s: SyncSummary): string {
  if (!s.added && !s.merged) return 'Up to date';
  const parts = [];
  if (s.added) parts.push(`${s.added} new`);
  if (s.merged) parts.push(`${s.merged} matched to activities you already had`);
  return parts.join(', ');
}

/** Strava connection state and actions for screens. */
export function useStrava() {
  const store = useStore();
  const { data: settings } = useSettings();
  const [busy, setBusy] = useState<'connect' | 'sync' | 'disconnect' | null>(null);

  const run = useCallback(
    async <T,>(kind: NonNullable<typeof busy>, fn: () => Promise<T>): Promise<T> => {
      setBusy(kind);
      try {
        return await fn();
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  return {
    configured: stravaConfigured(),
    connected: settings.stravaAthlete != null,
    athlete: settings.stravaAthlete,
    syncedAt: settings.stravaSyncedAt,
    busy,
    connect: () =>
      run('connect', async () => {
        const tokens = await signInWithStrava();
        await stravaTokens.set(tokens);
        await store.setSettings({ stravaAthlete: tokens.athleteName, stravaSyncedAt: null });
        return syncStravaNow(store, { ...settings, stravaSyncedAt: null });
      }),
    sync: () => run('sync', () => syncStravaNow(store, settings)),
    /** Revokes access and deletes activities that came from Strava, as Strava's terms require. */
    disconnect: () =>
      run('disconnect', async () => {
        await deauthorize(stravaTokens);
        const removed = await store.deleteBySource('strava');
        await store.setSettings({ stravaAthlete: null, stravaSyncedAt: null });
        return removed;
      }),
  };
}

export function timeAgo(ms: number | null, now = Date.now()): string {
  if (!ms) return 'never';
  const m = Math.round((now - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
