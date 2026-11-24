// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import { ActiveClientContext } from '@/context/activeClient/ActiveClientContext';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';
import { clearAllPersistentState } from '@/hooks/usePersistentState';

import ClientSearchPage from './index';

const mockSearchClients = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    client: {
      searchClients: (...args: unknown[]) => mockSearchClients(...args),
    },
  },
  BackendApiConfig: { BASE: '/api', TOKEN: async () => null },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

// Renders the client value it is given so the tests can assert what the page seeded the filter with.
vi.mock('@/components/core/ClientLocSearch', () => ({
  default: ({
    client,
    clientReadOnly,
    showSearchButton,
  }: {
    client: string;
    clientReadOnly?: boolean;
    showSearchButton?: boolean;
  }) => (
    <div
      data-testid="client-loc-search"
      data-readonly={String(Boolean(clientReadOnly))}
      data-search-button={String(Boolean(showSearchButton))}
    >
      {client}
    </div>
  ),
}));

/**
 * The client filter on this page is a scope, not a preference, for an external user: the API overrides
 * the client number for them (`ClientService.searchClients`), so the form has to show the same client
 * the request will actually be scoped to — and must follow the switcher rather than the first client
 * held, or a multi-client user's form would contradict their own results.
 */
describe('ClientSearchPage — client filter scope', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const createAuthContextValue = (): AuthContextType => ({
    user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  const restrictedUser = (clientNumbers: string[]) =>
    mockUseAuth.mockReturnValue({
      ...createAuthContextValue(),
      user: {
        roles: ['SCS_INDUSTRY_SCALER'],
        privileges: {},
        clientNumbers,
        isClientRestricted: true,
      },
    });

  beforeEach(() => {
    clearAllPersistentState();
    mockSearchClients.mockReset();
    mockSearchClients.mockResolvedValue([]);
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  const renderPage = (activeClient?: string, clientNumbers: string[] = []) =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ActiveClientContext.Provider
          value={{
            clientNumbers,
            activeClient,
            setActiveClient: vi.fn(),
            canSwitch: clientNumbers.length > 1,
          }}
        >
          <MemoryRouter>
            <ClientSearchPage />
          </MemoryRouter>
        </ActiveClientContext.Provider>
      </QueryClientProvider>,
    );

  it('seeds and locks the filter to the switched-to client, not the first one held', () => {
    restrictedUser(['00001074', '00002000', '00003111']);

    renderPage('00002000', ['00001074', '00002000', '00003111']);

    const clientField = screen.getByTestId('client-loc-search');
    expect(clientField).toHaveTextContent('00002000');
    expect(clientField).toHaveAttribute('data-readonly', 'true');
  });

  it('seeds a single-client user with their only client', () => {
    restrictedUser(['00001074']);

    renderPage('00001074', ['00001074']);

    expect(screen.getByTestId('client-loc-search')).toHaveTextContent('00001074');
  });

  it('leaves the filter free and editable for an internal user', () => {
    renderPage();

    const clientField = screen.getByTestId('client-loc-search');
    expect(clientField).toHaveTextContent('');
    expect(clientField).toHaveAttribute('data-readonly', 'false');
  });

  /**
   * The picker button opens ClientSearchModal, which renders this same page — offering it here would
   * recurse. Every other screen's client/loc row keeps its button, so this is the deliberate exception.
   */
  it('offers no client picker button, since this page is the picker', () => {
    renderPage();

    expect(screen.getByTestId('client-loc-search')).toHaveAttribute('data-search-button', 'false');
  });
});

/**
 * Regression: an invalid search submitted after a valid one used to leave the prior results on
 * screen with no error shown. TableResource only surfaces its error state when it has no content
 * to fall back to, so the previous run's rows kept displaying. The page now derives a `serverError`
 * from the failed mutation and renders an error banner with the backend's description.
 */
describe('ClientSearchPage — invalid search after a valid one', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    clearAllPersistentState();
    mockSearchClients.mockReset();
    mockUseAuth.mockReturnValue({
      user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn().mockResolvedValue('token'),
    } as AuthContextType);
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ClientSearchPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('replaces stale results with an error banner when the follow-up search fails', async () => {
    mockSearchClients.mockResolvedValueOnce([
      { client: '00012345/00', companyName: 'ABC Logging', lastName: 'Smith', firstName: 'John' },
    ]);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Search/ }));

    // Valid search: rows show, no error banner.
    await waitFor(() => expect(screen.getByText('00012345/00')).toBeInTheDocument());
    expect(screen.queryByText('Search failed')).not.toBeInTheDocument();

    // Follow-up search rejects with the backend's { message } error shape.
    mockSearchClients.mockRejectedValueOnce({
      response: { data: { message: 'Client number must be numeric.' } },
    });

    fireEvent.click(screen.getByRole('button', { name: /Search/ }));

    // The error banner appears with the backend description — the stale-results-instead-of-error fix.
    await waitFor(() => expect(screen.getByText('Search failed')).toBeInTheDocument());
    expect(screen.getByText('Client number must be numeric.')).toBeInTheDocument();

    // The prior run's rows are cleared so they can't be read as the failed query's results.
    expect(screen.queryByText('00012345/00')).not.toBeInTheDocument();
  });
});
