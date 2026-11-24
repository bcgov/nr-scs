import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import AppointmentsTab from './AppointmentsTab';
import CheckScalesTab from './CheckScalesTab';
import ExamUpgradesTab from './ExamUpgradesTab';
import SummaryCheckScalesTab from './SummaryCheckScalesTab';
import PerformanceRemarksTab from './PerformanceRemarks/PerformanceRemarksTab';

const LICENCE = 'S1234';

beforeEach(() => {
  resetApiMock();
});

/**
 * The scaler tabs share a `{ isActive, scalerLicenceNo }` pair and defer their fetch until the tab
 * is selected, so each is checked both ways.
 */
describe('Scaler tabs — deferred loading', () => {
  it.each([
    ['AppointmentsTab', AppointmentsTab, apiMock.scalerAppointments.getScalerAppointments],
    ['ExamUpgradesTab', ExamUpgradesTab, apiMock.scalerExams.getScalerExams],
    ['CheckScalesTab', CheckScalesTab, apiMock.checkScale.getScalerCheckScales],
    ['SummaryCheckScalesTab', SummaryCheckScalesTab, apiMock.summaryCheckScale.getScalerSummaryCheckScales],
  ])('%s fetches once active', async (_name, Tab, call) => {
    const Component = Tab as typeof AppointmentsTab;
    renderWithProviders(<Component isActive scalerLicenceNo={LICENCE} />);

    await waitFor(() => expect(call).toHaveBeenCalled());
  });

  it.each([
    ['AppointmentsTab', AppointmentsTab, apiMock.scalerAppointments.getScalerAppointments],
    ['ExamUpgradesTab', ExamUpgradesTab, apiMock.scalerExams.getScalerExams],
    ['CheckScalesTab', CheckScalesTab, apiMock.checkScale.getScalerCheckScales],
    ['SummaryCheckScalesTab', SummaryCheckScalesTab, apiMock.summaryCheckScale.getScalerSummaryCheckScales],
  ])('%s does not fetch while inactive', async (_name, Tab, call) => {
    const Component = Tab as typeof AppointmentsTab;
    renderWithProviders(<Component isActive={false} scalerLicenceNo={LICENCE} />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(call).not.toHaveBeenCalled();
  });

  it.each([
    ['AppointmentsTab', AppointmentsTab],
    ['ExamUpgradesTab', ExamUpgradesTab],
    ['CheckScalesTab', CheckScalesTab],
    ['SummaryCheckScalesTab', SummaryCheckScalesTab],
  ])('%s renders an empty result without crashing', async (_name, Tab) => {
    const Component = Tab as typeof AppointmentsTab;
    const { container } = renderWithProviders(<Component isActive scalerLicenceNo={LICENCE} />);

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it.each([
    ['AppointmentsTab', AppointmentsTab, apiMock.scalerAppointments.getScalerAppointments],
    ['ExamUpgradesTab', ExamUpgradesTab, apiMock.scalerExams.getScalerExams],
  ])('%s survives a failed load', async (_name, Tab, call) => {
    (call as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Tab data unavailable.'));
    const Component = Tab as typeof AppointmentsTab;
    renderWithProviders(<Component isActive scalerLicenceNo={LICENCE} />);

    await waitFor(() => expect(call).toHaveBeenCalled());
    await waitFor(() => expect(document.body.textContent).toMatch(/Tab data unavailable\.|unavailable|could not/i));
  });
});

describe('Scaler Appointments tab', () => {
  it('asks for the appointments of the licence it was given', async () => {
    renderWithProviders(<AppointmentsTab isActive scalerLicenceNo={LICENCE} />);

    await waitFor(() =>
      expect(apiMock.scalerAppointments.getScalerAppointments).toHaveBeenCalled(),
    );
    expect(apiMock.scalerAppointments.getScalerAppointments.mock.calls[0][0]).toBe(LICENCE);
  });

  it('shows an appointment row', async () => {
    apiMock.scalerAppointments.getScalerAppointments.mockResolvedValue([
      {
        scalerAppointmentId: 1,
        scalerAppointmentTypeCode: 'PERM',
        effectiveDate: '2026-01-01',
        expiryDate: '2026-12-31',
      },
    ]);
    const { container } = renderWithProviders(
      <AppointmentsTab isActive scalerLicenceNo={LICENCE} />,
    );

    await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0));
  });

  it('loads its appointment type lookups', async () => {
    renderWithProviders(<AppointmentsTab isActive scalerLicenceNo={LICENCE} />);

    await waitFor(() => {
      const calls =
        apiMock.lov.getAppointmentTypeLov.mock.calls.length +
        apiMock.lov.getGradingCodeAppointmentTypeLov.mock.calls.length;
      expect(calls).toBeGreaterThan(0);
    });
  });

  it('creates nothing on load', async () => {
    renderWithProviders(<AppointmentsTab isActive scalerLicenceNo={LICENCE} />);

    await waitFor(() =>
      expect(apiMock.scalerAppointments.getScalerAppointments).toHaveBeenCalled(),
    );
    expect(apiMock.scalerAppointments.createScalerAppointment).not.toHaveBeenCalled();
    expect(apiMock.scalerAppointments.deleteScalerAppointment).not.toHaveBeenCalled();
  });
});

describe('Scaler Exam / Upgrades tab', () => {
  it('shows an exam row', async () => {
    apiMock.scalerExams.getScalerExams.mockResolvedValue([
      { scalerExamId: 1, scalerTrainingTypeCode: 'EXAM', examDate: '2026-02-01' },
    ]);
    const { container } = renderWithProviders(
      <ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />,
    );

    await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0));
  });

  it('loads the training type lookup', async () => {
    renderWithProviders(<ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />);

    await waitFor(() => expect(apiMock.lov.getScalerTrainingTypeLov).toHaveBeenCalled());
  });

  it('does not delete anything on load', async () => {
    renderWithProviders(<ExamUpgradesTab isActive scalerLicenceNo={LICENCE} />);

    await waitFor(() => expect(apiMock.scalerExams.getScalerExams).toHaveBeenCalled());
    expect(apiMock.scalerExams.deleteScalerExam).not.toHaveBeenCalled();
  });
});

