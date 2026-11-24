import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';
import type { MarkSiteDesignationSummary } from '@/services/scaleSiteMarkSiteDesignations.service';

import MsdTab from './MsdTab';

const mockNavigate = vi.fn();
const mockGetScaleSiteMarkSiteDesignations = vi.fn();

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
    scaleSiteMarkSiteDesignations: {
      getScaleSiteMarkSiteDesignations: (...args: unknown[]) => mockGetScaleSiteMarkSiteDesignations(...args),
    },
  },
}));

const renderTab = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MsdTab isActive scaleSiteIdNmbr="A12345" />
      </QueryClientProvider>
    </MemoryRouter>,
  );

const rows: MarkSiteDesignationSummary[] = [
  { timberMark: 'AB1234', scaleSiteIdNmbr: 'A12345', ownerCliNumber: '00012345' },
  { timberMark: 'CD5678', scaleSiteIdNmbr: 'A12345', ownerCliNumber: '00067890' },
];

describe('MsdTab', () => {
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
    mockGetScaleSiteMarkSiteDesignations.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('renders the timber marks as links to the MSD query page, under the section title', async () => {
    mockGetScaleSiteMarkSiteDesignations.mockResolvedValue(rows);

    renderTab();

    const link = await screen.findByRole('link', { name: 'AB1234' });
    expect(link).toHaveAttribute('href', '/mark-site-designations?timberMark=AB1234');
    expect(screen.getByRole('link', { name: 'CD5678' })).toHaveAttribute(
      'href',
      '/mark-site-designations?timberMark=CD5678',
    );

    expect(screen.getByText('MSD - Timber Marks')).toBeInTheDocument();
    // Owner client number is no longer shown.
    expect(screen.queryByText('00012345')).not.toBeInTheDocument();
  });

  it('shows an empty state when the scale site has no designations', async () => {
    mockGetScaleSiteMarkSiteDesignations.mockResolvedValue([]);

    renderTab();

    expect(await screen.findByText(/no mark site designations found/i)).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    mockGetScaleSiteMarkSiteDesignations.mockRejectedValue(new Error('boom'));

    renderTab();

    expect(await screen.findByText(/could not load mark site designations/i)).toBeInTheDocument();
  });

  it('navigates to the create page from Add Mark Site Designation', async () => {
    mockGetScaleSiteMarkSiteDesignations.mockResolvedValue([]);

    renderTab();

    const addButton = await screen.findByRole('button', { name: /add mark site designation/i });
    fireEvent.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith('/mark-site-designations/create');
  });
});
