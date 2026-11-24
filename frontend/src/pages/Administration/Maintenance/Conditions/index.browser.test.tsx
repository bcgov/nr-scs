import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../config/tests/setup-env';
import type { AuthContextType } from '../../../../context/auth/AuthContext';
import * as authModule from '../../../../context/auth/useAuth';

import ConditionsAdminPage from './index';

const mockSearch = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockGetStaticLov = vi.fn();
const mockGetScaleMethodTypeLov = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    conditions: {
      searchConditions: (...args: unknown[]) => mockSearch(...args),
      getCondition: (...args: unknown[]) => mockGet(...args),
      createCondition: (...args: unknown[]) => mockCreate(...args),
      updateCondition: (...args: unknown[]) => mockUpdate(...args),
      deleteCondition: (...args: unknown[]) => mockDelete(...args),
    },
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
      getScaleMethodTypeLov: (...args: unknown[]) => mockGetScaleMethodTypeLov(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));

const listRow = {
  scaleConditionClassCode: 'GEN',
  scaleAuthConditionId: 3,
  scaleAuthConditionTitle: 'General Condition',
  siteMethodTypeCodes: ['WT'],
};
const detail = {
  ...listRow,
  ministryStandardInd: 'Y',
  sortOrderNo: 10,
  effectiveDate: '2020-01-01',
  expiryDate: null,
  scaleAuthConditionDesc: 'Some text',
  dependentChildExists: false,
};

const renderPage = () => render(<ConditionsAdminPage />, { wrapper: MemoryRouter });

