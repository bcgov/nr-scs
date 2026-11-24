import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../config/tests/setup-env';
import type { AuthContextType } from '../../../../context/auth/AuthContext';
import * as authModule from '../../../../context/auth/useAuth';

import AuthorizationClausesAdminPage from './index';

const mockSearch = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockGetMethodTypeLov = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    authorizationClauses: {
      searchAuthorizationClauses: (...args: unknown[]) => mockSearch(...args),
      getAuthorizationClause: (...args: unknown[]) => mockGet(...args),
      createAuthorizationClause: (...args: unknown[]) => mockCreate(...args),
      updateAuthorizationClause: (...args: unknown[]) => mockUpdate(...args),
      deleteAuthorizationClause: (...args: unknown[]) => mockDelete(...args),
    },
    lov: {
      getScaleMethodTypeLov: (...args: unknown[]) => mockGetMethodTypeLov(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

const listRow = {
  scaleMethodAuthClauseId: 10,
  scaleMethodTypeCode: 'WT',
  scalerAuthorizationClause: 'Clause text ABC',
};
const detail = { ...listRow, effectiveDate: '2020-01-01', expiryDate: null };

const renderPage = () => render(<AuthorizationClausesAdminPage />, { wrapper: MemoryRouter });

describe('AuthorizationClausesAdminPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    [mockSearch, mockGet, mockCreate, mockUpdate, mockDelete, mockGetMethodTypeLov].forEach((m) =>
      m.mockReset(),
    );
    mockSearch.mockResolvedValue([listRow]);
    mockGet.mockResolvedValue(detail);
    mockDelete.mockResolvedValue(undefined);
    mockGetMethodTypeLov.mockResolvedValue([{ code: 'WT', description: 'Weight' }]);
    mockUseAuth.mockReturnValue({
      // An administrator: these cases exercise Add, Edit and Delete, which now name their own §J
      // permissions. Signed in as `undefined` they would pass for the wrong reason — nothing rendered.
      user: { roles: ['SCS_SYS_ADMIN'], privileges: {} },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn().mockResolvedValue('token'),
    } as AuthContextType);
  });

  it('renders the list, resolving the scale-method label from the LOV', async () => {
    const { container } = renderPage();
    expect(await screen.findByRole('button', { name: '10' })).toBeInTheDocument();
    await waitFor(() =>
      expect(
        container.querySelector('.table-resource__cell-content--scaleMethodTypeCode')?.textContent,
      ).toBe('Weight'),
    );
  });

  it('re-queries automatically when a filter option is selected', async () => {
    renderPage();
    await screen.findByRole('button', { name: '10' });

    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'WT' } });

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2));
    expect(mockSearch.mock.calls[1][0]).toEqual({ scaleMethodTypeCode: 'WT' });
  });

  it('ignores a stale reload response that resolves after a newer one', async () => {
    // Control resolution order: capture each search call's resolver.
    const resolvers: Array<(rows: unknown) => void> = [];
    mockSearch.mockImplementation(() => new Promise((res) => resolvers.push(res)));

    renderPage();
    // Mount fires the first (unfiltered) search.
    await waitFor(() => expect(resolvers).toHaveLength(1));

    // Change the filter → a second search fires.
    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'WT' } });
    await waitFor(() => expect(resolvers).toHaveLength(2));

    // Resolve the NEWER request first, then the older/stale one.
    resolvers[1]([{ scaleMethodAuthClauseId: 22, scaleMethodTypeCode: 'WT', scalerAuthorizationClause: 'Latest' }]);
    resolvers[0]([{ scaleMethodAuthClauseId: 11, scaleMethodTypeCode: 'WT', scalerAuthorizationClause: 'Stale' }]);

    // The newer result wins; the stale response must not replace the list.
    expect(await screen.findByRole('button', { name: '22' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: '11' })).not.toBeInTheDocument());
  });

  it('fetches the detail record when a clause is opened for view', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '10' }));

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('WT', 10, 'token'));
    expect(await screen.findByText('Authorization Clause Detail')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Clause text ABC')).toBeInTheDocument();
  });

  it('validates the create form', async () => {
    renderPage();
    await screen.findByRole('button', { name: '10' });
    fireEvent.click(screen.getByRole('button', { name: /Add Authorization Clause/ }));
    await screen.findByText('Maintain Authorization Clauses - Create');

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    expect(await screen.findByText('Clause is required.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('deletes a clause with its composite key through the confirm modal', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '10' }));
    await screen.findByText('Authorization Clause Detail');

    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    const confirm = await screen.findByText('Are you sure you want to delete this record?');
    fireEvent.click(within(confirm.closest('.cds--modal')!).getByRole('button', { name: /OK/ }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('WT', 10, 'token'));
    expect(mockSearch).toHaveBeenCalledTimes(2);
  });

  it('blocks a clause longer than 200 characters with a max-length message', async () => {
    const { container } = renderPage();
    await screen.findByRole('button', { name: '10' });
    fireEvent.click(screen.getByRole('button', { name: /Add Authorization Clause/ }));
    await screen.findByText('Maintain Authorization Clauses - Create');

    fireEvent.change(container.querySelector('#clause-text')!, { target: { value: 'X'.repeat(201) } });
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    expect(await screen.findByText('Clause can not be greater than 200 characters.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  const openCreateForm = async () => {
    const view = renderPage();
    await screen.findByRole('button', { name: '10' });
    fireEvent.click(screen.getByRole('button', { name: /Add Authorization Clause/ }));
    await screen.findByText('Maintain Authorization Clauses - Create');
    return view;
  };

  const setDate = (container: HTMLElement, id: string, value: string) => {
    const input = container.querySelector(id)! as HTMLInputElement;
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  const fillValid = (container: HTMLElement, clause = 'A valid clause') => {
    fireEvent.change(container.querySelector('#clause-type')!, { target: { value: 'WT' } });
    fireEvent.change(container.querySelector('#clause-text')!, { target: { value: clause } });
  };

  it('allows a clause of exactly 200 characters', async () => {
    mockCreate.mockResolvedValue({ scaleMethodTypeCode: 'WT', scaleMethodAuthClauseId: 42 });
    const { container } = await openCreateForm();

    fillValid(container, 'X'.repeat(200));
    setDate(container, '#clause-effective-date', '2020-01-01');

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(screen.queryByText('Clause can not be greater than 200 characters.')).not.toBeInTheDocument();
  });

  it('allows expiry equal to the effective date', async () => {
    mockCreate.mockResolvedValue({ scaleMethodTypeCode: 'WT', scaleMethodAuthClauseId: 43 });
    const { container } = await openCreateForm();

    fillValid(container);
    setDate(container, '#clause-effective-date', '2020-01-01');
    setDate(container, '#clause-expiry-date', '2020-01-01');

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(screen.queryByText('Expiry Date must be on or after Effective Date.')).not.toBeInTheDocument();
  });

  it('serializes a blank expiry as null', async () => {
    mockCreate.mockResolvedValue({ scaleMethodTypeCode: 'WT', scaleMethodAuthClauseId: 44 });
    const { container } = await openCreateForm();

    fillValid(container);
    setDate(container, '#clause-effective-date', '2020-01-01');
    // Expiry Date left empty.

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    const payload = mockCreate.mock.calls[0][0] as { expiryDate: unknown };
    expect(payload.expiryDate).toBeNull();
  });

  it('serializes a populated expiry as a non-null value', async () => {
    mockCreate.mockResolvedValue({ scaleMethodTypeCode: 'WT', scaleMethodAuthClauseId: 45 });
    const { container } = await openCreateForm();

    fillValid(container);
    setDate(container, '#clause-effective-date', '2020-01-01');
    setDate(container, '#clause-expiry-date', '2021-06-30');

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    const payload = mockCreate.mock.calls[0][0] as { expiryDate: unknown };
    expect(payload.expiryDate).toBe('2021-06-30');
  });

  it('surfaces a save error and keeps the create form open', async () => {
    mockCreate.mockRejectedValue({ response: { data: { message: 'Clause already exists.' } } });
    const { container } = await openCreateForm();

    fillValid(container);
    setDate(container, '#clause-effective-date', '2020-01-01');

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    expect(await screen.findByText('Clause already exists.')).toBeInTheDocument();
    expect(screen.getByText('Maintain Authorization Clauses - Create')).toBeInTheDocument();
  });
});
