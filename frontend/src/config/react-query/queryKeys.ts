/**
 * Shared React Query keys — for resources read on one screen and changed on another, where the
 * writer has to invalidate what the reader cached.
 *
 * Deliberately a leaf module with no imports: a key is needed by pages that mock the service layer
 * in their tests, so it must not drag `services/APIs` (and axios with it) into the module graph.
 */

/**
 * The Home/welcome summary. Read by the Landing page; changed by the System maintenance screen,
 * which edits the WMSG system setting the summary renders as "Current News".
 */
export const WELCOME_SUMMARY_QUERY_KEY = ['welcome-summary'] as const;
