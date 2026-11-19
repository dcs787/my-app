import { useEffect } from 'react';

import { useStore } from '@/data';
import type { Activity } from '@/domain/types';
import { fetchStravaDetails } from '@/integrations/strava/client';
import { stravaConfigured } from '@/integrations/strava/config';
import { stravaTokens } from '@/integrations/strava/tokens';

/** Activities asked about this session, so a failure (offline, not connected) isn't retried on every render. */
const asked = new Set<string>();

/**
 * When a Strava activity is opened for the first time, fetch its laps and
 * Strava's splits in the background. The screen updates when they're saved.
 */
export function useStravaDetails(activity: Activity | null | undefined) {
  const store = useStore();
  useEffect(() => {
    const a = activity;
    if (!a || a.source !== 'strava' || !a.externalId || a.detailsAt || asked.has(a.id) || !stravaConfigured()) return;
    asked.add(a.id);
    fetchStravaDetails(store, stravaTokens, a).catch(() => {
      // offline, rate-limited or disconnected: the summary is still there; try again next launch
    });
  }, [activity, store]);
}
