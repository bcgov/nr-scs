import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

import Layout from './index';

const mockUseAuth = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('./LayoutHeader', () => ({
  LayoutHeader: () => <div data-testid="layout-header" />,
}));

const getSystemStatus = vi.fn();
vi.mock('@/services/APIs', () => ({
  default: {
    systemStatus: { getSystemStatus: () => getSystemStatus() },
  },
}));

const DummyChild = () => <div data-testid="dummy-child">Hello Child</div>;

const renderLayout = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DummyChild />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('Layout (browser)', () => {
  it('renders the header, content container, and outlet content for an administrator', () => {
    // Administrators are exempt from the disable gate, so no status probe runs.
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isLoggedIn: true,
      user: { roles: ['SCS_SYS_ADMIN'] },
    });

    renderLayout();

    expect(screen.getByTestId('layout-header')).toBeInTheDocument();
    expect(document.querySelector('.cds--content')).not.toBeNull();
    expect(document.querySelector('.app-content')).not.toBeNull();
    expect(screen.getByTestId('dummy-child')).toHaveTextContent('Hello Child');
  });

  it('shows the temporarily-disabled interstitial for an authenticated non-administrator when the system is disabled', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isLoggedIn: true,
      user: { roles: [] },
    });
    getSystemStatus.mockResolvedValue({ enabled: false });

    renderLayout();

    expect(
      await screen.findByText('SCS has been temporarily disabled.'),
    ).toBeInTheDocument();
    // No menu/nav/outlet content is rendered on the interstitial.
    expect(screen.queryByTestId('layout-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dummy-child')).not.toBeInTheDocument();
  });

  it('renders the app normally for a non-administrator when the system is enabled', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isLoggedIn: true,
      user: { roles: [] },
    });
    getSystemStatus.mockResolvedValue({ enabled: true });

    renderLayout();

    expect(await screen.findByTestId('dummy-child')).toHaveTextContent(
      'Hello Child',
    );
    expect(
      screen.queryByText('SCS has been temporarily disabled.'),
    ).not.toBeInTheDocument();
  });
});
