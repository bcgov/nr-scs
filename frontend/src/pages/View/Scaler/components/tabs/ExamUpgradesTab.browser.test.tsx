// @vitest-environment happy-dom

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import ExamUpgradesTab from './ExamUpgradesTab';

const mockGetScalerExams = vi.fn();
const mockCreateScalerExam = vi.fn();
const mockUpdateScalerExam = vi.fn();
const mockDeleteScalerExam = vi.fn();
const mockGetScalerTrainingTypeLov = vi.fn();
const mockGetStaticLov = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    scalerExams: {
      getScalerExams: (...args: unknown[]) => mockGetScalerExams(...args),
      createScalerExam: (...args: unknown[]) => mockCreateScalerExam(...args),
      updateScalerExam: (...args: unknown[]) => mockUpdateScalerExam(...args),
      deleteScalerExam: (...args: unknown[]) => mockDeleteScalerExam(...args),
    },
    lov: {
      getScalerTrainingTypeLov: (...args: unknown[]) => mockGetScalerTrainingTypeLov(...args),
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
    },
  },
  BackendApiConfig: { BASE: '/api', TOKEN: async () => null },
}));

describe('ExamUpgradesTab', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const createAuthContextValue = (): AuthContextType => ({
    // An administrator, so permission-gated controls render: these tests are about the
    // component behaviour, not authorization (see permissions.unit.test.ts for that).
    user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  const renderTab = (isActive = true, scalerLicenceNo = '1234') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <ExamUpgradesTab isActive={isActive} scalerLicenceNo={scalerLicenceNo} />
      </QueryClientProvider>,
    );
  };

  // The training type Select renders a native <select> we drive by id.
  const trainingTypeSelect = (container: HTMLElement) =>
    container.querySelector<HTMLSelectElement>('#exam-training-type')!;

  beforeEach(() => {
    mockGetScalerExams.mockReset();
    mockCreateScalerExam.mockReset();
    mockUpdateScalerExam.mockReset();
    mockDeleteScalerExam.mockReset();
    mockGetScalerTrainingTypeLov.mockReset();
    mockGetStaticLov.mockReset();
    mockGetScalerTrainingTypeLov.mockResolvedValue([
      { code: 'SCEX', description: 'Scaling Exam', scalerTrainingClassCode: 'SC' },
    ]);
    mockGetStaticLov.mockResolvedValue([{ code: 'SC', description: 'Scaler' }]);
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('renders exam rows with resolved type and class descriptions', async () => {
    mockGetScalerExams.mockResolvedValue([
      {
        scalerLicenceNo: '1234',
        scalerTrainingTypeId: 'SCEX',
        scalerTrainingClassCode: 'SC',
        completionDate: '2025-01-10',
      },
    ]);

    renderTab();

    // Completion date is unique to the table row; type/class descriptions also appear
    // in the always-rendered modal dropdowns, so scope those lookups to the table.
    const dateCell = await screen.findByText('2025-01-10');
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Scaling Exam')).toBeInTheDocument();
    expect(table.getByText('Scaler')).toBeInTheDocument();
    expect(dateCell).toBeInTheDocument();
  });

  it('shows the empty state when the scaler has no exams', async () => {
    mockGetScalerExams.mockResolvedValue([]);

    renderTab();

    expect(await screen.findByText('No exams / upgrades found for this scaler.')).toBeInTheDocument();
  });

  it('shows an error notification when the request fails', async () => {
    mockGetScalerExams.mockRejectedValue(new Error('Boom'));

    renderTab();

    expect(await screen.findByText('Exams / upgrades unavailable.')).toBeInTheDocument();
  });

  it('does not call the API when the tab is inactive', () => {
    renderTab(false);

    expect(mockGetScalerExams).not.toHaveBeenCalled();
  });

  it('opens the create modal when Add Exam / Upgrade is clicked', async () => {
    mockGetScalerExams.mockResolvedValue([]);

    renderTab();

    const addButton = await screen.findByRole('button', { name: 'Add Exam / Upgrade' });
    await userEvent.click(addButton);

    expect(await screen.findByText('Exams / Upgrades - Create')).toBeInTheDocument();
  });

  it('creates an exam with the derived class code omitted from the payload', async () => {
    mockGetScalerExams.mockResolvedValue([]);
    mockCreateScalerExam.mockResolvedValue({});

    const { container } = renderTab();

    await userEvent.click(await screen.findByRole('button', { name: 'Add Exam / Upgrade' }));
    await userEvent.selectOptions(trainingTypeSelect(container), 'SCEX');
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() =>
      expect(mockCreateScalerExam).toHaveBeenCalledWith(
        '1234',
        { scalerTrainingTypeId: 'SCEX', completionDate: null },
        'token',
      ),
    );
  });

  it('blocks save and warns when no exam / upgrade type is selected', async () => {
    mockGetScalerExams.mockResolvedValue([]);

    renderTab();

    await userEvent.click(await screen.findByRole('button', { name: 'Add Exam / Upgrade' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    expect(await screen.findByText('Exam / Upgrade is required.')).toBeInTheDocument();
    expect(mockCreateScalerExam).not.toHaveBeenCalled();
  });

  it('updates an exam with the type Select disabled (immutable PK)', async () => {
    mockGetScalerExams.mockResolvedValue([
      {
        scalerLicenceNo: '1234',
        scalerTrainingTypeId: 'SCEX',
        scalerTrainingClassCode: 'SC',
        completionDate: '2025-01-10',
      },
    ]);
    mockUpdateScalerExam.mockResolvedValue({});

    const { container } = renderTab();

    const table = within(await screen.findByRole('table'));
    await userEvent.click(table.getByRole('button', { name: 'Edit' }));

    expect(await screen.findByText('Exams / Upgrades - Edit')).toBeInTheDocument();
    expect(trainingTypeSelect(container).disabled).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() =>
      expect(mockUpdateScalerExam).toHaveBeenCalledWith(
        '1234',
        'SCEX',
        { scalerTrainingTypeId: 'SCEX', completionDate: '2025-01-10' },
        'token',
      ),
    );
  });

  it('deletes an exam after confirming in the modal', async () => {
    mockGetScalerExams.mockResolvedValue([
      {
        scalerLicenceNo: '1234',
        scalerTrainingTypeId: 'SCEX',
        scalerTrainingClassCode: 'SC',
        completionDate: '2025-01-10',
      },
    ]);
    mockDeleteScalerExam.mockResolvedValue(undefined);

    renderTab();

    const table = within(await screen.findByRole('table'));
    await userEvent.click(table.getByRole('button', { name: /Delete/ }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Confirm Delete/ }),
    );

    await waitFor(() =>
      expect(mockDeleteScalerExam).toHaveBeenCalledWith('1234', 'SCEX', 'token'),
    );
  });

  it('filters the table by class code', async () => {
    mockGetStaticLov.mockResolvedValue([
      { code: 'SC', description: 'Scaler' },
      { code: 'OT', description: 'Other' },
    ]);
    mockGetScalerExams.mockResolvedValue([
      {
        scalerLicenceNo: '1234',
        scalerTrainingTypeId: 'SCEX',
        scalerTrainingClassCode: 'SC',
        completionDate: '2025-01-10',
      },
      {
        scalerLicenceNo: '1234',
        scalerTrainingTypeId: 'UPGR',
        scalerTrainingClassCode: 'OT',
        completionDate: '2024-05-05',
      },
    ]);

    const { container } = renderTab();

    expect(await screen.findByText('2025-01-10')).toBeInTheDocument();
    expect(screen.getByText('2024-05-05')).toBeInTheDocument();

    const filter = container.querySelector<HTMLSelectElement>('#exam-class-code-filter')!;
    await userEvent.selectOptions(filter, 'OT');

    expect(screen.queryByText('2025-01-10')).not.toBeInTheDocument();
    expect(screen.getByText('2024-05-05')).toBeInTheDocument();
  });
});
