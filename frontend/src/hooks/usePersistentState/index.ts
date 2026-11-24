import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

/**
 * Module-level cache that survives component unmount/remount within the SPA session
 * (it resets on a full page reload). Used to keep query-page filters, sorting, and
 * results in place when the user navigates to a detail page and then back to the list.
 */
const store = new Map<string, unknown>();

/**
 * Like {@link useState}, but the value is cached under `key` so it is restored when the
 * component remounts (e.g. after navigating away and back). Not persisted across reloads.
 *
 * Pass `enabled = false` to opt out of caching for a given mount (e.g. when a query page is
 * rendered as a modal picker rather than a standalone route). When disabled, the hook ignores
 * the store on init and never writes to it, behaving exactly like {@link useState}. The flag is
 * read at mount for the initializer, so it is expected to be stable for a component instance.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  enabled: boolean = true,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() =>
    enabled && store.has(key) ? (store.get(key) as T) : initialValue,
  );

  useEffect(() => {
    if (enabled) {
      store.set(key, state);
    }
  }, [key, state, enabled]);

  return [state, setState];
}

/** Remove a cached value. Mainly useful for tests and explicit resets. */
export function clearPersistentState(key: string): void {
  store.delete(key);
}

/**
 * Drop every cached value. Call this on logout so one user's persisted query
 * filters/results are not shown to the next user in the same browser session.
 */
export function clearAllPersistentState(): void {
  store.clear();
}

export default usePersistentState;
