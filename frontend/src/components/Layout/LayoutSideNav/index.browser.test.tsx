import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PERMISSIONS } from '@/context/auth/permissions';

import type { FamLoginUser } from '@/context/auth/types';

import { LayoutSideNav } from './index';

vi.mock('@/context/layout/useLayout', () => ({
  useLayout: () => ({ isSideNavExpanded: true, isLargeViewport: false }),
}));

// The current user drives which entries are visible. Tests mutate `mockUser` before rendering to
// exercise the permission-based gating. `usePermissions` derives from this same user, so it is not
// mocked separately — the real role → permission matrix is exercised.
let mockUser: FamLoginUser | undefined;
vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Only the tree is replaced, with a small fixture; `filterNavigation` and `isNavGroup` come from the
// real module so the component's actual filtering logic is under test.
vi.mock('@/routes/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/routes/navigation')>()),
  NAVIGATION_ITEMS: [
    {
      name: 'Queries',
      children: [
        {
          name: 'Clients',
          path: '/client',
          // Held by the Industry Scaler, so this entry survives their filter.
          permission: PERMISSIONS.CLIENT_QUERY,
        },
        {
          name: 'Scale Sites',
          path: '/scale-sites',
          // Denied to the Industry Scaler — they may read a site record but not search the register.
          permission: PERMISSIONS.SCALE_SITE_QUERY,
        },
      ],
    },
    {
      name: 'Administration',
      children: [
        {
          name: 'Maintenance',
          children: [
            {
              name: 'Authorization Clauses',
              path: '/maintenance/authorization-clauses',
              permission: PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_QUERY,
            },
          ],
        },
      ],
    },
  ],
}));

const adminUser = { roles: ['SCS_SYS_ADMIN'], privileges: {} } as FamLoginUser;
const industryScalerUser = { roles: ['SCS_INDUSTRY_SCALER'], privileges: {}, clientNumbers: ['00001074'] } as FamLoginUser;
// Also client-scoped, so it needs clientNumbers too — without one it holds no permissions at all and
// every negative assertion below would pass for the wrong reason.
const scaleSiteOwnerUser = { roles: ['SCS_OWNER'], privileges: {}, clientNumbers: ['00001074'] } as FamLoginUser;
const nonAdminUser = { roles: [], privileges: {} } as FamLoginUser;
// A user holding an exact-but-wrong role (e.g. APT_SYS_ADMIN) — must not unlock anything.
const wrongRoleUser = { roles: ['APT_SYS_ADMIN'], privileges: {} } as FamLoginUser;
// Internal and read-only: the Queries, Reports and Administration menus, and never Create.
const clericalUser = { roles: ['SCS_CLERICAL'], privileges: {} } as FamLoginUser;

const renderWithProviders = async (pathname = '/dashboard') => {
  window.history.pushState({}, '', pathname);
  await act(async () =>
    render(
      <MemoryRouter initialEntries={[pathname]}>
        <LayoutSideNav />
      </MemoryRouter>,
    ),
  );
};

describe('LayoutSideNav', () => {
  beforeEach(() => {
    mockUser = adminUser;
  });

  it('renders menu links and menu items', async () => {
    await renderWithProviders('/client');

    expect(screen.getByText('Queries')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Authorization Clauses')).toBeInTheDocument();
  });

  it('marks the correct link as active', async () => {
    await renderWithProviders('/maintenance/authorization-clauses');

    const authorizationClausesLink = screen.getByRole('link', { name: 'Authorization Clauses' });
    expect(authorizationClausesLink).toHaveClass('cds--side-nav__link--current');
  });

  it('shows every entry to a system administrator', async () => {
    mockUser = adminUser;

    await renderWithProviders('/client');

    expect(screen.getByText('Queries')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Scale Sites')).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('shows an Industry Scaler only the entries their permissions reveal', async () => {
    mockUser = industryScalerUser;

    await renderWithProviders('/client');

    expect(screen.getByText('Queries')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    // Denied: no Scale Sites search, and the whole Administration group disappears with its children.
    expect(screen.queryByText('Scale Sites')).not.toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    expect(screen.queryByText('Authorization Clauses')).not.toBeInTheDocument();
  });

  it('shows a Scale Site Owner the Scale Sites entry an Industry Scaler is denied', async () => {
    mockUser = scaleSiteOwnerUser;

    await renderWithProviders('/client');

    expect(screen.getByText('Queries')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    // §D grants this role the site register, unlike the Industry Scaler above.
    expect(screen.getByText('Scale Sites')).toBeInTheDocument();
    // §F denies every standalone MSD row, so that entry is absent for this role but present for IND.
    expect(screen.queryByText('Mark Site Designations')).not.toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    expect(screen.queryByText('Authorization Clauses')).not.toBeInTheDocument();
  });

  /**
   * The fixture tree above, not the real one — this file tests the component's filtering, so the
   * assertions are limited to the entries it defines. The Clerical column's shape against the *real*
   * tree (Queries, Reports and Administration → Work Bench, and never a Create menu) is pinned in
   * `navigation.unit.test.ts`.
   *
   * Worth having here all the same: this role reads the site register where the Industry Scaler above
   * cannot, and §J denies it every Maintenance row — which is the fixture's only Administration leaf,
   * so that group collapses rather than rendering headed and empty.
   */
  it('shows a Clerical user the site register and drops the maintenance-only group', async () => {
    mockUser = clericalUser;

    await renderWithProviders('/client');

    expect(screen.getByText('Queries')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Scale Sites')).toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    expect(screen.queryByText('Maintenance')).not.toBeInTheDocument();
    expect(screen.queryByText('Authorization Clauses')).not.toBeInTheDocument();
  });

  /**
   * Was "shows nothing to a recognised role that is not enabled yet", borrowing whichever column was
   * still welcome-only. All eleven are filled in now, so that state no longer exists and the case it
   * tested is exactly the one below — a user holding no permissions.
   */
  it('shows nothing to a user with no roles at all', async () => {
    mockUser = nonAdminUser;

    await renderWithProviders('/client');

    expect(screen.queryByText('Queries')).not.toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    expect(screen.queryByText('Clients')).not.toBeInTheDocument();
  });

  it('shows nothing to a user holding a different (non-matching) role', async () => {
    mockUser = wrongRoleUser;

    await renderWithProviders('/client');

    expect(screen.queryByText('Queries')).not.toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    expect(screen.queryByText('Clients')).not.toBeInTheDocument();
    expect(screen.queryByText('Authorization Clauses')).not.toBeInTheDocument();
  });

  it('shows nothing when there is no authenticated user', async () => {
    mockUser = undefined;

    await renderWithProviders('/client');

    expect(screen.queryByText('Queries')).not.toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });
});
