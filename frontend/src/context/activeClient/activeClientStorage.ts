/**
 * Persists the selected forest client across page reloads.
 *
 * `sessionStorage`, not `localStorage`, and cleared on logout: the selection must not outlive the login
 * it was made under, or the next user of the tab inherits someone else's scope. It is a preference, not
 * an entitlement — `ActiveClientProvider` only honours it while the token still grants that client.
 */
const STORAGE_KEY = 'scs.activeClient';

/** The stored selection, or undefined when absent or storage is unavailable (e.g. private mode). */
export const readStoredActiveClient = (): string | undefined => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

/** Remember the selection. Failures are ignored: the switcher still works for this page view. */
export const writeStoredActiveClient = (clientNumber: string): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, clientNumber);
  } catch {
    /* storage unavailable — the selection just will not survive a refresh */
  }
};

/** Forget the selection. Called on logout, alongside the other cached per-user state. */
export const clearStoredActiveClient = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear if storage is unavailable */
  }
};
