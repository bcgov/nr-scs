import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '@/context/auth/permissions';
import { SYS_ADMIN_ROLE, type FamLoginUser } from '@/context/auth/types';

import PermissionLink from './index';

let mockUser: FamLoginUser | undefined;
vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const renderLink = (permission = PERMISSIONS.CHECK_SCALE_QUERY) =>
  render(
    <MemoryRouter>
      <PermissionLink className="table-link" permission={permission} to="/check-scales/view/42">
        42
      </PermissionLink>
    </MemoryRouter>,
  );

describe('PermissionLink', () => {
  beforeEach(() => {
    mockUser = { roles: [SYS_ADMIN_ROLE], privileges: {} };
  });

  it('renders a link when the user can reach the destination', () => {
    const link = renderLink().getByRole('link', { name: '42' });

    expect(link).toHaveAttribute('href', '/check-scales/view/42');
    expect(link).toHaveClass('table-link');
  });

  /**
   * The value is still information the user may see, so it stays visible — but as text, carrying no
   * class, so it inherits the surrounding colour and has no underline rather than looking like a link
   * that goes nowhere.
   */
  it('renders plain text, with no link class, when the user cannot', () => {
    mockUser = { roles: ['SCS_INDUSTRY_SCALER'], privileges: {}, clientNumbers: ['00001074'] };

    const { container } = renderLink();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(container.querySelector('.table-link')).toBeNull();
  });

  it('renders plain text when there is no authenticated user', () => {
    mockUser = undefined;

    renderLink();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('keeps the licence link clickable for an Industry Scaler, who holds SCALER_READ', () => {
    mockUser = { roles: ['SCS_INDUSTRY_SCALER'], privileges: {}, clientNumbers: ['00001074'] };

    renderLink(PERMISSIONS.SCALER_READ);

    expect(screen.getByRole('link', { name: '42' })).toBeInTheDocument();
  });

  /** The id is often a `<label htmlFor>` target, so it must survive the degrade to text. */
  it('keeps the id on the plain-text form so label associations survive', () => {
    mockUser = { roles: ['SCS_INDUSTRY_SCALER'], privileges: {}, clientNumbers: ['00001074'] };

    const { container } = render(
      <MemoryRouter>
        <PermissionLink id="check-scale-id" permission={PERMISSIONS.CHECK_SCALE_QUERY} to="/x">
          42
        </PermissionLink>
      </MemoryRouter>,
    );

    expect(container.querySelector('#check-scale-id')?.tagName).toBe('SPAN');
  });
});