describe('ConditionsAdminPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    [mockSearch, mockGet, mockCreate, mockUpdate, mockDelete, mockGetStaticLov, mockGetScaleMethodTypeLov].forEach((m) =>
      m.mockReset(),
    );
    mockSearch.mockResolvedValue([listRow]);
    mockGet.mockResolvedValue(detail);
    mockDelete.mockResolvedValue(undefined);
    mockGetStaticLov.mockResolvedValue([
      { code: 'GEN', description: 'General' },
      { code: 'SIA', description: 'Scale Site Authorization' },
      { code: 'MSD', description: 'Mark Site Designation' },
      { code: 'SCA', description: 'Scaler Authorization' },
    ]);
    mockGetScaleMethodTypeLov.mockResolvedValue([{ code: 'WT', description: 'Weight' }]);
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

  it('renders the list', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByText('General Condition')).toBeInTheDocument();
  });

  it('validates the create form', async () => {
    renderPage();
    await screen.findByRole('button', { name: '3' });
    fireEvent.click(screen.getByRole('button', { name: /Add Condition/ }));
    await screen.findByText('Maintain Conditions - Create');
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('re-queries automatically when a filter option is selected', async () => {
    renderPage();
    await screen.findByRole('button', { name: '3' });
    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'GEN' } });
    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2));
    expect(mockSearch.mock.calls[1][0]).toEqual({ scaleConditionClassCode: 'GEN' });
  });

  it('blocks delete when the condition has dependents', async () => {
    mockGet.mockResolvedValue({ ...detail, dependentChildExists: true });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '3' }));
    await screen.findByText('Maintain Conditions - Details');

    fireEvent.click(await screen.findByRole('button', { name: /Delete/ }));

    expect(await screen.findByText(/cannot be deleted/i)).toBeInTheDocument();
    // The delete-confirm dialog must not have been triggered.
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes with its composite key when there are no dependents', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '3' }));
    await screen.findByText('Maintain Conditions - Details');
    fireEvent.click(await screen.findByRole('button', { name: /Delete/ }));
    const confirm = await screen.findByText('Are you sure you want to delete this record?');
    fireEvent.click(within(confirm.closest('.cds--modal')!).getByRole('button', { name: /OK/ }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('GEN', 3, 'token'));
  });

  const openCreateForm = async () => {
    const view = renderPage();
    await screen.findByRole('button', { name: '3' });
    fireEvent.click(screen.getByRole('button', { name: /Add Condition/ }));
    await screen.findByText('Maintain Conditions - Create');
    return view;
  };

  it('requires a Site Type for SIA conditions', async () => {
    const { container } = await openCreateForm();
    fireEvent.change(container.querySelector('#condition-type')!, { target: { value: 'SIA' } });
    // SIA renders the Site Type field.
    await waitFor(() => expect(container.querySelector('#condition-site-types')).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    expect(await screen.findByText('Site Type is required.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('hides the Site Type field for SCA and MSD conditions', async () => {
    const { container } = await openCreateForm();
    const typeSelect = container.querySelector('#condition-type')!;

    fireEvent.change(typeSelect, { target: { value: 'SIA' } });
    await waitFor(() => expect(container.querySelector('#condition-site-types')).not.toBeNull());

    fireEvent.change(typeSelect, { target: { value: 'SCA' } });
    await waitFor(() => expect(container.querySelector('#condition-site-types')).toBeNull());

    fireEvent.change(typeSelect, { target: { value: 'MSD' } });
    await waitFor(() => expect(container.querySelector('#condition-site-types')).toBeNull());
  });

  it('sends null Site Types when creating an SCA condition', async () => {
    mockCreate.mockResolvedValue({ scaleConditionClassCode: 'SCA', scaleAuthConditionId: 99 });
    const { container } = await openCreateForm();

    fireEvent.change(container.querySelector('#condition-type')!, { target: { value: 'SCA' } });
    fireEvent.change(container.querySelector('#condition-title')!, { target: { value: 'SCA condition' } });
    fireEvent.change(container.querySelector('#condition-mandatory')!, { target: { value: 'N' } });
    fireEvent.change(container.querySelector('#condition-sort-order')!, { target: { value: '10' } });
    const effective = container.querySelector('#condition-effective-date')! as HTMLInputElement;
    fireEvent.change(effective, { target: { value: '2020-01-01' } });
    fireEvent.blur(effective);
    fireEvent.change(container.querySelector('#condition-text')!, { target: { value: 'Condition text' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    const payload = mockCreate.mock.calls[0][0] as { scaleConditionClassCode: string; siteMethodTypeCodes: unknown };
    expect(payload.scaleConditionClassCode).toBe('SCA');
    expect(payload.siteMethodTypeCodes).toBeNull();
  });

  const fillValidNonSia = (container: HTMLElement) => {
    fireEvent.change(container.querySelector('#condition-type')!, { target: { value: 'SCA' } });
    fireEvent.change(container.querySelector('#condition-title')!, { target: { value: 'SCA condition' } });
    fireEvent.change(container.querySelector('#condition-mandatory')!, { target: { value: 'N' } });
    fireEvent.change(container.querySelector('#condition-sort-order')!, { target: { value: '10' } });
    fireEvent.change(container.querySelector('#condition-text')!, { target: { value: 'Condition text' } });
  };

  const setDate = (container: HTMLElement, id: string, value: string) => {
    const input = container.querySelector(id)! as HTMLInputElement;
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  it('allows expiry equal to the effective date', async () => {
    mockCreate.mockResolvedValue({ scaleConditionClassCode: 'SCA', scaleAuthConditionId: 42 });
    const { container } = await openCreateForm();

    fillValidNonSia(container);
    setDate(container, '#condition-effective-date', '2020-01-01');
    setDate(container, '#condition-expiry-date', '2020-01-01');

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(screen.queryByText('Expiry Date must be on or after Effective Date.')).not.toBeInTheDocument();
  });

  it('rejects a sort order above the allowed range', async () => {
    const { container } = await openCreateForm();

    fillValidNonSia(container);
    fireEvent.change(container.querySelector('#condition-sort-order')!, { target: { value: '10000' } });
    setDate(container, '#condition-effective-date', '2020-01-01');

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    expect(await screen.findByText('Sort Order must be between 0 and 9999.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric sort order', async () => {
    const { container } = await openCreateForm();

    fillValidNonSia(container);
    fireEvent.change(container.querySelector('#condition-sort-order')!, { target: { value: 'abc' } });
    setDate(container, '#condition-effective-date', '2020-01-01');

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    expect(await screen.findByText('Sort Order must be a number.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('surfaces a save error and keeps the create form open', async () => {
    mockCreate.mockRejectedValue({ response: { data: { message: 'Duplicate condition.' } } });
    const { container } = await openCreateForm();

    fillValidNonSia(container);
    setDate(container, '#condition-effective-date', '2020-01-01');

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    expect(await screen.findByText('Duplicate condition.')).toBeInTheDocument();
    expect(screen.getByText('Maintain Conditions - Create')).toBeInTheDocument();
  });
});
