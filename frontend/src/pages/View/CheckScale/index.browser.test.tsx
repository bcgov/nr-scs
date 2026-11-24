import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import CheckScaleViewPage from './index';

const mockGetCheckScale = vi.fn();
const mockGetStaticLov = vi.fn();
const mockDeleteCheckScale = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/services/APIs', () => ({
  BackendApiConfig: { BASE: '/api' },
  default: {
    checkScale: {
      getCheckScale: (...args: unknown[]) => mockGetCheckScale(...args),
      deleteCheckScale: (...args: unknown[]) => mockDeleteCheckScale(...args),
    },
    lov: { getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args) },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

const checkScale = {
  checkScaleId: 42,
  ckscType: 'CKSC',
  checkScaleTypeCode: 'CKSC',
  speciesSummary: [],
};

/**
 * Renders the check-scale view for `roles`. The action row is what these tests are about: the route
 * itself only requires CHECK_SCALE_QUERY, so each control names its own permission from matrix §I.
 */
const renderPage = (roles: string[], backTo?: string) => {
  vi.mocked(authModule.useAuth).mockReturnValue({
    // A forest client is always supplied: a client-scoped role held without one grants *nothing*, so
    // every negative assertion below would pass for the wrong reason. See the RBAC note's testing
    // gotcha, which caught eight fixtures doing exactly that.
    user: {
      roles,
      privileges: Object.fromEntries(roles.map((role) => [role, null])),
      clientNumbers: ['00001074'],
    },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  } as AuthContextType);

  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter
        initialEntries={[
          backTo ? { pathname: '/check-scales/view/42', state: { backTo } } : '/check-scales/view/42',
        ]}
      >
        <Routes>
          <Route path="/check-scales/view/:checkScaleId" element={<CheckScaleViewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

/**
 * The action row, found through its Back button — the one control that is never gated.
 *
 * Scoped to the row rather than queried off `screen`, and matched on text rather than by role, for
 * two reasons that both bite on the Delete button: the confirmation modal's "Confirm Delete" is in
 * the DOM even while the modal is closed, and Carbon prefixes a danger button's label with a
 * visually-hidden "danger" span, so neither its accessible name nor its own `textContent` is
 * "Delete". Reading the row's text is what stays true regardless of how Carbon composes the button.
 */
const actionRow = async () => (await screen.findByRole('button', { name: 'Back' })).parentElement!;

const rowHas = (row: HTMLElement, label: string) => (row.textContent ?? '').includes(label);

describe('CheckScaleViewPage — action row gating', () => {
  beforeEach(() => {
    mockGetCheckScale.mockReset();
    mockGetStaticLov.mockReset();
    mockGetCheckScale.mockResolvedValue(checkScale);
    mockGetStaticLov.mockResolvedValue([]);
  });

  /**
   * §I gives the Check Scaler `CR` on create and `RU` on the record, and the `D` only to `ADM`'s
   * `RUD`. So this role edits, issues the advisory letter and records another check scale — and the
   * Delete stays hidden. That last assertion is what pins the CHECK_SCALE_DELETE decision.
   */
  it('gives a Check Scaler Edit, Create Letter and Add — but not Delete', async () => {
    renderPage(['SCS_CHECK_SCALER']);
    const row = await actionRow();

    expect(rowHas(row, 'Edit Record')).toBe(true);
    expect(rowHas(row, 'Create Letter')).toBe(true);
    expect(rowHas(row, 'Add Check Scale')).toBe(true);
    expect(rowHas(row, 'Delete')).toBe(false);
  });

  it('gives an administrator the whole row, Delete included', async () => {
    renderPage([SYS_ADMIN_ROLE]);
    const row = await actionRow();

    expect(rowHas(row, 'Delete')).toBe(true);
  });

  /**
   * §I is `-` throughout for the Scale Site Owner: the site record's Check Scales *tab* is granted,
   * the check-scale record is not. Such a caller cannot route here at all, but the page must not rely
   * on that — every control except Back disappears, and Back is never gated because a role that can
   * open a page needs a way off it.
   */
  it('leaves only Back for a role holding no check-scale verbs', async () => {
    renderPage(['SCS_OWNER']);
    const row = await actionRow();

    for (const hidden of ['Edit Record', 'Create Letter', 'Add Check Scale', 'Delete']) {
      expect(rowHas(row, hidden), `${hidden} should be hidden`).toBe(false);
    }
  });
});

describe('CheckScaleViewPage — delete', () => {
  beforeEach(() => {
    mockGetCheckScale.mockReset();
    mockGetStaticLov.mockReset();
    mockDeleteCheckScale.mockReset();
    mockNavigate.mockReset();
    mockGetCheckScale.mockResolvedValue(checkScale);
    mockGetStaticLov.mockResolvedValue([]);
    mockDeleteCheckScale.mockResolvedValue(undefined);
  });

  // Opens the confirm modal via the action-row Delete button (found by row text, not accessible name:
  // Carbon prefixes a danger button's label with a visually-hidden "danger" span).
  const openConfirmModal = async () => {
    const row = await actionRow();
    const deleteButton = within(row)
      .getAllByRole('button')
      .find((b) => (b.textContent ?? '').includes('Delete'))!;
    fireEvent.click(deleteButton);
  };

  it('deletes the record and navigates back on confirm', async () => {
    renderPage([SYS_ADMIN_ROLE]);
    await openConfirmModal();

    fireEvent.click(await screen.findByRole('button', { name: /confirm delete/i }));

    await waitFor(() => expect(mockDeleteCheckScale).toHaveBeenCalledWith('42', 'token'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(-1));
  });

  it('returns to the backTo list on confirm when route state supplies one', async () => {
    renderPage([SYS_ADMIN_ROLE], '/scalers/view/167Y?tab=check-scales');
    await openConfirmModal();

    fireEvent.click(await screen.findByRole('button', { name: /confirm delete/i }));

    await waitFor(() => expect(mockDeleteCheckScale).toHaveBeenCalledWith('42', 'token'));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/scalers/view/167Y?tab=check-scales'),
    );
  });

  it('does not delete when the confirmation is cancelled', async () => {
    renderPage([SYS_ADMIN_ROLE]);
    await openConfirmModal();

    fireEvent.click(await screen.findByRole('button', { name: /cancel/i }));

    expect(mockDeleteCheckScale).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows an error and stays on the page when the delete fails', async () => {
    mockDeleteCheckScale.mockRejectedValue(new Error('boom'));
    renderPage([SYS_ADMIN_ROLE]);
    await openConfirmModal();

    fireEvent.click(await screen.findByRole('button', { name: /confirm delete/i }));

    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
