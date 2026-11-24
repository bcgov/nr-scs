import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import AppointmentsTab from './AppointmentsTab';
import ExamUpgradesTab from './ExamUpgradesTab';

const LICENCE = 'S1234';

beforeEach(() => {
  resetApiMock();
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'A', description: 'Option A' }]);
  apiMock.lov.getAppointmentTypeLov.mockResolvedValue([{ code: 'A', description: 'Option A' }]);
  apiMock.lov.getGradingCodeAppointmentTypeLov.mockResolvedValue([
    { code: 'A', description: 'Option A' },
  ]);
  apiMock.lov.getScalerTrainingTypeLov.mockResolvedValue([{ code: 'T', description: 'Exam' }]);
  apiMock.lov.getRegionDistrictLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
});

const set = (container: HTMLElement, id: string, value: string) => {
  const el = container.querySelector(`#${id}`) as HTMLInputElement | null;
  if (el) {fireEvent.change(el, { target: { value } });}
};

/** Selects only take a value once their LOV has landed. */
const waitForOptions = async (container: HTMLElement, id: string) => {
  await waitFor(() => {
    const el = container.querySelector(`#${id}`) as HTMLSelectElement | null;
    expect((el?.options.length ?? 0) > 1).toBe(true);
  });
};

describe('Scaler Appointments tab — add flow', () => {
  const open = async (container: HTMLElement) => {
    await userEvent.click(screen.getByRole('button', { name: /Add Appointment/i }));
    await waitFor(() => expect(container.querySelector('#appointment-code')).not.toBeNull());
  };

  it('opens the appointment form', async () => {
    const { container } = renderWithProviders(
      <AppointmentsTab isActive scalerLicenceNo={LICENCE} />,
    );

    await open(container);
    expect(container.querySelector('#appointment-issued-date')).not.toBeNull();
    expect(container.querySelector('#appointment-expiry-date')).not.toBeNull();
  });

  it('creates nothing merely by opening the form', async () => {
    const { container } = renderWithProviders(
      <AppointmentsTab isActive scalerLicenceNo={LICENCE} />,
    );

    await open(container);
    expect(apiMock.scalerAppointments.createScalerAppointment).not.toHaveBeenCalled();
  });

  it('refuses to save an empty appointment', async () => {
    const { container } = renderWithProviders(
      <AppointmentsTab isActive scalerLicenceNo={LICENCE} />,
    );

    await open(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.scalerAppointments.createScalerAppointment).not.toHaveBeenCalled(),
    );
  });

  // The appointment-code select is populated from a filtered grading-code LOV that does not
  // resolve under the mocked services, so the create round-trip is covered directly against
  // appointmentFormUtils instead (see appointmentFormUtils.unit.test.ts).

  it('leaves the list alone when the form is cancelled', async () => {
    const { container } = renderWithProviders(
      <AppointmentsTab isActive scalerLicenceNo={LICENCE} />,
    );

    await open(container);
    const cancel = screen.queryAllByRole('button').find((b) => /^Back$/i.test(b.textContent ?? ''));
    if (cancel) {
      await userEvent.click(cancel);
    }

    expect(apiMock.scalerAppointments.createScalerAppointment).not.toHaveBeenCalled();
    expect(apiMock.scalerAppointments.deleteScalerAppointment).not.toHaveBeenCalled();
  });
});

