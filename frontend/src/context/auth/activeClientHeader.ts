/**
 * Forwards the client a multi-client external user is currently acting as to the backend, so API
 * data scoping follows the header profile panel's client switcher.
 *
 * Unlike {@link mockClientHeader} this is **not** dev-only: it is how the switcher works in
 * production. It is safe to send because it cannot widen access — the backend takes entitlement from
 * the token's FAM groups and treats this header purely as a selection among them, rejecting a value
 * that is not one of them (`ActiveClientResolver`).
 *
 * The value is mirrored here by {@link ActiveClientProvider} and read by the shared request-header
 * builders. Nothing is emitted for a user with no client scope (an internal user), so their requests
 * are unaffected.
 */
export const ACTIVE_CLIENT_HEADER = 'X-Active-Client';

let currentActiveClient: string | undefined;

/** Mirror the active client here so the request layer can forward it. `undefined` clears it. */
export const setActiveClientForHeader = (clientNumber: string | undefined): void => {
  currentActiveClient = clientNumber;
};

/** The active client currently being forwarded. Exported for tests and diagnostics. */
export const getActiveClientForHeader = (): string | undefined => currentActiveClient;

/**
 * The active-client header to merge into an API request, or an empty object when there is nothing to
 * send (internal user, or no client resolved yet). Omitting it is not a loss of scoping: the backend
 * falls back to the user's lowest-numbered client, which is the same default the provider picks.
 */
export const activeClientHeader = (): Record<string, string> =>
  currentActiveClient ? { [ACTIVE_CLIENT_HEADER]: currentActiveClient } : {};
