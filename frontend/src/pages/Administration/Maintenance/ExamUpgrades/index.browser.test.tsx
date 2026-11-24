import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../config/tests/setup-env';
import type { AuthContextType } from '../../../../context/auth/AuthContext';
import * as authModule from '../../../../context/auth/useAuth';

import ExamUpgradesAdminPage from './index';

const mockList = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockGetStaticLov = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    examUpgrades: {
      listExamUpgrades: (...args: unknown[]) => mockList(...args),
      getExamUpgrade: (...args: unknown[]) => mockGet(...args),
      createExamUpgrade: (...args: unknown[]) => mockCreate(...args),
      updateExamUpgrade: (...args: unknown[]) => mockUpdate(...args),
      deleteExamUpgrade: (...args: unknown[]) => mockDelete(...args),
    },
    lov: { getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args) },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));

const listRow = { scalerTrainingClassCode: 'CS', scalerTrainingTypeId: '7', description: 'Upgrade Seven' };
const detail = { ...listRow, licenceAccreditInd: 'Y', effectiveDate: '2020-01-01', expiryDate: null };

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { ...render(<ExamUpgradesAdminPage />, { wrapper }), queryClient };
};

describe('ExamUpgradesAdminPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    sessionStorage.clear();
    [mockList, mockGet, mockCreate, mockUpdate, mockDelete, mockGetStaticLov].forEach((m) => m.mockReset());
    mockList.mockResolvedValue([listRow]);
    mockGet.mockResolvedValue(detail);
    mockDelete.mockResolvedValue(undefined);
    mockGetStaticLov.mockResolvedValue([{ code: 'CS', description: 'Check Scaler' }]);
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
    expect(await screen.findByText('Upgrade Seven')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
  });

  it('validates the create form', async () => {
    renderPage();
    await screen.findByText('Upgrade Seven');
    fireEvent.click(screen.getByRole('button', { name: /Add Exam \/ Upgrade/ }));
    await screen.findByText('Maintain Exams / Upgrades - Create');
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    expect(await screen.findByText('Description is required.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a description longer than 120 characters with a field-level message', async () => {
    const { container } = renderPage();
    await screen.findByText('Upgrade Seven');
    fireEvent.click(screen.getByRole('button', { name: /Add Exam \/ Upgrade/ }));
    await screen.findByText('Maintain Exams / Upgrades - Create');

    fireEvent.change(container.querySelector('#exam-upgrade-type')!, { target: { value: 'CS' } });
    fireEvent.change(container.querySelector('#exam-upgrade-licence-accredit')!, { target: { value: 'Y' } });
    fireEvent.change(container.querySelector('#exam-upgrade-description')!, { target: { value: 'x'.repeat(121) } });
    const eff = container.querySelector('#exam-upgrade-effective-date')! as HTMLInputElement;
    fireEvent.change(eff, { target: { value: '2026-06-15' } });
    fireEvent.blur(eff);

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    expect(
      await screen.findByText('Description can not be greater than 120 characters.'),
    ).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('allows expiry equal to the effective date', async () => {
    mockCreate.mockResolvedValue(detail);
    const { container } = renderPage();
    await screen.findByText('Upgrade Seven');
    fireEvent.click(screen.getByRole('button', { name: /Add Exam \/ Upgrade/ }));
    await screen.findByText('Maintain Exams / Upgrades - Create');

    fireEvent.change(container.querySelector('#exam-upgrade-type')!, { target: { value: 'CS' } });
    fireEvent.change(container.querySelector('#exam-upgrade-licence-accredit')!, { target: { value: 'Y' } });
    fireEvent.change(container.querySelector('#exam-upgrade-description')!, {
      target: { value: 'Upgrade Seven' },
    });

    const eff = container.querySelector('#exam-upgrade-effective-date')! as HTMLInputElement;
    fireEvent.change(eff, { target: { value: '2026-06-15' } });
    fireEvent.blur(eff);
    const exp = container.querySelector('#exam-upgrade-expiry-date')! as HTMLInputElement;
    fireEvent.change(exp, { target: { value: '2026-06-15' } });
    fireEvent.blur(exp);

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    // Equal dates must pass the cross-field rule (guards against a `<=` regression).
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toEqual({
      scalerTrainingClassCode: 'CS',
      licenceAccreditInd: 'Y',
      description: 'Upgrade Seven',
      effectiveDate: '2026-06-15',
      expiryDate: '2026-06-15',
    });
    expect(screen.queryByText('Expiry Date must be on or after Effective Date.')).not.toBeInTheDocument();
  });

  it('invalidates the training-type LOV caches after a successful create', async () => {
    mockCreate.mockResolvedValue(detail);
    // Seed the session cache the Scaler edit / query dropdowns share; the save must drop it so those
    // dropdowns re-fetch and show the new type instead of serving this stale, pre-mutation list.
    sessionStorage.setItem(
      'lov-cache:scaler-training-type-lov',
      JSON.stringify([{ code: 'OLD', description: 'Old Type' }]),
    );
    const { container, queryClient } = renderPage();
    const removeSpy = vi.spyOn(queryClient, 'removeQueries');
    await screen.findByText('Upgrade Seven');
    fireEvent.click(screen.getByRole('button', { name: /Add Exam \/ Upgrade/ }));
    await screen.findByText('Maintain Exams / Upgrades - Create');

    fireEvent.change(container.querySelector('#exam-upgrade-type')!, { target: { value: 'CS' } });
    fireEvent.change(container.querySelector('#exam-upgrade-licence-accredit')!, { target: { value: 'Y' } });
    fireEvent.change(container.querySelector('#exam-upgrade-description')!, { target: { value: 'New Type' } });
    const eff = container.querySelector('#exam-upgrade-effective-date')! as HTMLInputElement;
    fireEvent.change(eff, { target: { value: '2026-06-15' } });
    fireEvent.blur(eff);

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['lov', 'scaler-training-type-lov'] }),
    );
    expect(sessionStorage.getItem('lov-cache:scaler-training-type-lov')).toBeNull();
  });

  it('fetches the detail record on view and switches to edit', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '7' }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('CS', '7', 'token'));
    expect(await screen.findByText('Exam / Upgrade Detail')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Edit Record/ }));
    expect(await screen.findByText('Maintain Exams / Upgrades - Edit')).toBeInTheDocument();
  });

  it('re-queries automatically when a filter option is selected', async () => {
    renderPage();
    await screen.findByRole('button', { name: '7' });
    fireEvent.change(screen.getByLabelText('Filter'), { target: { value: 'CS' } });
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(mockList.mock.calls[1][0]).toBe('CS');
  });

  it('deletes with its composite key through the confirm modal', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '7' }));
    await screen.findByText('Exam / Upgrade Detail');
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    const confirm = await screen.findByText('Are you sure you want to delete this record?');
    fireEvent.click(within(confirm.closest('.cds--modal')!).getByRole('button', { name: /OK/ }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('CS', '7', 'token'));
  });
});