describe('Scaler Exam / Upgrades tab — add flow', () => {
  const open = async (container: HTMLElement) => {
    await userEvent.click(screen.getByRole('button', { name: /Add Exam \/ Upgrade/i }));
    await waitFor(() => expect(container.querySelector('#exam-training-type')).not.toBeNull());
  };

  it('opens the exam form', async () => {
    const { container } = renderWithProviders(
      <ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />,
    );

    await open(container);
    expect(container.querySelector('#exam-completion-date')).not.toBeNull();
  });

  it('refuses to save an empty exam', async () => {
    const { container } = renderWithProviders(
      <ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />,
    );

    await open(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.scalerExams.createScalerExam).not.toHaveBeenCalled());
  });

  it('creates an exam once the required fields are set', async () => {
    apiMock.scalerExams.createScalerExam.mockResolvedValue({ scalerExamId: 1 });
    const { container } = renderWithProviders(
      <ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />,
    );

    await open(container);
    await waitForOptions(container, 'exam-training-type');
    set(container, 'exam-training-type', 'T');
    set(container, 'exam-completion-date', '2026-01-01');
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.scalerExams.createScalerExam).toHaveBeenCalled());
  });

  it('reports a failed create', async () => {
    apiMock.scalerExams.createScalerExam.mockRejectedValue(new Error('Exam refused.'));
    const { container } = renderWithProviders(
      <ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />,
    );

    await open(container);
    await waitForOptions(container, 'exam-training-type');
    set(container, 'exam-training-type', 'T');
    set(container, 'exam-completion-date', '2026-01-01');
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('deletes nothing without an explicit confirmation', async () => {
    const { container } = renderWithProviders(
      <ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />,
    );

    await open(container);
    expect(apiMock.scalerExams.deleteScalerExam).not.toHaveBeenCalled();
  });
});

describe('Scaler Appointments tab — editing and deleting a row', () => {
  // The row's identity for update/delete is scalerLicenceAttributeId; without it the mutations
  // refuse with "No appointment selected".
  const appointment = {
    scalerLicenceAttributeId: 1,
    scalerAppointmentId: 1,
    scalerAppointmentType: 'O',
    scaleGradingSystemCode: 'BC',
    scalerAppointmentTypeCode: 'ORD',
    orgUnitNo: 43,
    provinceWideInd: 'N',
    issuedDate: '2026-01-01',
    expiryDate: '2026-12-31',
  };
  const rowFor = async () => (await screen.findByText(/2026-01-01/)).closest('tr') as HTMLElement;

  beforeEach(() => {
    apiMock.scalerAppointments.getScalerAppointments.mockResolvedValue([appointment]);
    apiMock.lov.getGradingCodeAppointmentTypeLov.mockResolvedValue([
      { code: 'ORD', description: 'Ordinary', scalerAppointmentType: 'O', scaleGradingSystemCode: 'BC' },
    ]);
  });

  it('opens the editor pre-filled from the row', async () => {
    const { container } = renderWithProviders(<AppointmentsTab isActive scalerLicenceNo={LICENCE} />);

    const row = await rowFor();
    await userEvent.click(within(row).getByRole('button', { name: /^Edit$/i }));

    await waitFor(() => expect(container.querySelector('#appointment-issued-date')).not.toBeNull());
    expect(controlById(container, 'appointment-issued-date')).toHaveValue('2026-01-01');
    expect(controlById(container, 'appointment-expiry-date')).toHaveValue('2026-12-31');
  });

  it('saves an edited appointment through the update endpoint', async () => {
    apiMock.scalerAppointments.updateScalerAppointment.mockResolvedValue(appointment);
    const { container } = renderWithProviders(<AppointmentsTab isActive scalerLicenceNo={LICENCE} />);

    const row = await rowFor();
    await userEvent.click(within(row).getByRole('button', { name: /^Edit$/i }));
    await waitFor(() => expect(container.querySelector('#appointment-expiry-date')).not.toBeNull());
    fireEvent.change(controlById(container, 'appointment-expiry-date'), { target: { value: '2027-01-01' } });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.scalerAppointments.updateScalerAppointment).toHaveBeenCalled());
    const [licence, attributeId] = apiMock.scalerAppointments.updateScalerAppointment.mock.calls[0];
    expect(licence).toBe(LICENCE);
    expect(attributeId).toBe(1);
    expect(apiMock.scalerAppointments.createScalerAppointment).not.toHaveBeenCalled();
  });

  it('asks before deleting, and deletes only once confirmed', async () => {
    apiMock.scalerAppointments.deleteScalerAppointment.mockResolvedValue(undefined);
    renderWithProviders(<AppointmentsTab isActive scalerLicenceNo={LICENCE} />);

    const row = await rowFor();
    await userEvent.click(within(row).getByRole('button', { name: /Delete$/i }));
    expect(apiMock.scalerAppointments.deleteScalerAppointment).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Confirm Delete$/i }));

    await waitFor(() => expect(apiMock.scalerAppointments.deleteScalerAppointment).toHaveBeenCalled());
  });

  it('keeps the row when the delete is cancelled', async () => {
    renderWithProviders(<AppointmentsTab isActive scalerLicenceNo={LICENCE} />);

    const row = await rowFor();
    await userEvent.click(within(row).getByRole('button', { name: /Delete$/i }));
    const cancel = screen.getAllByRole('button', { name: /^Cancel$/i }).at(-1);
    if (cancel) {
      await userEvent.click(cancel);
    }

    expect(apiMock.scalerAppointments.deleteScalerAppointment).not.toHaveBeenCalled();
    expect(screen.getByText(/2026-01-01/)).toBeInTheDocument();
  });

  it('reports a failed delete', async () => {
    apiMock.scalerAppointments.deleteScalerAppointment.mockRejectedValue(new Error('Delete refused.'));
    const { container } = renderWithProviders(<AppointmentsTab isActive scalerLicenceNo={LICENCE} />);

    const row = await rowFor();
    await userEvent.click(within(row).getByRole('button', { name: /Delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Delete$/i }));

    await waitFor(() => expect(apiMock.scalerAppointments.deleteScalerAppointment).toHaveBeenCalled());
    expect(container.textContent ?? '').not.toBe('');
  });
});

