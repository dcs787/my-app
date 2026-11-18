import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Activity } from '@/domain/types';

import { createStore } from './createStore';
import { DEFAULT_SETTINGS, type Settings, type Store } from './store';

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    createStore().then(
      (s) => alive && setStore(s),
      (e: Error) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (error) throw error; // surfaces in the route's error boundary
  if (!store) return <>{fallback}</>;
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}

/** Load a value from the store and reload it after every write. */
function useLive<T>(load: (s: Store) => Promise<T>, initial: T): { data: T; loading: boolean } {
  const store = useStore();
  const [state, setState] = useState<{ data: T; loading: boolean }>({ data: initial, loading: true });

  useEffect(() => {
    let alive = true;
    const run = () =>
      load(store).then((data) => {
        if (alive) setState({ data, loading: false });
      });
    run();
    const off = store.subscribe(run);
    return () => {
      alive = false;
      off();
    };
  }, [store, load]);

  return state;
}

export function useActivities() {
  const load = useCallback((s: Store) => s.listActivities(), []);
  return useLive<Activity[]>(load, []);
}

export function useActivity(id: string | undefined) {
  const load = useCallback((s: Store) => (id ? s.getActivity(id) : Promise.resolve(null)), [id]);
  return useLive<Activity | null>(load, null);
}

export function useSettings() {
  const load = useCallback((s: Store) => s.getSettings(), []);
  return useLive<Settings>(load, DEFAULT_SETTINGS);
}
