import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthContext } from '@/context/auth/AuthContext';
import { renderWithProviders, testAuthContext } from '@/config/tests/renderWithProviders';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import { PERMISSIONS } from '@/context/auth/permissions';

import ProtectedRoute from './ProtectedRoute';

const Child = () => <div>Protected content</div>;

describe('ProtectedRoute', () => {
  it('renders its children for a user with a recognised role when no permission is required', () => {
    renderWithProviders(
      <ProtectedRoute>
        <Child />
      </ProtectedRoute>,
      { roles: [SYS_ADMIN_ROLE] },
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('withholds the content from a user with no recognised SCS role at all', () => {
    // A role is what gets a user into the portal; the permission only decides the page.
    renderWithProviders(
      <ProtectedRoute>
        <Child />
      </ProtectedRoute>,
      { roles: [] },
    );

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders its children for a user holding the required permission', () => {
    renderWithProviders(
      <ProtectedRoute permission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ}>
        <Child />
      </ProtectedRoute>,
      { roles: [SYS_ADMIN_ROLE] },
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('withholds the content from a user without the permission', () => {
    renderWithProviders(
      <ProtectedRoute permission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ}>
        <Child />
      </ProtectedRoute>,
      { roles: [] },
    );

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});

describe('ProtectedRoute — session states', () => {
  const renderWithAuth = (value: ReturnType<typeof testAuthContext>) =>
    render(
      <MemoryRouter>
        <AuthContext.Provider value={value}>
          <ProtectedRoute>
            <Child />
          </ProtectedRoute>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

  it('shows a loading state while the session is still being resolved', () => {
    renderWithAuth({ ...testAuthContext(undefined), isLoading: true });

    expect(screen.getByText('Loading session...')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects a signed-out user instead of rendering the content', () => {
    renderWithAuth(testAuthContext(undefined));

    expect(screen.getByText('Redirecting to login...')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});
