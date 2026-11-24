import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { AuthContext, type AuthContextType } from '@/context/auth/AuthContext';
import { PageTitleProvider } from '@/context/pageTitle/PageTitleProvider';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import type { FamLoginUser } from '@/context/auth/types';

type Options = Omit<RenderOptions, 'wrapper'> & {
  /**
   * Roles the signed-in user holds. Defaults to the system administrator so a component under test
   * renders its permission-gated parts; pass `[]` to assert what an unprivileged caller sees.
   */
  roles?: string[];
  /** Forest client numbers, which the client-scoped external roles need to resolve at all. */
  clientNumbers?: string[];
  /** Initial history entry, for components that read route state or params. */
  route?: string;
  /**
   * Route pattern to match `route` against, e.g. `/edit/:id`. Needed by any component calling
   * `useParams`: without a matching <Route> the params object is empty and the component behaves
   * as though it were asked for a record with no id.
   */
  path?: string;

  /**
   * Query client to render with. Pass your own when the assertion is about the cache itself —
   * seeding an entry before the render, or checking what a mutation did to it afterwards.
   * Omitted, each render gets a fresh throwaway client.
   */
  queryClient?: QueryClient;
};

/** A signed-in user carrying `roles`, shaped as `parseToken` would produce it. */
export const testUser = (roles: string[], clientNumbers: string[] = []): FamLoginUser => ({
  userName: 'TESTUSER',
  displayName: 'Test User',
  idpProvider: 'IDIR',
  roles,
  clientNumbers,
  // parseToken derives this from the client groups; keep the harness user shaped the same way.
  isClientRestricted: clientNumbers.length > 0,
  privileges: {},
});

export const testAuthContext = (user: FamLoginUser | undefined): AuthContextType => ({
  user,
  isLoggedIn: user !== undefined,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  userToken: vi.fn().mockResolvedValue('test-token'),
});

/**
 * Renders a component inside the providers the app's UI assumes: a router (for links), an auth
 * context (for permission gating) and the page-title context (which `PageTitle` reads). Without
 * them a component throws "must be used within a Provider" — a harness failure, not a defect.
 */
export const renderWithProviders = (
  ui: ReactElement,
  { roles = [SYS_ADMIN_ROLE], clientNumbers = [], route = '/', path, queryClient: providedClient, ...options }: Options = {},
): RenderResult => {
  // Retries off and no cache reuse: a failing query should surface its error state immediately
  // rather than after back-off, and state must not leak between tests.
  const queryClient =
    providedClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
    });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={testAuthContext(testUser(roles, clientNumbers))}>
        <MemoryRouter initialEntries={[route]}>
          <PageTitleProvider>
            {path ? <Routes><Route path={path} element={children} /></Routes> : children}
          </PageTitleProvider>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper, ...options });
};

/**
 * Finds a form control by its DOM id.
 *
 * Many Carbon inputs in this app are rendered with `labelText=""` and `hideLabel`, their caption
 * supplied by a separate `<FormLabel>`. That leaves them with no accessible name, so
 * `getByLabelText` silently matches something else — often a neighbouring icon button carrying an
 * `aria-label`. Addressing them by id is unambiguous.
 */
export const controlById = <T extends HTMLElement = HTMLInputElement>(
  container: HTMLElement,
  id: string,
): T => {
  const element = container.querySelector<T>(`#${id}`);
  if (!element) {
    throw new Error(`No form control with id "${id}" was rendered.`);
  }
  return element;
};
