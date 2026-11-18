import { useEffect } from 'react';

import { useSettings, useStore } from '@/data';
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
  const { data: settings } = useSettings();
  const enabled = settings.healthConnected && healthAvailable();

  useEffect(() => {
    if (!enabled) return;
    return onWorkoutsChanged(() => {
      syncHealthLatest(store).catch(() => {});
    });
  }, [enabled, store]);

  return null;
}
