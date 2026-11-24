import type { NotificationContent } from './NotificationContext';

/**
 * Bridges the React `NotificationProvider` to non-React modules (e.g. the global axios interceptor)
 * so they can surface toasts. `NotificationProvider` registers its `display` function on mount; code
 * outside the React tree calls {@link notify}. No-op until a provider is mounted.
 */
let notifier: ((content: NotificationContent) => void) | null = null;

export const setGlobalNotifier = (fn: ((content: NotificationContent) => void) | null): void => {
  notifier = fn;
};

export const notify = (content: NotificationContent): void => {
  notifier?.(content);
};
