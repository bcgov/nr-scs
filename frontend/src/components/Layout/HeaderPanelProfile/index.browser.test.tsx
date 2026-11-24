import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import HeaderPanelProfile from './index';

const mockLogout = vi.fn();
const mockUser = {
  displayName: 'Jane Doe',
  email: 'jane@example.com',
};

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout, user: mockUser }),
}));

const renderProfile = () => {
  render(<HeaderPanelProfile />);
};

describe('HeaderPanelProfile', () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  it('renders the current user details', () => {
    renderProfile();

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('calls logout when Log out is clicked', () => {
    renderProfile();

    fireEvent.click(screen.getByText('Log out'));
    expect(mockLogout).toHaveBeenCalled();
  });
});
