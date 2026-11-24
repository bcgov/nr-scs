import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../config/tests/setup-env';

const mockGetScaler = vi.fn();
const mockUpdateScaler = vi.fn();
const mockDeleteScaler = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/context/auth/useAuth', () => ({
  // An administrator: these cases exercise Delete Record, which is gated on SCALER_DELETE now that the
  // scaling managers hold SCALER_UPDATE without it (§C's "Summary – Edit" is RU, RUD only for ADM).
  useAuth: () => ({
    userToken: async () => 'tok',
    user: { roles: ['SCS_SYS_ADMIN'], privileges: {} },
  }),
}));

vi.mock('@/hooks/useLovOptions', () => ({
  useLovOptions: (_loader: unknown, opts?: { cacheKey?: string }) =>
    opts?.cacheKey === 'grading-code-appointment-type-lov'
      ? {
          data: [
            {
              code: 'FORS-BC',
              description: 'Forest Service (BC)',
              scalerAppointmentType: 'FORS',
              scaleGradingSystemCode: 'BC',
            },
          ],
          error: null,
          isLoading: false,
        }
      : {
          data: [{ code: '1', description: 'Initial exam' }],
          error: null,
          isLoading: false,
        },
}));

vi.mock('@/services/APIs', () => ({
  BackendApiConfig: { BASE: '/api' },
  default: {
    scalers: {
      getScaler: (...args: unknown[]) => mockGetScaler(...args),
      updateScaler: (...args: unknown[]) => mockUpdateScaler(...args),
      deleteScaler: (...args: unknown[]) => mockDeleteScaler(...args),
    },
    lov: {
      getGradingCodeAppointmentTypeLov: vi.fn(),
      getScalerTrainingTypeLov: vi.fn(),
    },
  },
}));

vi.mock('@/components/core/DateInput', () => ({
  default: ({
    id,
    value = '',
    onChange,
    ariaLabel,
    invalid,
    invalidText,
  }: {
    id: string;
    value?: string;
    onChange?: (value: string) => void;
    ariaLabel?: string;
    invalid?: boolean;
    invalidText?: string;
  }) => (
    <div>
      <input
        id={id}
        aria-label={ariaLabel ?? id}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={invalid ? 'true' : 'false'}
      />
      {invalidText ? <div>{invalidText}</div> : null}
    </div>
  ),
}));

vi.mock('@/components/core/DistrictSelect', () => ({
  default: ({
    value,
    onChange,
    labelText,
    invalid,
    invalidText,
  }: {
    value: string;
    onChange: (value: string) => void;
    labelText?: ReactNode;
    invalid?: boolean;
    invalidText?: string;
  }) => (
    <div>
      <label htmlFor="district">{labelText}</label>
      <select id="district" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        <option value="1234">District 1234</option>
        <option value="5678">District 5678</option>
      </select>
      {invalid && invalidText ? <div>{invalidText}</div> : null}
    </div>
  ),
}));

import ScalerEditModal from './ScalerEditModal';

const scalerDetail = (overrides: Record<string, unknown> = {}) => ({
  scalerLicenceNo: '1234',
  clientNumber: '00345678',
  orgUnitNo: 1234,
  issuedDate: '2025-01-15',
  expiryDate: '2027-12-31',
  oathTakenInd: 'Y',
  licenceCancelledDate: null,
  licenceTypes: ['SCS', 'WA'],
  appointment: null,
  exam: null,
  ...overrides,
});

const renderModal = (onClose = vi.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ScalerEditModal open onClose={onClose} scalerLicenceNo="1234" />
    </QueryClientProvider>,
  );
  return onClose;
};

