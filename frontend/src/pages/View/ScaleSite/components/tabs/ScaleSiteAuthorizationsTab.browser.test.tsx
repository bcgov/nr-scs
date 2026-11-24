import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';
import type { ScaleSiteAuthorizationDetail } from '@/services/scaleSiteAuthorizations.service';

import ScaleSiteAuthorizationsTab from './ScaleSiteAuthorizationsTab';

const mockNavigate = vi.fn();
const mockListScaleSiteAuthorizations = vi.fn();
const mockGetScaleSiteAuthorizationLetter = vi.fn();

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
    scaleSiteAuthorizations: {
      listScaleSiteAuthorizations: (...args: unknown[]) => mockListScaleSiteAuthorizations(...args),
      getScaleSiteAuthorizationLetter: (...args: unknown[]) => mockGetScaleSiteAuthorizationLetter(...args),
    },
  },
}));

const renderTab = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ScaleSiteAuthorizationsTab isActive scaleSiteIdNmbr="A12345" />
      </QueryClientProvider>
    </MemoryRouter>,
  );

const activeRow: ScaleSiteAuthorizationDetail = {
  scaleSiteAuthorizationId: 7001,
  scaleSiteIdNmbr: 'A12345',
  authorizationEffectiveDate: '2025-01-15',
  authorizationExpiryDate: '2027-01-15',
  cancellationDate: null,
  cancellationReasonTxt: null,
  status: 'Active',
  letterExists: true,
};

const cancelledRow: ScaleSiteAuthorizationDetail = {
  scaleSiteAuthorizationId: 7002,
  scaleSiteIdNmbr: 'A12345',
  authorizationEffectiveDate: '2018-01-15',
  authorizationExpiryDate: '2020-01-15',
  cancellationDate: '2019-06-01',
  cancellationReasonTxt: 'Site closed',
  status: 'Cancelled',
  letterExists: false,
};

describe('ScaleSiteAuthorizationsTab', () => {
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
    mockListScaleSiteAuthorizations.mockReset();
    mockGetScaleSiteAuthorizationLetter.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('renders a View Letter button only for rows whose letter exists', async () => {
    mockListScaleSiteAuthorizations.mockResolvedValue([activeRow, cancelledRow]);

    renderTab();

    const authLink = await screen.findByRole('link', { name: '7001' });
    expect(authLink).toHaveAttribute('href', '/scale-site-authorizations/view/7001');

    // The cancelled row's cancellation columns render (scoped to the table; "Cancelled" is also a filter option).
    const table = screen.getByRole('table');
    expect(within(table).getByText('Site closed')).toBeInTheDocument();
    expect(within(table).getByText('Cancelled')).toBeInTheDocument();

    // Only the letter-bearing active row exposes a View Letter button, matching the legacy list.
    expect(screen.getAllByRole('button', { name: /view letter/i })).toHaveLength(1);
  });

  it('filters rows by status client-side', async () => {
    mockListScaleSiteAuthorizations.mockResolvedValue([activeRow, cancelledRow]);

    renderTab();

    await screen.findByRole('link', { name: '7001' });

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Cancelled' } });

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: '7001' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: '7002' })).toBeInTheDocument();
  });

  it('downloads the existing letter when one exists', async () => {
    mockListScaleSiteAuthorizations.mockResolvedValue([activeRow]);
    mockGetScaleSiteAuthorizationLetter.mockResolvedValue({
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      filename: 'letter-7001.pdf',
    });

    renderTab();

    const letterButton = await screen.findByRole('button', { name: /view letter/i });
    fireEvent.click(letterButton);

    await waitFor(() => {
      expect(mockGetScaleSiteAuthorizationLetter).toHaveBeenCalledWith(7001, 'token');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not render a View Letter button when no letter exists', async () => {
    mockListScaleSiteAuthorizations.mockResolvedValue([cancelledRow]);

    renderTab();

    await screen.findByRole('link', { name: '7002' });

    expect(screen.queryByRole('button', { name: /view letter/i })).not.toBeInTheDocument();
  });

  it('shows an empty state when the scale site has no authorizations', async () => {
    mockListScaleSiteAuthorizations.mockResolvedValue([]);

    renderTab();

    expect(await screen.findByText(/no authorizations found/i)).toBeInTheDocument();
  });

  it('shows an error state when the list request fails', async () => {
    mockListScaleSiteAuthorizations.mockRejectedValue(new Error('boom'));

    renderTab();

    expect(await screen.findByText(/could not load authorizations/i)).toBeInTheDocument();
  });

  it('navigates to the create page prefilled with the scale site number', async () => {
    mockListScaleSiteAuthorizations.mockResolvedValue([]);

    renderTab();

    const addButton = await screen.findByRole('button', { name: /add authorization/i });
    fireEvent.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scale-site-authorizations/create?scaleSiteIdNmbr=A12345');
  });
});
