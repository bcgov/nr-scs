import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthContextType } from '@/context/auth/AuthContext';
import * as authModule from '@/context/auth/useAuth';

import LandingPage from './index';

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

vi.mock('@/hooks/useBreakpoint', () => ({
  default: vi.fn(() => 'md'),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    welcome: {
      getWelcomeSummary: vi.fn().mockResolvedValue({
        applicationVersion: '1.0.0',
        applicationEnvironment: 'TEST',
        serverName: 'test-server',
        currentNews: '',
      }),
    },
  },
}));

describe('LandingPage role gating', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const authState = (overrides: Partial<AuthContextType>): AuthContextType => ({
    user: undefined,
    isLoggedIn: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
    ...overrides,
  });

  const renderPage = () =>
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
  });

  it('shows the login buttons and does not redirect when the user is logged out', () => {
    mockUseAuth.mockReturnValue(authState({ isLoggedIn: false, user: undefined }));

    renderPage();

    expect(screen.getByTestId('landing-button__idir')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects a logged-in user without the required role to /unauthorized', () => {
    mockUseAuth.mockReturnValue(
      authState({ isLoggedIn: true, user: { roles: ['APT_EDITOR', 'APT_VIEWER'], privileges: {} } }),
    );

    renderPage();

    expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
    // Neither the welcome dashboard nor the login buttons should be shown.
    expect(
      screen.queryByText(/Welcome to the Scale Administration and Control System/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('landing-button__idir')).not.toBeInTheDocument();
  });

  it('shows the welcome dashboard for an authorized system administrator', () => {
    mockUseAuth.mockReturnValue(
      authState({ isLoggedIn: true, user: { roles: ['SCS_SYS_ADMIN'], privileges: {} } }),
    );

    renderPage();

    expect(
      screen.getByText(/Welcome to the Scale Administration and Control System/i),
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows the welcome dashboard for a non-admin user with a defined role', () => {
    mockUseAuth.mockReturnValue(
      authState({ isLoggedIn: true, user: { roles: ['SCS_CLERICAL'], privileges: {} } }),
    );

    renderPage();

    expect(
      screen.getByText(/Welcome to the Scale Administration and Control System/i),
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
