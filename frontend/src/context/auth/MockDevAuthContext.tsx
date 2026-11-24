import { createContext, type Dispatch, type SetStateAction, useContext } from 'react';

/**
 * The client(s) the developer is impersonating while using mock auth. When set, they scope the mock
 * user — sent to the backend via the {@code X-Mock-Client} header and used to lock client-restricted
 * search filters — mirroring a real client-restricted BCeID user. Cleared leaves the mock user
 * internal and unrestricted. Development convenience only; never present in real auth or production
 * builds.
 *
 * More than one may be set, standing in for a FAM user with several client-scoped groups: that is
 * what makes the production client switcher exercisable locally, since it only appears when the user
 * is entitled to more than one client.
 */
export type MockDevClient = {
  clientNumbers: string[];
};

/**
 * Developer-only controls exposed by {@link MockAuthProvider} so the header profile
 * panel can switch the mock user's roles and impersonated client at runtime.
 *
 * This context is provided ONLY in mock-auth mode (dev build + VITE_MOCK_USER=true).
 * In real-auth or production builds no provider mounts, so {@link useMockDevAuth}
 * returns `undefined` and any consumer should render nothing.
 */
export type MockDevAuthContextType = {
  roles: string[];
  setRoles: Dispatch<SetStateAction<string[]>>;
  client: MockDevClient | undefined;
  setClient: Dispatch<SetStateAction<MockDevClient | undefined>>;
};

export const MockDevAuthContext = createContext<MockDevAuthContextType | undefined>(undefined);

/**
 * Read the mock developer controls. Returns `undefined` when not running under the
 * mock auth provider (i.e. real auth or a production build), so callers can safely
 * bail out and render nothing.
 */
export const useMockDevAuth = (): MockDevAuthContextType | undefined => useContext(MockDevAuthContext);
