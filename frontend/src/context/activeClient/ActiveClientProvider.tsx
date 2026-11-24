import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setActiveClientForHeader } from '@/context/auth/activeClientHeader';
import { useAuth } from '@/context/auth/useAuth';

import { ActiveClientContext } from './ActiveClientContext';
import { readStoredActiveClient, writeStoredActiveClient } from './activeClientStorage';

/**
 * Tracks which forest client is in scope, mirrors it into the API request headers, and clears cached
 * data when it changes.
 *
 * The stored selection is read synchronously at mount, not in an effect: the resolved client is
 * undefined until entitlements load anyway, so it is in hand before any request can carry the header —
 * otherwise the first requests after a refresh would go out scoped to the default.
 */
export const ActiveClientProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Sorted so "first" means lowest-numbered, not token order. Client numbers are zero-padded, so a
  // string sort orders them numerically — the same reasoning the backend's resolver uses.
  const clientNumbers = useMemo(
    () => [...(user?.clientNumbers ?? [])].sort((a, b) => a.localeCompare(b)),
    [user?.clientNumbers],
  );

  const [selected, setSelected] = useState<string | undefined>(readStoredActiveClient);

  // Only honoured while still entitled: entitlements change between sessions (a client revoked, a
  // different user in the same tab), and a stale value must fall back rather than be sent and refused.
  const activeClient = useMemo(() => {
    if (clientNumbers.length === 0) {
      return undefined;
    }
    return selected && clientNumbers.includes(selected) ? selected : clientNumbers[0];
  }, [clientNumbers, selected]);

  useEffect(() => {
    setActiveClientForHeader(activeClient);
  }, [activeClient]);

  const setActiveClient = useCallback(
    (clientNumber: string) => {
      // Not entitled: keep the current scope rather than leave the UI in a state every request 403s.
      if (!clientNumbers.includes(clientNumber) || clientNumber === activeClient) {
        return;
      }

      // Header first, so refetches triggered by the reset below already carry the new client.
      setActiveClientForHeader(clientNumber);
      setSelected(clientNumber);
      writeStoredActiveClient(clientNumber);

      // reset, not invalidate: every cached response was scoped to the old client, so the data is
      // dropped rather than left on screen while refetches land.
      void queryClient.resetQueries();
    },
    [activeClient, clientNumbers, queryClient, setSelected],
  );

  const value = useMemo(
    () => ({
      clientNumbers,
      activeClient,
      setActiveClient,
      canSwitch: clientNumbers.length > 1,
    }),
    [activeClient, clientNumbers, setActiveClient],
  );

  return <ActiveClientContext.Provider value={value}>{children}</ActiveClientContext.Provider>;
};

export default ActiveClientProvider;
