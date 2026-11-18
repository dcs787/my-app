import type { HealthWorkout } from './map';

// Apple Health only exists on iPhone.
export const healthAvailable = () => false;
export async function requestHealthAccess(): Promise<void> {
  throw new Error('Apple Health is only available on iPhone.');
}
export type HealthBatch = { workouts: HealthWorkout[]; deletedIds: string[]; anchor: string };
export async function fetchWorkouts(): Promise<HealthBatch> {
  throw new Error('Apple Health is only available on iPhone.');
}
export async function enableBackgroundSync(): Promise<void> {}
export async function disableBackgroundSync(): Promise<void> {}
export function onWorkoutsChanged(): () => void {
  return () => {};
}
