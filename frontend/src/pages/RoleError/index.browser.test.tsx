import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SYS_ADMIN_ROLE, type FamLoginUser } from '@/context/auth/types';

import RoleErrorPage from './index';

let mockUser: FamLoginUser | undefined;
const logout = vi.fn();
const navigate = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ user: mockUser, logout }),
}));

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigate,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <RoleErrorPage />
    </MemoryRouter>,
  );

describe('RoleErrorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { roles: [SYS_ADMIN_ROLE], privileges: {} };
  });

  describe('a user who has a home to go back to', () => {
    it('offers Back and Go to home page, and no Log out', () => {
      renderPage();

      expect(screen.getByRole('button', { name: 'Back' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Go to home page' })).toBeVisible();
      expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    });

    it('sends Go to home page to the welcome route', async () => {
      renderPage();

      await userEvent.click(screen.getByRole('button', { name: 'Go to home page' }));

      expect(navigate).toHaveBeenCalledWith('/welcome');
    });

    it('explains that it is this page they cannot view', () => {
      renderPage();

      expect(screen.getByText(/permissions to view this page/i)).toBeVisible();
    });
  });

  /**
   * The case the page's escape hatches were written for and did not serve. Such a user is refused
   * `/welcome` too, so "Go to home page" bounced them straight back here with nothing to explain why,
   * and Back left the application. Log out is the only action that can change their situation.
   */
  describe('a user with no welcome access', () => {
    it('offers Log out instead of Back and Go to home page, for an unrecognised role', () => {
      mockUser = { roles: ['NOT_AN_SCS_ROLE'], privileges: {} };

      renderPage();

      expect(screen.getByRole('button', { name: /log out/i })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Go to home page' })).not.toBeInTheDocument();
    });

    /**
     * A client-scoped role provisioned without a forest client — the documented fail-closed state for
     * a misprovisioned BCeID account, and the realistic way a live user reaches this branch. The role
     * IS recognised; it is the missing client that leaves them with nothing.
     */
    it('offers Log out for a client-scoped role held without a forest client', () => {
      mockUser = { roles: ['SCS_INDUSTRY_SCALER'], privileges: {} };

      renderPage();

      expect(screen.getByRole('button', { name: /log out/i })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Go to home page' })).not.toBeInTheDocument();
    });

    it('keeps Back and Go to home page once that role has a client', () => {
      mockUser = { roles: ['SCS_INDUSTRY_SCALER'], privileges: {}, clientNumbers: ['00048273'] };

      renderPage();

      expect(screen.getByRole('button', { name: 'Go to home page' })).toBeVisible();
      expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    });

    it('offers Log out when there is no user at all', () => {
      mockUser = undefined;

      renderPage();

      expect(screen.getByRole('button', { name: /log out/i })).toBeVisible();
    });

    it('logs the user out when it is clicked', async () => {
      mockUser = { roles: [], privileges: {} };

      renderPage();
      await userEvent.click(screen.getByRole('button', { name: /log out/i }));

      expect(logout).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('tells the user it is the application they cannot reach, not just this page', () => {
      mockUser = { roles: [], privileges: {} };

      renderPage();

      expect(screen.getByText(/does not have access to this application/i)).toBeVisible();
    });
  });
});
