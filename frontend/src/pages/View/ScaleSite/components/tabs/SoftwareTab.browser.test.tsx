import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';
import type { ScaleSiteSoftwareSummary } from '@/services/scaleSiteSoftware.service';

import SoftwareTab from './SoftwareTab';

const mockGetScaleSiteSoftware = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    scaleSiteSoftware: {
      getScaleSiteSoftware: (...args: unknown[]) => mockGetScaleSiteSoftware(...args),
    },
  },
}));

const renderTab = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SoftwareTab isActive scaleSiteIdNmbr="A12345" />
      </QueryClientProvider>
    </MemoryRouter>,
  );

const rows: ScaleSiteSoftwareSummary[] = [
  {
    scalingProgram: 'HarvestPro',
    version: '12',
    revision: '3',
    returnType: 'Weight',
    returnCount: 42,
    lastUsedDate: '2026-06-30',
  },
  {
    scalingProgram: 'ScaleMaster',
    version: '8',
    revision: '1',
    returnType: 'Piece',
    returnCount: 7,
    lastUsedDate: '2026-05-15',
  },
];

describe('SoftwareTab', () => {
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
    mockGetScaleSiteSoftware.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('renders the software rows with the six columns', async () => {
    mockGetScaleSiteSoftware.mockResolvedValue(rows);

    renderTab();

    expect(await screen.findByText('HarvestPro')).toBeInTheDocument();
    expect(screen.getByText('ScaleMaster')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('2026-06-30')).toBeInTheDocument();

    expect(screen.getByText('Scaling Program')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('Revision')).toBeInTheDocument();
    expect(screen.getByText('Return Type')).toBeInTheDocument();
    expect(screen.getByText('Return Count')).toBeInTheDocument();
    expect(screen.getByText('Last Used Date')).toBeInTheDocument();

    // Read-only tab: no add/edit controls.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows an empty state when the scale site has no software', async () => {
    mockGetScaleSiteSoftware.mockResolvedValue([]);

    renderTab();

    expect(await screen.findByText(/no software found/i)).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    mockGetScaleSiteSoftware.mockRejectedValue(new Error('boom'));

    renderTab();

    expect(await screen.findByText(/could not load software/i)).toBeInTheDocument();
  });
});
