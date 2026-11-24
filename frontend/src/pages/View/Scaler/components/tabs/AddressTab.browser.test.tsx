// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import AddressTab from './AddressTab';

const mockGetScalerAddress = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    scalers: {
      getScalerAddress: (...args: unknown[]) => mockGetScalerAddress(...args),
    },
  },
  BackendApiConfig: { BASE: '/api', TOKEN: async () => null },
}));

describe('AddressTab', () => {
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

  const renderTab = (isActive = true, scalerLicenceNo = '1234') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <AddressTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
      </QueryClientProvider>,
    );
  };

  const fullAddress = {
    scalerLicenceNo: '1234',
    company: 'Coastal Logging Ltd.',
    lastName: 'Smith',
    firstName: 'Jordan',
    businessPhone: '2505551234',
    homePhone: '2505555678',
    cellPhone: '2505559012',
    faxNumber: '2505553456',
    emailAddress: 'jordan.smith@example.com',
    address1: '123 Forest Road',
    address2: 'Suite 200',
    address3: null,
    city: 'Victoria',
    province: 'BC',
    country: 'Canada',
    postalCode: 'V8V 1A1',
  };

  beforeEach(() => {
    mockGetScalerAddress.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('renders contact info and address fields, formatting phone numbers', async () => {
    mockGetScalerAddress.mockResolvedValue(fullAddress);

    renderTab();

    expect(await screen.findByText('Coastal Logging Ltd.')).toBeInTheDocument();
    expect(screen.getByText('jordan.smith@example.com')).toBeInTheDocument();
    expect(screen.getByText('123 Forest Road')).toBeInTheDocument();
    expect(screen.getByText('V8V 1A1')).toBeInTheDocument();
    // 10-digit phones render in (XXX) XXX-XXXX form (legacy parity).
    expect(screen.getByText('(250) 555-1234')).toBeInTheDocument();
    expect(screen.getByText('(250) 555-9012')).toBeInTheDocument();
    // Both section headings are present.
    expect(screen.getByText('Contact Info')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
  });

  it('renders em dashes for missing values', async () => {
    mockGetScalerAddress.mockResolvedValue({ scalerLicenceNo: '1234' });

    renderTab();

    // Address Line 3 (and every other blank field) shows an em dash.
    const rows = await screen.findAllByText('—');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('shows the empty state when no address is returned', async () => {
    mockGetScalerAddress.mockResolvedValue(null);

    renderTab();

    expect(await screen.findByText('No address found for this scaler.')).toBeInTheDocument();
  });

  it('shows an error notification when the request fails', async () => {
    mockGetScalerAddress.mockRejectedValue(new Error('Boom'));

    renderTab();

    expect(await screen.findByText('Address unavailable.')).toBeInTheDocument();
  });

  it('does not call the API when the tab is inactive', () => {
    renderTab(false);

    expect(mockGetScalerAddress).not.toHaveBeenCalled();
  });

  it('does not call the API when the licence number is blank', () => {
    renderTab(true, '');

    expect(mockGetScalerAddress).not.toHaveBeenCalled();
  });
});