describe('ScalerEditModal', () => {
  beforeEach(() => {
    mockGetScaler.mockReset();
    mockUpdateScaler.mockReset();
    mockDeleteScaler.mockReset();
    mockNavigate.mockReset();
  });

  it('prefills from the fetched record with read-only identity rows, empty sections, enabled Delete', async () => {
    mockGetScaler.mockResolvedValue(scalerDetail());
    renderModal();

    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));
    expect(screen.getByTestId('scaler-edit-client-loc')).toHaveTextContent('00345678 / 00');
    expect(screen.getByLabelText('Effective Date')).toHaveValue('2025-01-15');
    expect(screen.getByLabelText('Expiry Date')).toHaveValue('2027-12-31');
    expect(screen.getByLabelText('Scaling')).toBeChecked();
    expect(screen.getByLabelText('Waste')).toBeChecked();
    // Appointment/exam are add-new sections — never prefilled (legacy viewUpdate parity)
    expect(screen.getByLabelText('Appointment Effective Date')).toHaveValue('');
    expect(screen.getByLabelText('Completed By')).toHaveValue('');
    const deleteButton = screen.getByText('Delete Record').closest('button');
    expect(deleteButton).not.toBeDisabled();
  });

  it('confirms, deletes, closes, and navigates to the create form', async () => {
    mockGetScaler.mockResolvedValue(scalerDetail());
    mockDeleteScaler.mockResolvedValue(undefined);
    const onClose = renderModal();
    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));

    fireEvent.click(screen.getByText('Delete Record'));
    await waitFor(() =>
      expect(screen.getByText('Are you sure you want to delete this record?')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Delete')); // danger confirm primary button

    await waitFor(() => expect(mockDeleteScaler).toHaveBeenCalledWith('1234', 'tok'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/scalers/create'));
  });

  it('cancels the delete confirmation without deleting', async () => {
    mockGetScaler.mockResolvedValue(scalerDetail());
    renderModal();
    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));

    fireEvent.click(screen.getByText('Delete Record'));
    await waitFor(() =>
      expect(screen.getByText('Are you sure you want to delete this record?')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() =>
      expect(screen.queryByText('Are you sure you want to delete this record?')).not.toBeInTheDocument(),
    );
    expect(mockDeleteScaler).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the edit modal open with the legacy child-record banner when the delete is blocked (400)', async () => {
    mockGetScaler.mockResolvedValue(scalerDetail());
    mockDeleteScaler.mockRejectedValue({
      response: {
        data: {
          code: 'BAD_REQUEST',
          message:
            'Database Exception: The record can not be deleted because there are associated records that exist.',
        },
      },
    });
    const onClose = renderModal();
    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));

    fireEvent.click(screen.getByText('Delete Record'));
    await waitFor(() =>
      expect(screen.getByText('Are you sure you want to delete this record?')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(mockDeleteScaler).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByText(
          'Database Exception: The record can not be deleted because there are associated records that exist.',
        ),
      ).toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('enforces the appointment/exam XOR when the scaler has no prior appointment or exam', async () => {
    mockGetScaler.mockResolvedValue(scalerDetail());
    renderModal();
    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));

    fireEvent.click(screen.getByText('Save Record'));

    await waitFor(() =>
      expect(screen.getByText('You must select an Appointment or an Exam.')).toBeInTheDocument(),
    );
    expect(mockUpdateScaler).not.toHaveBeenCalled();
  });

  it('shows the legacy either/not-both error when both sections are filled', async () => {
    mockGetScaler.mockResolvedValue(scalerDetail());
    renderModal();
    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));

    const appointmentSelect = document.getElementById('appointment') as HTMLSelectElement;
    fireEvent.change(appointmentSelect, { target: { value: 'FORS-BC' } });
    fireEvent.change(screen.getByLabelText('Completed By'), { target: { value: '2025-02-01' } });
    fireEvent.click(screen.getByText('Save Record'));

    await waitFor(() =>
      expect(
        screen.getAllByText('Either the Appointment section or the Exam section is required but not both.').length,
      ).toBeGreaterThan(0),
    );
    expect(mockUpdateScaler).not.toHaveBeenCalled();
  });

  it('rejects both sections filled even when a prior appointment relaxes the XOR gate', async () => {
    mockGetScaler.mockResolvedValue(
      scalerDetail({ appointment: { scalerLicenceAttributeId: 5001 }, licenceTypes: ['SCS'] }),
    );
    renderModal();
    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));

    const appointmentSelect = document.getElementById('appointment') as HTMLSelectElement;
    fireEvent.change(appointmentSelect, { target: { value: 'FORS-BC' } });
    fireEvent.change(screen.getByLabelText('Completed By'), { target: { value: '2025-02-01' } });
    fireEvent.click(screen.getByText('Save Record'));

    await waitFor(() =>
      expect(
        screen.getAllByText('Either the Appointment section or the Exam section is required but not both.').length,
      ).toBeGreaterThan(0),
    );
    expect(mockUpdateScaler).not.toHaveBeenCalled();
  });

  it('lets the user clear a selected appointment back to blank (legacy blank default)', async () => {
    mockGetScaler.mockResolvedValue(
      scalerDetail({ appointment: { scalerLicenceAttributeId: 5001 }, licenceTypes: ['SCS'] }),
    );
    mockUpdateScaler.mockResolvedValue(scalerDetail());
    const onClose = renderModal();
    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));

    const appointmentSelect = document.getElementById('appointment') as HTMLSelectElement;
    fireEvent.change(appointmentSelect, { target: { value: 'FORS-BC' } });
    fireEvent.change(appointmentSelect, { target: { value: '' } });
    expect(appointmentSelect.value).toBe('');

    fireEvent.change(document.getElementById('exam-upgrade') as HTMLSelectElement, { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Completed By'), { target: { value: '2025-02-01' } });
    fireEvent.click(screen.getByText('Save Record'));

    await waitFor(() => expect(mockUpdateScaler).toHaveBeenCalledTimes(1));
    expect(mockUpdateScaler.mock.calls[0][1]).toMatchObject({
      appointment: undefined,
      exam: { scalerTrainingTypeId: '1', completionDate: '2025-02-01' },
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('relaxes the XOR when a prior appointment exists and saves with empty sections', async () => {
    mockGetScaler.mockResolvedValue(
      scalerDetail({ appointment: { scalerLicenceAttributeId: 5001 }, licenceTypes: ['SCS'] }),
    );
    mockUpdateScaler.mockResolvedValue(scalerDetail());
    const onClose = renderModal();
    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));

    fireEvent.click(screen.getByText('Save Record'));

    await waitFor(() => expect(mockUpdateScaler).toHaveBeenCalledTimes(1));
    expect(mockUpdateScaler).toHaveBeenCalledWith(
      '1234',
      expect.objectContaining({
        clientNumber: '00345678',
        orgUnitNo: 1234,
        issuedDate: '2025-01-15',
        expiryDate: '2027-12-31',
        licenceTypes: ['SCS'],
        appointment: undefined,
        exam: undefined,
      }),
      'tok',
    );
    // licenceCancelledDate is read-only via this endpoint and must never be sent
    expect(mockUpdateScaler.mock.calls[0][1]).not.toHaveProperty('licenceCancelledDate');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('requires at least one licence type', async () => {
    mockGetScaler.mockResolvedValue(scalerDetail({ licenceTypes: ['SCS'], appointment: { scalerLicenceAttributeId: 1 } }));
    renderModal();
    await waitFor(() => expect(screen.getByLabelText('Scaling')).toBeChecked());

    fireEvent.click(screen.getByLabelText('Scaling'));
    fireEvent.click(screen.getByText('Save Record'));

    await waitFor(() =>
      expect(screen.getAllByText('You must select at least 1 Licence Type.').length).toBeGreaterThan(0),
    );
    expect(mockUpdateScaler).not.toHaveBeenCalled();
  });

  it('requires an expiry date when Waste is selected', async () => {
    mockGetScaler.mockResolvedValue(
      scalerDetail({ licenceTypes: ['SCS'], expiryDate: null, appointment: { scalerLicenceAttributeId: 1 } }),
    );
    renderModal();
    await waitFor(() => expect(screen.getByLabelText('Scaling')).toBeChecked());

    fireEvent.click(screen.getByLabelText('Waste'));
    fireEvent.click(screen.getByText('Save Record'));

    await waitFor(() =>
      expect(
        screen.getAllByText('Expiry Date is required if Licence Type Waste is selected.').length,
      ).toBeGreaterThan(0),
    );
    expect(mockUpdateScaler).not.toHaveBeenCalled();
  });

  it('routes a server field error for a field not displayable in edit mode to the banner', async () => {
    mockGetScaler.mockResolvedValue(
      scalerDetail({ appointment: { scalerLicenceAttributeId: 1 } }),
    );
    mockUpdateScaler.mockRejectedValue({
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for one or more fields.',
          fieldErrors: [
            { field: 'clientNumber', message: 'A scaler already exists for this client.' },
          ],
        },
      },
    });
    renderModal();
    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));

    fireEvent.click(screen.getByText('Save Record'));

    await waitFor(() =>
      expect(
        screen.getAllByText('A scaler already exists for this client.').length,
      ).toBeGreaterThan(0),
    );
  });

  it('surfaces a server error as the form banner', async () => {
    mockGetScaler.mockResolvedValue(
      scalerDetail({ appointment: { scalerLicenceAttributeId: 1 } }),
    );
    mockUpdateScaler.mockRejectedValue({
      response: { data: { message: 'Database Exception: A record already exists with the same unique key.' } },
    });
    renderModal();
    await waitFor(() => expect(screen.getByTestId('scaler-edit-licence-no')).toHaveTextContent('1234'));

    fireEvent.click(screen.getByText('Save Record'));

    await waitFor(() =>
      expect(
        screen.getByText('Database Exception: A record already exists with the same unique key.'),
      ).toBeInTheDocument(),
    );
  });

  it('Reset shows progress while refetching, then re-seeds the form from the persisted record', async () => {
    let releaseRefetch: (value: unknown) => void = () => {};
    mockGetScaler
      .mockResolvedValueOnce(scalerDetail())
      .mockImplementationOnce(
        () => new Promise((resolve) => { releaseRefetch = () => resolve(scalerDetail()); }),
      );
    renderModal();
    await waitFor(() => expect(screen.getByLabelText('Effective Date')).toHaveValue('2025-01-15'));

    fireEvent.change(screen.getByLabelText('Effective Date'), { target: { value: '2026-06-01' } });
    expect(screen.getByLabelText('Effective Date')).toHaveValue('2026-06-01');

    fireEvent.click(screen.getByText('Reset'));

    // While the DB reload is in flight: spinner replaces Reset, Save is disabled
    await waitFor(() => expect(screen.getByText('Resetting…')).toBeInTheDocument());
    expect(screen.getByText('Save Record').closest('button')).toBeDisabled();

    releaseRefetch(undefined);

    await waitFor(() => expect(mockGetScaler).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByLabelText('Effective Date')).toHaveValue('2025-01-15'));
    expect(screen.getByText('Reset')).toBeInTheDocument(); // button restored
    expect(screen.getByText('Save Record').closest('button')).not.toBeDisabled();
  });

  it('shows an error state inside the modal when the record fetch fails', async () => {
    mockGetScaler.mockRejectedValue(new Error('boom'));
    renderModal();

    await waitFor(() =>
      expect(screen.getByText('Could not load the scaler record.')).toBeInTheDocument(),
    );
  });
});
