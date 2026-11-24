import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';
import type { AuthorizedScalerSummary } from '@/services/scaleSiteAuthorizedScalers.service';

import AuthorizedScalersTab from './AuthorizedScalersTab';

const mockNavigate = vi.fn();
const mockGetScaleSiteAuthorizedScalers = vi.fn();

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
    scaleSiteAuthorizedScalers: {
      getScaleSiteAuthorizedScalers: (...args: unknown[]) => mockGetScaleSiteAuthorizedScalers(...args),
    },
  },
}));

const renderTab = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AuthorizedScalersTab isActive scaleSiteIdNmbr="A12345" />
      </QueryClientProvider>
    </MemoryRouter>,
  );

const activeScaler: AuthorizedScalerSummary = {
  scalerAuthorizationId: 4001,
  scalerLicenceNo: '1234',
  clientName: 'DOE, JANE',
  status: 'Active',
  scalerAppointmentTypes: 'Owner, Acting',
  authorizationEffectiveDate: '2025-01-15',
  authorizationExpiryDate: '2027-01-15',
  // scs_authorized_scalers_vw already decodes the indicator to Yes/No.
  districtWideInd: 'No',
};

const expiredScaler: AuthorizedScalerSummary = {
  scalerAuthorizationId: 4002,
  scalerLicenceNo: '5678',
  clientName: 'SMITH, JOHN',
  status: 'Expired',
  scalerAppointmentTypes: 'Owner',
  authorizationEffectiveDate: '2018-01-15',
  authorizationExpiryDate: '2020-01-15',
  districtWideInd: 'Yes',
};

describe('AuthorizedScalersTab', () => {
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
    mockGetScaleSiteAuthorizedScalers.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('renders rows with links to the authorization and scaler records', async () => {
    mockGetScaleSiteAuthorizedScalers.mockResolvedValue([activeScaler, expiredScaler]);

    renderTab();

    const authLink = await screen.findByRole('link', { name: '4001' });
    expect(authLink).toHaveAttribute('href', '/scaler-authorizations/view/4001');

    const licenceLink = screen.getByRole('link', { name: '1234' });
    expect(licenceLink).toHaveAttribute('href', '/scalers/view/1234');

    const table = screen.getByRole('table');
    expect(within(table).getByText('DOE, JANE')).toBeInTheDocument();
    expect(within(table).getByText('Owner, Acting')).toBeInTheDocument();
    // District-wide indicator rendered as Yes/No.
    expect(within(table).getByText('Yes')).toBeInTheDocument();
  });

  it('filters rows by status client-side', async () => {
    mockGetScaleSiteAuthorizedScalers.mockResolvedValue([activeScaler, expiredScaler]);

    renderTab();

    await screen.findByRole('link', { name: '4001' });

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Expired' } });

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: '4001' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: '4002' })).toBeInTheDocument();
  });

  it('shows an empty state when the scale site has no authorized scalers', async () => {
    mockGetScaleSiteAuthorizedScalers.mockResolvedValue([]);

    renderTab();

    expect(await screen.findByText(/no authorized scalers found/i)).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    mockGetScaleSiteAuthorizedScalers.mockRejectedValue(new Error('boom'));

    renderTab();

    expect(await screen.findByText(/could not load authorized scalers/i)).toBeInTheDocument();
  });

  it('navigates to the scaler authorization create page from Add Authorization', async () => {
    mockGetScaleSiteAuthorizedScalers.mockResolvedValue([]);

    renderTab();

    const addButton = await screen.findByRole('button', { name: /add authorization/i });
    fireEvent.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scaler-authorizations/create');
  });
});