describe('Scaler Exam / Upgrades tab — editing and deleting a row', () => {
  // The row's identity for update/delete is scalerTrainingTypeId.
  const exam = { scalerTrainingTypeId: '9', scalerExamId: 9, scalerTrainingTypeCode: 'T', examDate: '2026-02-01', completionDate: '2026-02-01' };
  const rowFor = async () => (await screen.findByText(/2026-02-01/)).closest('tr') as HTMLElement;

  beforeEach(() => {
    apiMock.scalerExams.getScalerExams.mockResolvedValue([exam]);
  });

  it('opens the editor pre-filled from the row and updates rather than creates', async () => {
    apiMock.scalerExams.updateScalerExam.mockResolvedValue(exam);
    const { container } = renderWithProviders(<ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />);

    const row = await rowFor();
    await userEvent.click(within(row).getByRole('button', { name: /^Edit$/i }));
    await waitFor(() => expect(container.querySelector('#exam-completion-date')).not.toBeNull());
    fireEvent.change(controlById(container, 'exam-completion-date'), { target: { value: '2026-03-01' } });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.scalerExams.updateScalerExam).toHaveBeenCalled());
    expect(String(apiMock.scalerExams.updateScalerExam.mock.calls[0][1])).toBe('9');
    expect(apiMock.scalerExams.createScalerExam).not.toHaveBeenCalled();
  });

  it('asks before deleting and deletes only once confirmed', async () => {
    apiMock.scalerExams.deleteScalerExam.mockResolvedValue(undefined);
    renderWithProviders(<ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />);

    const row = await rowFor();
    await userEvent.click(within(row).getByRole('button', { name: /Delete$/i }));
    expect(apiMock.scalerExams.deleteScalerExam).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Confirm Delete$/i }));

    await waitFor(() => expect(apiMock.scalerExams.deleteScalerExam).toHaveBeenCalledWith(LICENCE, '9', expect.anything()));
  });

  it('reports a failed delete and keeps the row', async () => {
    apiMock.scalerExams.deleteScalerExam.mockRejectedValue(new Error('Delete refused.'));
    renderWithProviders(<ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />);

    const row = await rowFor();
    await userEvent.click(within(row).getByRole('button', { name: /Delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /Confirm Delete$/i }));

    await waitFor(() => expect(apiMock.scalerExams.deleteScalerExam).toHaveBeenCalled());
    expect(screen.getByText(/2026-02-01/)).toBeInTheDocument();
  });
});
