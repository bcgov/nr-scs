import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';
import type { ScalerAuthorizationListItem } from '@/services/scalerAuthorizations.service';

import AuthorizationsTab from './AuthorizationsTab';

const mockNavigate = vi.fn();
const mockListScalerAuthorizations = vi.fn();
const mockGetScalerAuthorizationLetter = vi.fn();
const mockGetRegionDistrictLov = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return Object.assign({}, actual, {
    useNavigate: () => mockNavigate,
  });
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    scalerAuthorizations: {
      listScalerAuthorizations: (...args: unknown[]) => mockListScalerAuthorizations(...args),
      getScalerAuthorizationLetter: (...args: unknown[]) => mockGetScalerAuthorizationLetter(...args),
    },
    lov: {
      getRegionDistrictLov: (...args: unknown[]) => mockGetRegionDistrictLov(...args),
    },
  },
}));

const renderTab = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AuthorizationsTab isActive scalerLicenceNo="1234" />
      </QueryClientProvider>
    </MemoryRouter>,
  );

const activeRow: ScalerAuthorizationListItem = {
  scalerAuthorizationId: 4001,
  authorizationEffectiveDate: '2025-01-15',
  authorizationExpiryDate: '2027-01-15',
  districtWideInd: 'N',
  orgUnitNo: 1234,
  authorizedSites: ['A12345', 'B67890'],
  status: 'Active',
  letterExists: true,
};

const expiredRow: ScalerAuthorizationListItem = {
  scalerAuthorizationId: 4002,
  authorizationEffectiveDate: '2018-01-15',
  authorizationExpiryDate: '2020-01-15',
  districtWideInd: 'Y',
  orgUnitNo: 1234,
  authorizedSites: [],
  status: 'Expired',
  letterExists: false,
};

describe('AuthorizationsTab', () => {
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

  beforeEach(() => {
    mockNavigate.mockReset();
    mockListScalerAuthorizations.mockReset();
    mockGetScalerAuthorizationLetter.mockReset();
    mockGetRegionDistrictLov.mockReset();
    mockGetRegionDistrictLov.mockResolvedValue([{ code: '1234', description: 'Cariboo' }]);
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('renders the authorization rows with links and resolved district name', async () => {
    mockListScalerAuthorizations.mockResolvedValue([activeRow, expiredRow]);

    renderTab();

    const authLink = await screen.findByRole('link', { name: '4001' });
    expect(authLink).toHaveAttribute('href', '/scaler-authorizations/view/4001');

    // District-wide row shows "All" sites; the other lists its sites individually.
    const table = screen.getByRole('table');
    expect(within(table).getByText('All')).toBeInTheDocument();

    // Each authorized site links to that site's record — legacy parity with
    // scalerAuthorizationList.jsp, and the only route an Industry Scaler has into a site record
    // (they hold SCALE_SITE_READ but not SCALE_SITE_QUERY, so the site register is closed to them).
    expect(within(table).getByRole('link', { name: 'A12345' })).toHaveAttribute(
      'href',
      '/scale-sites/view/A12345',
    );
    expect(within(table).getByRole('link', { name: 'B67890' })).toHaveAttribute(
      'href',
      '/scale-sites/view/B67890',
    );

    // Authorized district resolved via the region/district LOV.
    expect(screen.getAllByText('Cariboo').length).toBeGreaterThan(0);

    // Only letter-bearing rows expose a View Letter action button, matching the legacy list.
    expect(screen.getAllByRole('button', { name: /view letter/i })).toHaveLength(1);
  });

  describe('permission gating', () => {
    /**
     * An Industry Scaler holds SCALER_AUTHORIZATION_QUERY and SCALE_SITE_READ but no write
     * permission, so they read their authorizations and can follow a site link, with no Add control.
     */
    it('shows an Industry Scaler the site links but no write or letter controls', async () => {
      mockUseAuth.mockReturnValue({
        ...createAuthContextValue(),
        user: { roles: ['SCS_INDUSTRY_SCALER'], privileges: {}, clientNumbers: ['00001074'] },
      });
      mockListScalerAuthorizations.mockResolvedValue([activeRow]);

      renderTab();

      const table = await screen.findByRole('table');
      // The route into their authorized site's record.
      expect(within(table).getByRole('link', { name: 'A12345' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /add authorization/i }),
      ).not.toBeInTheDocument();
      // activeRow has a letter, but the role lacks SCALER_AUTHORIZATION_LETTER_VIEW.
      expect(screen.queryByRole('button', { name: /view letter/i })).not.toBeInTheDocument();
    });

    /**
     * Without SCALE_SITE_READ the site numbers stay visible, just not navigable.
     *
     * Expressed as a user holding no permission rather than by naming a role: every enabled column
     * holds `SCALE_SITE_READ`, and §D grants it to every column still to come, so any role named here
     * would eventually be enabled and silently turn this into an assertion about a link that *is*
     * rendered. (It was `SCS_CLERICAL` until that role was enabled, which is exactly what happened.)
     */
    it('renders site numbers as plain text when the user cannot read site records', async () => {
      mockUseAuth.mockReturnValue({
        ...createAuthContextValue(),
        user: { roles: [], privileges: {} },
      });
      mockListScalerAuthorizations.mockResolvedValue([activeRow]);

      renderTab();

      const table = await screen.findByRole('table');
      expect(within(table).getByText('A12345')).toBeInTheDocument();
      expect(within(table).queryByRole('link', { name: 'A12345' })).not.toBeInTheDocument();
    });
  });

  it('downloads the existing letter when one exists', async () => {
    mockListScalerAuthorizations.mockResolvedValue([activeRow]);
    mockGetScalerAuthorizationLetter.mockResolvedValue({
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      filename: 'letter-4001.pdf',
    });

    renderTab();

    const letterButton = await screen.findByRole('button', { name: /view letter/i });
    fireEvent.click(letterButton);

    await waitFor(() => {
      expect(mockGetScalerAuthorizationLetter).toHaveBeenCalledWith(4001, 'token');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not render a View Letter button when no letter exists', async () => {
    mockListScalerAuthorizations.mockResolvedValue([expiredRow]);

    renderTab();

    await screen.findByRole('link', { name: '4002' });

    expect(screen.queryByRole('button', { name: /view letter/i })).not.toBeInTheDocument();
  });

  it('filters rows by status client-side', async () => {
    mockListScalerAuthorizations.mockResolvedValue([activeRow, expiredRow]);

    renderTab();

    await screen.findByRole('link', { name: '4001' });

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Expired' } });

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: '4001' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: '4002' })).toBeInTheDocument();
  });

  it('shows an empty state when the scaler has no authorizations', async () => {
    mockListScalerAuthorizations.mockResolvedValue([]);

    renderTab();

    expect(await screen.findByText(/no authorizations found/i)).toBeInTheDocument();
  });

  it('shows an error state when the list request fails', async () => {
    mockListScalerAuthorizations.mockRejectedValue(new Error('boom'));

    renderTab();

    expect(await screen.findByText(/could not load authorizations/i)).toBeInTheDocument();
  });

  it('navigates to the create page prefilled with the scaler licence', async () => {
    mockListScalerAuthorizations.mockResolvedValue([]);

    renderTab();

    const addButton = await screen.findByRole('button', { name: /add authorization/i });
    fireEvent.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scaler-authorizations/create?scalerLicenceNo=1234');
  });
});
