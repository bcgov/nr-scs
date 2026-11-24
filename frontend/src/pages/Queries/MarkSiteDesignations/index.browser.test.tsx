// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAllPersistentState } from '@/hooks/usePersistentState';

import '../../../config/tests/setup-env';
import type { AuthContextType } from '../../../context/auth/AuthContext';
import * as authModule from '../../../context/auth/useAuth';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';

import MarkSiteDesignationSearchPage from './index';

const mockSearchByTimberMark = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  BackendApiConfig: {
    BASE: '',
    VERSION: '0',
    WITH_CREDENTIALS: true,
    CREDENTIALS: 'include',
    TOKEN: async () => '',
  },
  default: {
    markSiteDesignation: {
      searchMarkSiteDesignationsByTimberMark: (...args: unknown[]) => mockSearchByTimberMark(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

describe('MarkSiteDesignationSearchPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const createAuthContextValue = (): AuthContextType => ({
    // An administrator, so permission-gated controls render: these tests are about the
    // component behaviour, not authorization (see permissions.unit.test.ts for that).
    user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  const renderPage = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MarkSiteDesignationSearchPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    // The page persists the last-searched mark (usePersistentState → a module-level Map) and auto-restores
    // + auto-searches it on mount. Reset that store so tests don't leak a searched mark into each other.
    clearAllPersistentState();
    mockSearchByTimberMark.mockReset();
    mockNavigate.mockReset();
    mockSearchByTimberMark.mockResolvedValue([
      {
        haulingMarkAuthorizationId: 12345,
        timberMark: 'TM123',
        effectiveDate: '2025-01-01',
        expiryDate: '2025-12-31',
        orgUnitName: 'Cariboo Region',
      },
    ]);
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  // Unmount the previous render so leftover inputs don't shadow the current test's DOM assertions.
  afterEach(() => {
    cleanup();
  });

  it('validates that timber mark is required', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('Timber Mark is required.')).toBeTruthy();
    });
    expect(mockSearchByTimberMark).not.toHaveBeenCalled();
  });

  it('searches and renders result rows from the mark-site-designations endpoint', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/Timber Mark/i), {
      target: { value: 'tm123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockSearchByTimberMark).toHaveBeenCalledWith('TM123', 'token');
    });

    await waitFor(() => {
      expect(screen.getByText('12345')).toBeTruthy();
      expect(screen.getByText('TM123')).toBeTruthy();
      expect(screen.getByText('Cariboo Region')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create MSD' }));
    expect(mockNavigate).toHaveBeenCalledWith('/mark-site-designations/create');
  });

  it('auto-searches and prefills when a timber mark is supplied in the URL', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/mark-site-designations?timberMark=tm123']}>
          <MarkSiteDesignationSearchPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockSearchByTimberMark).toHaveBeenCalledWith('TM123', 'token');
    });

    expect((screen.getByLabelText(/Timber Mark/i) as HTMLInputElement).value).toBe('TM123');
  });

  it('does not search when the URL timber mark contains a wildcard, and shows the error', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/mark-site-designations?timberMark=AB%25']}>
          <MarkSiteDesignationSearchPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/contain the % character/i)).toBeTruthy();
    });
    expect(mockSearchByTimberMark).not.toHaveBeenCalled();
  });

  it('rejects a typed % wildcard in the form and does not search', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/Timber Mark/i), { target: { value: 'AB%' } });
    expect((screen.getByLabelText(/Timber Mark/i) as HTMLInputElement).value).toBe('AB%');
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText(/contain the % character/i)).toBeTruthy();
    });
    expect(mockSearchByTimberMark).not.toHaveBeenCalled();
  });

  it('rejects a typed _ wildcard in the form and does not search', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/Timber Mark/i), { target: { value: 'AB_' } });
    expect((screen.getByLabelText(/Timber Mark/i) as HTMLInputElement).value).toBe('AB_');
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText(/contain the _ character/i)).toBeTruthy();
    });
    expect(mockSearchByTimberMark).not.toHaveBeenCalled();
  });
});
