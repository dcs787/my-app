import type { Composition } from '@/domain/composition';
import { isSameWorkout, mergePatch } from '@/domain/merge';
import type { Activity } from '@/domain/types';

import { createEmitter, DEFAULT_SETTINGS, type Settings, type Store } from './store';

/** In-memory store: web previews and tests. Same behaviour as the SQLite store, nothing persisted. */
export function createMemoryStore(newId: () => string, now: () => number = Date.now): Store {
  let activities: Activity[] = [];
  let compositions: Composition[] = [];
  let settings: Settings = { ...DEFAULT_SETTINGS };
  const events = createEmitter();
  const byDate = (a: Activity, b: Activity) => b.startedAt - a.startedAt;

  return {
    async listActivities() {
      return [...activities].sort(byDate);
    },
    async getActivity(id) {
      return activities.find((a) => a.id === id) ?? null;
    },
    async insertActivity(input) {
      const dup = activities.find(
        (a) =>
          (input.fileHash && a.fileHash === input.fileHash) ||
          (input.externalId && a.source === input.source && a.externalId === input.externalId),
      );
      if (dup) return { activity: dup, duplicate: true };
      const twin = activities.find((a) => isSameWorkout(a, input));
      if (twin) {
        const merged: Activity = { ...twin, ...mergePatch(twin, input), updatedAt: now() };
        activities = activities.map((a) => (a.id === twin.id ? merged : a));
        events.emit();
        return { activity: merged, duplicate: true, merged: true };
      }
      const t = now();
      const activity: Activity = { ...input, detailsAt: input.detailsAt ?? null, deviceName: input.deviceName ?? null, id: newId(), createdAt: t, updatedAt: t };
      activities.push(activity);
      events.emit();
      return { activity, duplicate: false };
    },
    async updateActivity(id, patch) {
      activities = activities.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now() } : a));
      events.emit();
    },
    async deleteActivity(id) {
      activities = activities.filter((a) => a.id !== id);
      compositions = compositions.filter((c) => c.activityId !== id); // cascade, like the SQL schema
      events.emit();
    },
    async deleteBySource(source) {
      const gone = new Set(activities.filter((a) => a.source === source).map((a) => a.id));
      activities = activities.filter((a) => !gone.has(a.id));
      compositions = compositions.filter((c) => !gone.has(c.activityId));
      if (gone.size) events.emit();
      return gone.size;
    },
    async deleteByExternalIds(source, ids) {
      const want = new Set(ids);
      const gone = new Set(activities.filter((a) => a.source === source && a.externalId && want.has(a.externalId)).map((a) => a.id));
      activities = activities.filter((a) => !gone.has(a.id));
      compositions = compositions.filter((c) => !gone.has(c.activityId));
      if (gone.size) events.emit();
      return gone.size;
    },
    async getComposition(id) {
      return compositions.find((c) => c.id === id) ?? null;
    },
    async latestComposition(activityId) {
      return (
        compositions.filter((c) => c.activityId === activityId).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
      );
    },
    async saveComposition(c) {
      const existing = compositions.find((x) => x.id === c.id);
      const t = now();
      const saved: Composition = { ...c, createdAt: existing?.createdAt ?? t, updatedAt: t };
      compositions = [...compositions.filter((x) => x.id !== c.id), saved];
      events.emit();
      return saved;
    },
    async getSettings() {
      return settings;
    },
    async setSettings(patch) {
      settings = { ...settings, ...patch };
      events.emit();
      return settings;
    },
    async wipe() {
      activities = [];
      compositions = [];
      settings = { ...DEFAULT_SETTINGS };
      events.emit();
    },
    subscribe: events.subscribe,
  };
}
