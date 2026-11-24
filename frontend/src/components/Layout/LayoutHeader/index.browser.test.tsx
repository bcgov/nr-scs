import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LayoutHeader } from '@/components/Layout/LayoutHeader';

const mockToggleSideNav = vi.fn();

vi.mock('@/components/Layout/LayoutHeader/LayoutHeaderGlobalBar', () => ({
  __esModule: true,
  default: () => <div data-testid="layout-header-global-bar" />,
}));

vi.mock('@/components/Layout/LayoutHeaderPanel', () => ({
  LayoutHeaderPanel: () => <div data-testid="layout-header-panel" />,
}));

vi.mock('@/components/Layout/LayoutSideNav', () => ({
  LayoutSideNav: () => <div data-testid="layout-side-nav" />,
}));

vi.mock('@/components/Layout/ThemeToggle', () => ({
  __esModule: true,
  default: () => <div data-testid="theme-toggle" />,
}));

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ isLoggedIn: true }),
}));

vi.mock('@/context/layout/useLayout', () => ({
  useLayout: () => ({
    isSideNavExpanded: false,
    toggleSideNav: mockToggleSideNav,
    isLargeViewport: false,
  }),
}));

const renderHeader = () => {
  render(
    <MemoryRouter>
      <LayoutHeader />
    </MemoryRouter>,
  );
};

describe('LayoutHeader', () => {
  beforeEach(() => {
    mockToggleSideNav.mockClear();
  });

  it('renders header with the current SCS title', () => {
    renderHeader();

    const header = screen.getByTestId('bc-header__header');
    expect(header).toBeInTheDocument();
    const title = screen.getByText(/Scale Administration and Control System \(SCS\)/i);
    expect(title).toBeInTheDocument();
    expect(screen.getByTestId('layout-header-global-bar')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('calls toggleSideNav when the menu button is clicked', () => {
    renderHeader();

    const toggleButton = screen.getByLabelText(/open menu/i);
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(mockToggleSideNav).toHaveBeenCalledTimes(1);
  });
});
