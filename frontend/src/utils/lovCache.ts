import type { QueryClient } from '@tanstack/react-query';

/**
 * Process-wide cache for the small list-of-values arrays behind the app's dropdowns, plus the
 * helpers that drop them again.
 *
 * This lives here rather than inside `useLovOptions` so it stays a leaf module: the purge helper
 * must be importable by a maintenance screen without dragging the hook (and every test double of
 * it) along with it.
 */
const lovCache = new Map<string, unknown[]>();
const lovInFlight = new Map<string, Promise<unknown[]>>();
const storagePrefix = 'lov-cache:';

/** Internal access for {@link useLovOptions}; not part of the public surface. */
export const lovCacheInternals = { lovCache, lovInFlight, storagePrefix };

/**
 * Canonical names for the LOVs a maintenance screen can invalidate. Shared so the reader (the
 * dropdown) and the writer (the screen that purges it) cannot drift apart — they were two loose
 * string literals, and a rename on one side would silently restore the stale-dropdown bug.
 */
export const GRADING_CODE_APPOINTMENT_TYPE_LOV = 'grading-code-appointment-type-lov';
export const SCALER_TRAINING_TYPE_LOV = 'scaler-training-type-lov';
export const APPOINTMENT_TYPE_LOV = 'appointment-type-lov';

/** React Query key for a LOV read through `useQuery`. */
export const lovQueryKey = (name: string) => ['lov', name] as const;

/**
 * Drop a cached LOV so the next consumer refetches it from the API.
 *
 * The cache is deliberately long-lived — a module-level Map plus `sessionStorage`, no TTL — which
 * is right for reference data but wrong the moment a maintenance screen edits that reference data.
 * Without this the dropdown serves the pre-mutation list for the rest of the browser session, and
 * a full page reload does NOT help (sessionStorage outlives the reload).
 */
export function clearLovCache(name: string): void {
  lovCache.delete(name);
  lovInFlight.delete(name);
  try {
    sessionStorage.removeItem(`${storagePrefix}${name}`);
  } catch {
    // ignore storage errors
  }
}

/**
 * Purge every client-side copy of a LOV after the maintenance screen that owns it has mutated it.
 *
 * Two independent caches hold these lists and both outlive the mutation:
 *  - React Query (`['lov', name]`), read by the Scaler tabs. `removeQueries`, not
 *    `invalidateQueries`: the global defaults set `refetchOnMount: false`, so an invalidated but
 *    still-cached query is NOT refetched when the tab remounts. Removing the entry leaves nothing
 *    to serve, which forces the fetch.
 *  - The Map + `sessionStorage` cache above, read by the Scaler create/edit form.
 *
 * The backend Caffeine cache is evicted server-side by the mutating service (see
 * `ValidLicenceAttributeService`); this covers only the browser's own copies.
 */
export function purgeLovCache(queryClient: QueryClient, name: string): void {
  queryClient.removeQueries({ queryKey: lovQueryKey(name) });
  clearLovCache(name);
}
