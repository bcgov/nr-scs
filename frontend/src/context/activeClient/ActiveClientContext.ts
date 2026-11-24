import { createContext } from 'react';

export type ActiveClientContextType = {
  /** Every client the user is entitled to, lowest-numbered first. Empty for an internal user. */
  clientNumbers: string[];
  /** The client currently in scope, or undefined for an internal (unrestricted) user. */
  activeClient: string | undefined;
  /** Switch scope to one of {@link clientNumbers}. A value outside that set is ignored. */
  setActiveClient: (clientNumber: string) => void;
  /** Whether there is a choice to make — true only when the user holds more than one client. */
  canSwitch: boolean;
};

/**
 * The forest client an external user is currently acting as — exactly one at a time, so a user entitled
 * to several sees one client's data rather than a union.
 *
 * The default matches the backend's (`ActiveClientResolver`): lowest-numbered. They must agree, so scope
 * is the same whether or not a request carries the header.
 */
export const ActiveClientContext = createContext<ActiveClientContextType>({
  clientNumbers: [],
  activeClient: undefined,
  setActiveClient: () => {},
  canSwitch: false,
});
