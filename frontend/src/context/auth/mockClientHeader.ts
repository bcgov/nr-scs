import { env } from '@/env';

/**
 * Dev-only bridge that forwards the mock user's impersonated forest client number(s) to the backend
 * so local API client-scoping mirrors the client chosen in the frontend mock picker.
 *
 * The value is set by {@link MockAuthProvider} and read by the shared request-header builders.
 * Outside mock mode (real auth / production build) nothing is emitted, so real requests are never
 * affected. The backend only honours this header when running in local/dev mock mode (see the
 * backend `MockRequestFilter`).
 */
export const MOCK_CLIENT_HEADER = 'X-Mock-Client';

let currentMockClientNumbers: string[] | undefined;

/** Mirror the current mock client number(s) here so the request layer can forward them. `undefined` clears it. */
export const setMockClientForHeader = (clientNumbers: string[] | undefined): void => {
  currentMockClientNumbers = clientNumbers;
};

const isMockMode = (): boolean => import.meta.env.DEV && env.VITE_MOCK_USER === 'true';

/**
 * The mock-client header to merge into an API request, or an empty object when not applicable
 * (not mock mode, or no client selected — i.e. an internal, unrestricted mock user).
 */
export const mockClientHeader = (): Record<string, string> => {
  if (!isMockMode() || !currentMockClientNumbers || currentMockClientNumbers.length === 0) {
    return {};
  }
  return { [MOCK_CLIENT_HEADER]: currentMockClientNumbers.join(',') };
};