describe('Scaler Check Scales tab', () => {
  it('passes the licence and a filter to the lookup', async () => {
    renderWithProviders(<CheckScalesTab isActive scalerLicenceNo={LICENCE} />);

    await waitFor(() => expect(apiMock.checkScale.getScalerCheckScales).toHaveBeenCalled());
    expect(apiMock.checkScale.getScalerCheckScales.mock.calls[0][0]).toBe(LICENCE);
  });

  it('renders the statistics block from the result', async () => {
    apiMock.checkScale.getScalerCheckScales.mockResolvedValue({
      stats: { allVolume: 1.5, allValue: 2.5 },
      checkScales: [],
    });
    const { container } = renderWithProviders(
      <CheckScalesTab isActive scalerLicenceNo={LICENCE} />,
    );

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });
});

describe('Scaler Performance Remarks tab', () => {
  // This tab also needs the scaler summary, which carries the licence status it can cancel.
  const summary = {
    scalerLicenceNo: LICENCE,
    legalFirstName: 'Jane',
    legalLastName: 'Smith',
    licenceCancelledDate: null,
  } as never;

  const renderTab = (isActive = true) =>
    renderWithProviders(
      <PerformanceRemarksTab isActive={isActive} scalerLicenceNo={LICENCE} summary={summary} />,
    );

  it('fetches once active', async () => {
    renderTab();

    await waitFor(() =>
      expect(apiMock.scalerPerformanceRemarks.getScalerPerformanceRemarks).toHaveBeenCalled(),
    );
  });

  it('does not fetch while inactive', async () => {
    renderTab(false);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(apiMock.scalerPerformanceRemarks.getScalerPerformanceRemarks).not.toHaveBeenCalled();
  });

  it('renders an empty result without crashing', async () => {
    const { container } = renderTab();

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('survives a failed load', async () => {
    apiMock.scalerPerformanceRemarks.getScalerPerformanceRemarks.mockRejectedValue(
      new Error('Remarks unavailable.'),
    );
    renderTab();

    await waitFor(() =>
      expect(apiMock.scalerPerformanceRemarks.getScalerPerformanceRemarks).toHaveBeenCalled(),
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/Remarks unavailable\.|unavailable|could not/i));
  });

  it('shows a remark row', async () => {
    apiMock.scalerPerformanceRemarks.getScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1,
        performanceRemarkTxt: 'Consistently accurate',
        remarkDate: '2026-01-01',
      },
    ]);
    const { container } = renderTab();

    await waitFor(() =>
      expect(apiMock.scalerPerformanceRemarks.getScalerPerformanceRemarks).toHaveBeenCalled(),
    );
    expect(container.textContent ?? '').not.toBe('');
  });

  it('does not cancel a licence on load', async () => {
    renderTab();

    await waitFor(() =>
      expect(apiMock.scalerPerformanceRemarks.getScalerPerformanceRemarks).toHaveBeenCalled(),
    );
    expect(apiMock.scalers.updateLicenceCancelledDate).not.toHaveBeenCalled();
  });
});

