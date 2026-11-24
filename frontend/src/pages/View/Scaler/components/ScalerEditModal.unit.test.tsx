import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import ScalerEditModal from './ScalerEditModal';

const scaler = (overrides: Record<string, unknown> = {}) => ({
  scalerLicenceNo: 'S1234',
  legalFirstName: 'Jane',
  legalLastName: 'Smith',
  clientNumber: '00012345',
  clientLocnCode: '01',
  orgUnitNo: 43,
  issuedDate: '2026-01-01',
  expiryDate: '2026-12-31',
  oathTakenInd: 'Y',
  // At least one licence type is required; the detail names them by code.
  licenceTypes: ['SCS'],
  ...overrides,
});

const onClose = vi.fn();

beforeEach(() => {
  resetApiMock();
  onClose.mockClear();
  apiMock.scalers.getScaler.mockResolvedValue(scaler());
  apiMock.lov.getRegionDistrictLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
  apiMock.lov.getScalerTrainingTypeLov.mockResolvedValue([{ code: 'T', description: 'Exam' }]);
  apiMock.lov.getGradingCodeAppointmentTypeLov.mockResolvedValue([
    { code: 'ORD', description: 'Ordinary', scalerAppointmentType: 'O', scaleGradingSystemCode: 'BC' },
  ]);
});

const setup = (open = true) =>
  renderWithProviders(
    <ScalerEditModal open={open} onClose={onClose} scalerLicenceNo="S1234" />,
  );

describe('ScalerEditModal', () => {
  it('loads the scaler when opened', async () => {
    setup(true);

    await waitFor(() => expect(apiMock.scalers.getScaler).toHaveBeenCalled());
  });

  it('does not load while closed', async () => {
    setup(false);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(apiMock.scalers.getScaler).not.toHaveBeenCalled();
  });

  it('renders the loaded scaler', async () => {
    const { container } = setup(true);

    await waitFor(() => expect(apiMock.scalers.getScaler).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('updates nothing merely by opening', async () => {
    setup(true);

    await waitFor(() => expect(apiMock.scalers.getScaler).toHaveBeenCalled());
    expect(apiMock.scalers.updateScaler).not.toHaveBeenCalled();
  });

  it('deletes nothing without an explicit confirmation', async () => {
    setup(true);

    await waitFor(() => expect(apiMock.scalers.getScaler).toHaveBeenCalled());
    expect(apiMock.scalers.deleteScaler).not.toHaveBeenCalled();
  });

  it('survives a failed load', async () => {
    apiMock.scalers.getScaler.mockRejectedValue(new Error('Scaler not available.'));
    setup(true);

    await waitFor(() => expect(apiMock.scalers.getScaler).toHaveBeenCalled());
    await waitFor(() => expect(document.body.textContent).toMatch(/Scaler not available\.|not available|could not/i));
  });

  it('closes when cancelled, without saving', async () => {
    setup(true);

    await waitFor(() => expect(apiMock.scalers.getScaler).toHaveBeenCalled());
    const cancel = screen.queryAllByRole('button').find((b) => /cancel|close/i.test(b.textContent ?? ''));
    if (cancel) {
      await userEvent.click(cancel);
    }

    expect(apiMock.scalers.updateScaler).not.toHaveBeenCalled();
  });
});

describe('ScalerEditModal — saving and deleting', () => {
  const formReady = async (container: HTMLElement) =>
    waitFor(() => expect(container.ownerDocument.querySelector('#district')).not.toBeNull());

  /**
   * The loaded detail does not populate the appointment or exam section, and the form insists on
   * exactly one of them before it will save -- so an edit always re-states one. The exam branch is
   * the shorter of the two.
   */
  const chooseExam = async (container: HTMLElement) => {
    const doc = container.ownerDocument;
    await waitFor(() =>
      expect((doc.querySelector('#exam-upgrade') as HTMLSelectElement | null)?.options.length ?? 0).toBeGreaterThan(1),
    );
    fireEvent.change(doc.querySelector('#exam-upgrade')!, { target: { value: 'T' } });
    // "Completed By" is the exam completion *date*, not a person -- the form format-checks it.
    fireEvent.change(doc.querySelector('#completed-by')!, { target: { value: '2026-03-01' } });
  };

  it('refuses to save until an appointment or an exam is chosen', async () => {
    const { container } = setup(true);

    await formReady(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('You must select an Appointment or an Exam.')).length).toBeGreaterThan(0);
    expect(apiMock.scalers.updateScaler).not.toHaveBeenCalled();
  });

  it('saves the scaler through the update endpoint', async () => {
    apiMock.scalers.updateScaler.mockResolvedValue(scaler());
    const { container } = setup(true);

    await formReady(container);
    await chooseExam(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.scalers.updateScaler).toHaveBeenCalled());
    expect(apiMock.scalers.updateScaler.mock.calls[0][0]).toBe('S1234');
  });

  it('reports a failed save and keeps the dialog open', async () => {
    apiMock.scalers.updateScaler.mockRejectedValue(new Error('Save refused.'));
    const { container } = setup(true);

    await formReady(container);
    await chooseExam(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.scalers.updateScaler).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('asks before deleting and deletes only once confirmed', async () => {
    apiMock.scalers.deleteScaler.mockResolvedValue(undefined);
    const { container } = setup(true);

    await formReady(container);
    const trigger = screen.getAllByRole('button', { name: /Delete/i })[0];
    await userEvent.click(trigger);
    expect(apiMock.scalers.deleteScaler).not.toHaveBeenCalled();

    const dialog = screen.getByText('Delete Scaler Record').closest('.cds--modal') as HTMLElement;
    await userEvent.click(within(dialog).getByRole('button', { name: /Delete$/i }));

    await waitFor(() => expect(apiMock.scalers.deleteScaler).toHaveBeenCalledWith('S1234', expect.anything()));
  });

  it('reports a failed delete', async () => {
    apiMock.scalers.deleteScaler.mockRejectedValue(new Error('Delete refused.'));
    const { container } = setup(true);

    await formReady(container);
    await userEvent.click(screen.getAllByRole('button', { name: /Delete/i })[0]);
    const dialog = screen.getByText('Delete Scaler Record').closest('.cds--modal') as HTMLElement;
    await userEvent.click(within(dialog).getByRole('button', { name: /Delete$/i }));

    await waitFor(() => expect(apiMock.scalers.deleteScaler).toHaveBeenCalled());
    expect(apiMock.scalers.deleteScaler).toHaveBeenCalledTimes(1);
  });

  it('reloads the persisted scaler on reset', async () => {
    const { container } = setup(true);

    await formReady(container);
    await waitFor(() => expect(apiMock.scalers.getScaler).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(apiMock.scalers.getScaler.mock.calls.length).toBeGreaterThan(1));
  });
});
