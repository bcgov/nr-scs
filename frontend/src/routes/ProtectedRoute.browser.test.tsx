import { render, screen } from '@testing-library/react';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import ProtectedRoute from './ProtectedRoute';
import * as authModule from '@/context/auth/useAuth';
import { PERMISSIONS, type PERMISSION_TYPE } from '@/context/auth/permissions';

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

describe('ProtectedRoute', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
  });

  it('renders a loading message while the session is being checked', () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoggedIn: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Private Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading session...')).toBeInTheDocument();
  });

  it('navigates to the welcome page when no authenticated user is available', () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoggedIn: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Private Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Redirecting to login...')).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/welcome', { replace: true });
  });

  it('navigates to the unauthorized page when the user holds no SCS role at all', () => {
    mockUseAuth.mockReturnValue({
      user: { userName: 'jdoe', email: 'jdoe@example.com', roles: [], privileges: {} },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Private Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
  });

  it('navigates to the unauthorized page when the user has a different (non-matching) role', () => {
    // Mirrors granting a wrong admin-like role (e.g. APT_SYS_ADMIN): a role SCS does not recognise
    // grants nothing, so the user never reaches the portal (legacy SecurityFilter).
    mockUseAuth.mockReturnValue({
      user: { userName: 'jdoe', email: 'jdoe@example.com', roles: ['APT_SYS_ADMIN'], privileges: {} },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Private Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
  });

  it('renders protected content when the user is an authenticated system administrator', () => {
    mockUseAuth.mockReturnValue({
      user: {
        userName: 'jdoe',
        email: 'jdoe@example.com',
        roles: ['SCS_SYS_ADMIN'],
        privileges: { SCS_SYS_ADMIN: null },
      },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Private Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Private Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  describe('per-route permission', () => {
    const signedInAs = (roles: string[], clientNumbers: string[] = ['00001074']) =>
      mockUseAuth.mockReturnValue({
        user: {
          userName: 'jdoe',
          email: 'jdoe@example.com',
          roles,
          privileges: {},
          clientNumbers,
        },
        isLoggedIn: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
      });

    const renderRoute = (permission: PERMISSION_TYPE) =>
      render(
        <MemoryRouter>
          <ProtectedRoute permission={permission}>
            <div>Private Content</div>
          </ProtectedRoute>
        </MemoryRouter>,
      );

    it('renders the page when the user holds its permission', () => {
      signedInAs(['SCS_INDUSTRY_SCALER']);

      renderRoute(PERMISSIONS.SCALER_QUERY);

      expect(screen.getByText('Private Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    /**
     * The URL-tampering case: an Industry Scaler who types the path of a screen outside their scope
     * is redirected rather than shown the page — the port of the legacy global `notAuthorized`
     * forward. The API refuses the same request independently.
     */
    it('redirects to /unauthorized when the user lacks its permission', () => {
      signedInAs(['SCS_INDUSTRY_SCALER']);

      renderRoute(PERMISSIONS.SCALER_CREATE);

      expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
    });

    it('redirects an Industry Scaler away from the Scale Sites search', () => {
      signedInAs(['SCS_INDUSTRY_SCALER']);

      renderRoute(PERMISSIONS.SCALE_SITE_QUERY);

      expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
    });

    it('still lets an Industry Scaler open a scale-site record', () => {
      signedInAs(['SCS_INDUSTRY_SCALER']);

      renderRoute(PERMISSIONS.SCALE_SITE_READ);

      expect(screen.getByText('Private Content')).toBeInTheDocument();
    });

    /**
     * A client-scoped role with no forest client number holds no permissions, so every route is
     * refused — including the welcome page. Without a client there are no rows the role could act on,
     * and the backend denies the same requests independently.
     */
    it('redirects an Industry Scaler with no client number away from every route', () => {
      signedInAs(['SCS_INDUSTRY_SCALER'], []);

      renderRoute(PERMISSIONS.SCALER_QUERY);

      expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
    });

    it('redirects an Industry Scaler with no client number even from the welcome page', () => {
      signedInAs(['SCS_INDUSTRY_SCALER'], []);

      renderRoute(PERMISSIONS.WELCOME_READ);

      expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
    });

    /**
     * Was "a recognised role whose permissions are not enabled yet", borrowing whichever column was
     * still welcome-only — a fixture that had to move twice as roles were enabled, and has no subject
     * left now that all eleven are filled in. Recast as what it was really testing: a role that holds a
     * real column but not *this* route's permission. `SCS_CLERICAL` is read-only, so the administrator's
     * system screen is permanently out of its reach.
     */
    it('redirects a role that holds a real column but not this route’s permission', () => {
      signedInAs(['SCS_CLERICAL']);

      renderRoute(PERMISSIONS.MAINTAIN_SYSTEM_UPDATE);

      expect(screen.queryByText('Private Content')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
    });

    it('lets an administrator through to every route', () => {
      signedInAs(['SCS_SYS_ADMIN']);

      renderRoute(PERMISSIONS.MAINTAIN_SYSTEM_UPDATE);

      expect(screen.getByText('Private Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