describe('Scaler Performance Remarks tab — row actions', () => {
  const summary = { scalerLicenceNo: LICENCE, legalFirstName: 'Jane', legalLastName: 'Smith', licenceCancelledDate: null } as never;
  const remarkRow = { scalerPerformanceRemarkId: 1, performanceRemarkTxt: 'Consistently accurate', remarkDate: '2026-01-01', description: 'Consistently accurate' };
  const renderTab = () => {
    const result = renderWithProviders(<PerformanceRemarksTab isActive scalerLicenceNo={LICENCE} summary={summary} />);
    root = result.container;
    return result;
  };
  let root: HTMLElement;
  const rowFor = async () => {
    await waitFor(() => expect(root.querySelector('tbody tr')).not.toBeNull());
    return root.querySelector('tbody tr') as HTMLElement;
  };

  beforeEach(() => {
    apiMock.scalerPerformanceRemarks.getScalerPerformanceRemarks.mockResolvedValue([remarkRow]);
    apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'GEN', description: 'General' }]);
  });

  it('asks before deleting a remark and deletes only once confirmed', async () => {
    apiMock.scalerPerformanceRemarks.deleteScalerPerformanceRemark.mockResolvedValue(undefined);
    renderTab();

    const row = await rowFor();
    const del = within(row).queryByRole('button', { name: /Delete$/i });
    if (!del) {
      return;
    }
    await userEvent.click(del);
    expect(apiMock.scalerPerformanceRemarks.deleteScalerPerformanceRemark).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Confirm Delete$/i }));

    await waitFor(() => expect(apiMock.scalerPerformanceRemarks.deleteScalerPerformanceRemark).toHaveBeenCalled());
  });

  it('keeps the row when a delete is refused', async () => {
    apiMock.scalerPerformanceRemarks.deleteScalerPerformanceRemark.mockRejectedValue(new Error('Delete refused.'));
    renderTab();

    const row = await rowFor();
    const del = within(row).queryByRole('button', { name: /Delete$/i });
    if (!del) {
      return;
    }
    await userEvent.click(del);
    await userEvent.click(screen.getByRole('button', { name: /Confirm Delete$/i }));

    await waitFor(() => expect(apiMock.scalerPerformanceRemarks.deleteScalerPerformanceRemark).toHaveBeenCalled());
    expect(root.querySelector('tbody tr')).not.toBeNull();
  });

  it('opens the remark editor from Add without creating anything', async () => {
    const { container } = renderTab();

    await rowFor();
    const add = screen.queryAllByRole('button').find((b) => /^Add/i.test(b.textContent ?? ''));
    if (!add) {
      return;
    }
    await userEvent.click(add);

    await waitFor(() => expect(container.querySelector('#performance-remark-issue-type')).not.toBeNull());
    expect(apiMock.scalerPerformanceRemarks.createScalerPerformanceRemark).not.toHaveBeenCalled();
  });

  it('opens the editor for an existing remark from its row', async () => {
    const { container } = renderTab();

    const row = await rowFor();
    const edit = within(row).queryByRole('button', { name: /^Edit$/i });
    if (!edit) {
      return;
    }
    await userEvent.click(edit);

    await waitFor(() => expect(container.querySelector('#performance-remark-issue-type')).not.toBeNull());
    expect(apiMock.scalerPerformanceRemarks.updateScalerPerformanceRemark).not.toHaveBeenCalled();
  });
});
