import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import DesignatedMarkException from './DesignatedMarkException';
import DistrictCheckScalePerformance from './DistrictCheckScalePerformance';
import DistrictSiteInspectionPerformance from './DistrictSiteInspectionPerformance';
import MarkSiteDesignation from './MarkSiteDesignation';
import ScalerRegister from './ScalerRegister';
import ScaleSiteCompliance from './ScaleSiteCompliance';
import ScaleSiteRegister from './ScaleSiteRegister';
import ScalingAdministration from './ScalingAdministration';
import ScalingException from './ScalingException';

/**
 * The submit tail every report screen shares, pinned across all nine report routes: output options → payload,
 * the preview download vs the emailed request, the loading banner, the failure banner, and Reset restoring the
 * output defaults. A characterization test for extracting that tail into one hook — it asserts only what the
 * user (and the API) observe, so it must pass unchanged before and after.
 */

type ReportMethod = keyof typeof apiMock.reports;

interface ReportCase {
  name: string;
  method: ReportMethod;
  render: () => ReturnType<typeof renderWithProviders>;
  /** Fill whatever the screen requires before it will send. */
  prepare?: (container: HTMLElement) => void;
}

const setRequiredDateWindow = (container: HTMLElement) => {
  fireEvent.change(controlById(container, 'from-date'), { target: { value: '2026-01-01' } });
  fireEvent.change(controlById(container, 'to-date'), { target: { value: '2026-02-01' } });
};

const CASES: ReportCase[] = [
  { name: 'Scaler Register', method: 'submitScalerRegisterReport', render: () => renderWithProviders(<ScalerRegister />) },
  { name: 'Scale Site Register', method: 'submitScaleSiteRegisterReport', render: () => renderWithProviders(<ScaleSiteRegister />) },
  { name: 'Mark Site Designation', method: 'submitMarkSiteDesignationReport', render: () => renderWithProviders(<MarkSiteDesignation />) },
  {
    name: 'Designated Marks Exception',
    method: 'submitDesignatedMarksExceptionReport',
    render: () => renderWithProviders(<DesignatedMarkException />),
  },
  { name: 'Scaling Exception', method: 'submitScalingExceptionReport', render: () => renderWithProviders(<ScalingException />) },
  {
    name: 'Scale Site Compliance',
    method: 'submitScaleSiteComplianceReport',
    render: () =>
      renderWithProviders(<ScaleSiteCompliance />, {
        route: '/inspections/7/compliance-report',
        path: '/inspections/:inspectionId/compliance-report',
      }),
  },
  {
    name: 'Scaling Administration',
    method: 'submitScalingAdministrationReport',
    render: () => renderWithProviders(<ScalingAdministration />),
  },
  {
    name: 'District Check Scale Performance',
    method: 'submitDistrictCheckScalePerformanceReport',
    render: () => renderWithProviders(<DistrictCheckScalePerformance />),
    prepare: setRequiredDateWindow,
  },
  {
    name: 'District Site Inspection Performance',
    method: 'submitDistrictSiteInspectionPerformanceReport',
    render: () => renderWithProviders(<DistrictSiteInspectionPerformance />),
    prepare: setRequiredDateWindow,
  },
];

const submitMock = (method: ReportMethod) => apiMock.reports[method] as unknown as ReturnType<typeof vi.fn>;
const sentPayload = (method: ReportMethod) => submitMock(method).mock.calls[0][0] as Record<string, unknown>;
const clickSend = () => userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

const openReport = async (reportCase: ReportCase) => {
  const utils = reportCase.render();
  await waitFor(() => expect(utils.container.querySelector('#file-format')).not.toBeNull());
  reportCase.prepare?.(utils.container);
  return utils;
};

const chooseEmailedExcel = (container: HTMLElement) => {
  fireEvent.change(controlById(container, 'file-format'), { target: { value: 'MS Excel' } });
  fireEvent.change(controlById(container, 'email-recipient'), { target: { value: 'scs.reports@gov.bc.ca' } });
  fireEvent.click(controlById(container, 'preview-no'));
};

let createObjectURL: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetApiMock();
  createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(CASES)('$name — shared report submission', (reportCase) => {
  it('previews: sends PDF / preview, downloads the file, and says Report Generated', async () => {
    submitMock(reportCase.method).mockResolvedValue({ blob: new Blob(['pdf']), filename: 'report.pdf' });
    await openReport(reportCase);

    await clickSend();

    await waitFor(() => expect(submitMock(reportCase.method)).toHaveBeenCalledTimes(1));
    expect(sentPayload(reportCase.method)).toMatchObject({ outputFormat: 'PDF', preview: true });
    expect(sentPayload(reportCase.method).emailRecipient).toBeUndefined();
    expect(await screen.findByText('Report Generated')).toBeInTheDocument();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('emails: sends XLS / no preview / the recipient, says Report request submitted, and downloads nothing', async () => {
    submitMock(reportCase.method).mockResolvedValue({ blob: new Blob(['xls']), filename: 'report.xls' });
    const { container } = await openReport(reportCase);
    chooseEmailedExcel(container);

    await clickSend();

    await waitFor(() => expect(submitMock(reportCase.method)).toHaveBeenCalledTimes(1));
    expect(sentPayload(reportCase.method)).toMatchObject({
      outputFormat: 'XLS',
      preview: false,
      emailRecipient: 'scs.reports@gov.bc.ca',
    });
    expect(await screen.findByText('Report request submitted')).toBeInTheDocument();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('shows Report Generating... while the request is in flight', async () => {
    let finish: (value: { blob: Blob; filename: string }) => void = () => {};
    submitMock(reportCase.method).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await openReport(reportCase);

    await clickSend();

    expect(await screen.findByText('Report Generating...')).toBeInTheDocument();
    finish({ blob: new Blob(['pdf']), filename: 'report.pdf' });
    expect(await screen.findByText('Report Generated')).toBeInTheDocument();
    expect(screen.queryByText('Report Generating...')).not.toBeInTheDocument();
  });

  it('reports a failed request under "Unable to submit report" with its message', async () => {
    submitMock(reportCase.method).mockRejectedValue(new Error('Report engine unavailable'));
    await openReport(reportCase);

    await clickSend();

    expect(await screen.findByText('Unable to submit report')).toBeInTheDocument();
    expect(screen.getByText('Report engine unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Report Generated')).not.toBeInTheDocument();
  });

  it("shows the server's field messages when a submit is refused, though the body arrives as a Blob", async () => {
    // The report endpoints are fetched with responseType: 'blob', so a 400's JSON body is a Blob, not an object.
    const body = new Blob([JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed for one or more fields.',
      fieldErrors: [{ field: 'fromDate', message: 'From Date must be on or before To Date.' }],
    })], { type: 'application/json' });
    submitMock(reportCase.method).mockRejectedValue(
      Object.assign(new Error('Request failed with status code 400'), { response: { status: 400, data: body } }),
    );
    await openReport(reportCase);

    await clickSend();

    expect(await screen.findByText('From Date must be on or before To Date.')).toBeInTheDocument();
    expect(screen.queryByText('Request failed with status code 400')).not.toBeInTheDocument();
  });

  it('Reset restores the output options to PDF / no recipient / preview Yes', async () => {
    const { container } = await openReport(reportCase);
    chooseEmailedExcel(container);

    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(controlById<HTMLSelectElement>(container, 'file-format')).toHaveValue('PDF'));
    expect(controlById(container, 'email-recipient')).toHaveValue('');
    expect(controlById<HTMLInputElement>(container, 'preview-yes')).toBeChecked();
  });
});
