// @vitest-environment happy-dom

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import ActivityTab from './ActivityTab';

const mockGetScaleSiteActivitySummary = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    scaleSiteActivity: {
      getScaleSiteActivitySummary: (...args: unknown[]) => mockGetScaleSiteActivitySummary(...args),
    },
  },
  BackendApiConfig: { BASE: '/api', TOKEN: async () => null },
}));

describe('ActivityTab', () => {
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

  const renderTab = (isActive = true, scaleSiteIdNmbr = 'SITE001') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ActivityTab isActive={isActive} scaleSiteIdNmbr={scaleSiteIdNmbr} />
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockGetScaleSiteActivitySummary.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('renders the activity metrics on success', async () => {
    mockGetScaleSiteActivitySummary.mockResolvedValue({
      scaleSiteIdNmbr: 'SITE001',
      lastScaleDate: '2024-09-15',
      numberOfSamples: 42,
      sampleVolume: 1234.56,
      scaledVolume: 98765.43,
    });

    renderTab();

    expect(await screen.findByText('2024-09-15')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('1234.56')).toBeInTheDocument();
    expect(screen.getByText('98765.43')).toBeInTheDocument();
    expect(screen.getByText('Date of Last Return:')).toBeInTheDocument();
  });

  it('renders em-dashes when metrics are null', async () => {
    mockGetScaleSiteActivitySummary.mockResolvedValue({
      scaleSiteIdNmbr: 'SITE001',
      lastScaleDate: null,
      numberOfSamples: null,
      sampleVolume: null,
      scaledVolume: null,
    });

    renderTab();

    await waitFor(() => {
      expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    });
  });

  it('shows an error notification when the request fails', async () => {
    mockGetScaleSiteActivitySummary.mockRejectedValue(new Error('Boom'));

    renderTab();

    expect(await screen.findByText('Activity summary unavailable.')).toBeInTheDocument();
  });

  it('does not call the API when the tab is inactive', () => {
    renderTab(false);

    expect(mockGetScaleSiteActivitySummary).not.toHaveBeenCalled();
  });
});
