import { useEffect } from 'react';

import { useSettings, useStore } from '@/data';
import { useToast } from '@/ui';
import { healthAvailable, onWorkoutsChanged } from '@/integrations/health/healthkit';

import { syncHealthLatest } from './sources';

/**
 * Keeps Apple Health in sync without pull-to-refresh: when a workout is saved
 * (by the Watch, Strava, any app), HealthKit calls this observer, in the
 * foreground or after waking the app in the background, and we import it.
 * Renders nothing.
 */
export function HealthObserver() {
  const store = useStore();
  const toast = useToast();
  const { data: settings } = useSettings();
  const enabled = settings.healthConnected && healthAvailable();

  useEffect(() => {
    if (!enabled) return;
    return onWorkoutsChanged(() => {
      syncHealthLatest(store)
        .then((r) => {
          if (r.added) toast(r.added === 1 ? 'New workout from Apple Health' : `${r.added} new workouts from Apple Health`);
        })
        .catch(() => {});
    });
  }, [enabled, store, toast]);

  return null;
}
