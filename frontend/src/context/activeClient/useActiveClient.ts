import { useContext } from 'react';

import { ActiveClientContext, type ActiveClientContextType } from './ActiveClientContext';

/**
 * The forest client currently in scope, and the means to switch it.
 * Returns the inert default (no clients, no switching) when rendered outside the provider.
 */
export const useActiveClient = (): ActiveClientContextType => useContext(ActiveClientContext);

export default useActiveClient;
