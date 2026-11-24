import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import LayoutHeaderGlobalBar from './LayoutHeaderGlobalBar';

const mockToggleHeaderPanel = vi.fn();
let mockIsLoggedIn = true;

vi.mock('@/context/layout/useLayout', () => ({
  useLayout: () => ({
    toggleHeaderPanel: mockToggleHeaderPanel,
    isHeaderPanelOpen: false,
  }),
}));

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: mockIsLoggedIn,
  }),
}));

const renderGlobalBar = () => {
  render(<LayoutHeaderGlobalBar />);
};

describe('LayoutHeaderGlobalBar', () => {
  beforeEach(() => {
    mockToggleHeaderPanel.mockClear();
    mockIsLoggedIn = true;
  });

  it('renders the user settings action when logged in', () => {
    renderGlobalBar();

    expect(screen.getByLabelText('User settings')).toBeInTheDocument();
  });

  it('calls toggleHeaderPanel when user settings is clicked', () => {
    renderGlobalBar();

    fireEvent.click(screen.getByLabelText('User settings'));
    expect(mockToggleHeaderPanel).toHaveBeenCalled();
  });
});
