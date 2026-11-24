import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../config/tests/setup-env';
import type { AuthContextType } from '../../../context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '../../../context/auth/types';
import * as authModule from '../../../context/auth/useAuth';

import WorkBenchAdminPage from './index';

// Scaler section
const mockSearchScaler = vi.fn();
const mockRenewScaler = vi.fn();
const mockRemoveScaler = vi.fn();
// Scale-site section
const mockSearchScaleSite = vi.fn();
const mockRenewScaleSite = vi.fn();
const mockRemoveScaleSite = vi.fn();
// Mark-site section
const mockSearchMarkSite = vi.fn();
const mockRenewMarkSite = vi.fn();
const mockRemoveMarkSite = vi.fn();

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  BackendApiConfig: { BASE: '/api' },
  default: {
    scalerAuthorizations: {
      searchScalerAuthorizations: (...args: unknown[]) => mockSearchScaler(...args),
      renewScalerAuthorization: (...args: unknown[]) => mockRenewScaler(...args),
      removeScalerAuthorizationFromWorkbench: (...args: unknown[]) => mockRemoveScaler(...args),
    },
    scaleSiteAuthorizations: {
      searchScaleSiteAuthorizations: (...args: unknown[]) => mockSearchScaleSite(...args),
      renewScaleSiteAuthorization: (...args: unknown[]) => mockRenewScaleSite(...args),
      removeScaleSiteAuthorizationFromWorkbench: (...args: unknown[]) => mockRemoveScaleSite(...args),
    },
    markSiteDesignation: {
      searchMarkSiteDesignations: (...args: unknown[]) => mockSearchMarkSite(...args),
      renewMarkSiteDesignation: (...args: unknown[]) => mockRenewMarkSite(...args),
      removeMarkSiteDesignationFromWorkbench: (...args: unknown[]) => mockRemoveMarkSite(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

const scalerRow = {
  scalerAuthorizationId: 101,
  effectiveDate: '2025-01-01',
  expiryDate: '2026-01-15',
  scalerLicenceNumber: 'ABC1',
  scalerName: 'Jane Scaler',
};
const scaleSiteRow = {
  scaleSiteAuthorizationId: 202,
  effectiveDate: '2025-01-01',
  expiryDate: '2026-01-15',
  scaleSiteNumber: 'SS-9',
  scaleSiteName: 'North Site',
};
const markSiteRow = {
  haulingMarkAuthorizationId: 303,
  effectiveDate: '2025-01-01',
  expiryDate: '2026-01-15',
  timberMark: 'TM-77',
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WorkBenchAdminPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('WorkBenchAdminPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  /**
   * Signs the fixture in as `role`. This used to be `user: undefined`, which grants no permissions —
   * harmless while the page's actions were ungated, but once they name WORKBENCH_UPDATE /
   * WORKBENCH_CREATE it would hide every control and make the behavioural tests below pass for the
   * wrong reason. Same trap the RBAC note records for the client-scoped fixtures.
   */
  const signedInAs = (...roles: string[]) =>
    mockUseAuth.mockReturnValue({
      user: { roles, privileges: Object.fromEntries(roles.map((role) => [role, null])) },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn().mockResolvedValue('token'),
    } as AuthContextType);

  beforeEach(() => {
    [
      mockSearchScaler,
      mockRenewScaler,
      mockRemoveScaler,
      mockSearchScaleSite,
      mockRenewScaleSite,
      mockRemoveScaleSite,
      mockSearchMarkSite,
      mockRenewMarkSite,
      mockRemoveMarkSite,
      mockNavigate,
    ].forEach((m) => m.mockReset());

    // Default: only the scaler section has a row; the other two are empty.
    mockSearchScaler.mockResolvedValue([scalerRow]);
    mockSearchScaleSite.mockResolvedValue([]);
    mockSearchMarkSite.mockResolvedValue([]);
    mockRemoveScaler.mockResolvedValue(undefined);
    mockRemoveScaleSite.mockResolvedValue(undefined);
    mockRemoveMarkSite.mockResolvedValue(undefined);

    signedInAs(SYS_ADMIN_ROLE);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the three expiring-authorization sections with their rows', async () => {
    mockSearchScaleSite.mockResolvedValue([scaleSiteRow]);
    mockSearchMarkSite.mockResolvedValue([markSiteRow]);

    renderPage();

    // Section headings are always present.
    expect(screen.getByText('Expiring Scaler Authorizations')).toBeInTheDocument();
    expect(screen.getByText('Expiring Scale Site Authorizations')).toBeInTheDocument();
    expect(screen.getByText('Expiring Mark Site Designations')).toBeInTheDocument();

    // One row per section resolves in.
    expect(await screen.findByText('Jane Scaler')).toBeInTheDocument();
    expect(await screen.findByText('North Site')).toBeInTheDocument();
    expect(await screen.findByText('TM-77')).toBeInTheDocument();
  });

  it("surfaces 'Renew failed.' and does not navigate when the renew returns no new id", async () => {
    mockRenewScaler.mockResolvedValue({ newAuthorizationId: null });

    renderPage();
    // Wait for the scaler row (and thus its action buttons) to render.
    await screen.findByText('Jane Scaler');

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Renew failed.')).toBeInTheDocument();
    await waitFor(() => expect(mockRenewScaler).toHaveBeenCalledWith(101, 'token'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to the new record when the renew succeeds', async () => {
    mockRenewScaler.mockResolvedValue({ newAuthorizationId: 555 });

    renderPage();
    await screen.findByText('Jane Scaler');

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/scaler-authorizations/view/555'));
    expect(screen.queryByText('Renew failed.')).not.toBeInTheDocument();
  });

  it('skips remove when the confirm dialog is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));

    renderPage();
    await screen.findByText('Jane Scaler');

    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(mockRemoveScaler).not.toHaveBeenCalled();
  });

  it('removes the record when the confirm dialog is accepted', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));

    renderPage();
    await screen.findByText('Jane Scaler');

    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));

    await waitFor(() => expect(mockRemoveScaler).toHaveBeenCalledWith(101, 'token'));
  });

  /**
   * §A gives the Work Bench `CRU (ltd)` to the Check Scaler and the scaling managers but only
   * `R (ltd)` to the District Manager, Regional Manager and the two support columns. The route needs
   * WORKBENCH_QUERY alone, so the two actions carry their own verbs — otherwise a read-only holder gets
   * a Remove and an Add that 403.
   */
  describe('queue actions are gated', () => {
    it('gives a Check Scaler both Remove and Add — §A grants it CRU', async () => {
      signedInAs('SCS_CHECK_SCALER');

      renderPage();
      await screen.findByText('Jane Scaler');

      expect(screen.getByRole('button', { name: /Remove/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });

    /**
     * A role that reads the queues and may do nothing to them gets the column *gone*, not headed and
     * empty — the same rule the Contacts tab's Actions column follows.
     */
    it('drops the actions column entirely for a role holding neither verb', async () => {
      // SCS_CLERICAL is no longer a stand-in: the column is enabled, holds WORKBENCH_QUERY alone, and
      // is the §A `R (ltd)` case itself. Internal too, so nothing is withheld for a missing client
      // number — which would otherwise make this pass for the wrong reason.
      signedInAs('SCS_CLERICAL');

      renderPage();

      expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    });
  });
});
