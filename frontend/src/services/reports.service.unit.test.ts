import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({
  BackendApiConfig: {
    BASE: '/api',
  },
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { ReportsService, type ScaleSiteComplianceReportRequest, type MarkSiteDesignationReportRequest } from './reports.service';

/**
 * ReportsService — the nine report-submit methods behind the Reports tab.
 *
 * Each method is a thin, near-identical wrapper (POST a payload as a blob, then parse the response's
 * `Content-Disposition` filename), which is exactly why they are worth covering as a TABLE: the realistic
 * defect in code shaped like this is a copy-paste slip — the wrong URL segment, a missing
 * `responseType: 'blob'` (which silently corrupts the PDF into a UTF-8 string), or a forgotten filename
 * parse. A per-method table catches all three; nine hand-written near-duplicate tests would not read any
 * better and would drift.
 *
 * `blobHeaders` is deliberately NOT mocked — it runs for real and spreads `mockRolesHeader()`, so headers
 * are asserted with `objectContaining` (see the service-test convention used across this codebase).
 */
describe('ReportsService', () => {
  const axiosPost = vi.mocked(axios.post);
  const service = new ReportsService();

  beforeEach(() => {
    axiosPost.mockReset();
  });

  /**
   * One row per submit method: the method to call, the URL segment it must POST to, and a payload that is
   * valid for its request type. The table's purpose is the URL/transport contract, not type-checking the
   * payloads — the callers' own types do that.
   */
  const methods: Array<{
    name: string;
    endpoint: string;
    /**
     * One signature standing in for nine methods that each take their OWN request type. `Record<string,
     * unknown>` does not work here: every request type has required properties, so it is not assignable
     * (TS2345) and would force an `as` cast at all nine call sites below to say the same thing less clearly.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above: nine distinct request types
    call: (payload: any, token?: string) => Promise<{ blob: Blob; filename?: string | null }>;
    payload: Record<string, unknown>;
  }> = [
    {
      name: 'submitScalerRegisterReport',
      endpoint: '/reports/scaler-register',
      call: (p, t) => service.submitScalerRegisterReport(p, t),
      payload: {
        regDist: 'ALL',
        licenceStatus: 'ALL',
        authStatus: 'ALL',
        appointmentType: 'ALL',
        primarySort: 1,
        secondarySort: 0,
        outputFormat: 'PDF',
        preview: true,
      },
    },
    {
      name: 'submitScaleSiteRegisterReport',
      endpoint: '/reports/scale-site-register',
      call: (p, t) => service.submitScaleSiteRegisterReport(p, t),
      payload: {
        regDist: 'ALL',
        scaleType: 'ALL',
        siteStatus: 'ALL',
        primarySort: 1,
        secondarySort: 0,
        outputFormat: 'PDF',
        preview: true,
      },
    },
    {
      name: 'submitMarkSiteDesignationReport',
      endpoint: '/reports/mark-site-designation',
      call: (p, t) => service.submitMarkSiteDesignationReport(p, t),
      payload: { regDist: 'ALL', markOrSite: 'MARK', outputFormat: 'PDF', preview: true },
    },
    {
      // NOTE the singular/plural split: the SPA route is `/reports/designated-mark-exception` but the API
      // path is plural. Pinning it here means a "tidy-up" of either side cannot pass silently.
      name: 'submitDesignatedMarksExceptionReport',
      endpoint: '/reports/designated-marks-exception',
      call: (p, t) => service.submitDesignatedMarksExceptionReport(p, t),
      payload: { markRegDist: 'ALL', siteRegDist: 'ALL', outputFormat: 'PDF', preview: true },
    },
    {
      name: 'submitScalingAdministrationReport',
      endpoint: '/reports/scaling-administration',
      call: (p, t) => service.submitScalingAdministrationReport(p, t),
      payload: { regDist: 'ALL', outputFormat: 'PDF', preview: true },
    },
    {
      name: 'submitScalingExceptionReport',
      endpoint: '/reports/scaling-exception',
      call: (p, t) => service.submitScalingExceptionReport(p, t),
      payload: {
        regDist: 'ALL',
        primarySort: 1,
        secondarySort: 0,
        outputFormat: 'PDF',
        preview: true,
      },
    },
    {
      name: 'submitDistrictCheckScalePerformanceReport',
      endpoint: '/reports/district-check-scale-performance',
      call: (p, t) => service.submitDistrictCheckScalePerformanceReport(p, t),
      payload: { regDist: 'ALL', outputFormat: 'PDF', preview: true },
    },
    {
      name: 'submitDistrictSiteInspectionPerformanceReport',
      endpoint: '/reports/district-site-inspection-performance',
      call: (p, t) => service.submitDistrictSiteInspectionPerformanceReport(p, t),
      payload: { regDist: 'ALL', outputFormat: 'PDF', preview: true },
    },
    {
      name: 'submitScaleSiteComplianceReport',
      endpoint: '/reports/scale-site-compliance',
      call: (p, t) => service.submitScaleSiteComplianceReport(p, t),
      payload: { inspectionId: 123, outputFormat: 'PDF', preview: true },
    },
  ];

  describe.each(methods)('$name', ({ endpoint, call, payload }) => {
    it(`POSTs the payload to ${endpoint} as a blob and returns the blob + parsed filename`, async () => {
      const blob = new Blob(['pdf'], { type: 'application/pdf' });
      axiosPost.mockResolvedValue({
        data: blob,
        headers: { 'content-disposition': 'inline; filename="report.pdf"' },
      });

      const result = await call(payload, 'token');

      expect(result.blob).toBe(blob);
      expect(result.filename).toBe('report.pdf');
      expect(axiosPost).toHaveBeenCalledTimes(1);
      expect(axiosPost).toHaveBeenCalledWith(
        `/api${endpoint}`,
        payload,
        expect.objectContaining({
          // Without responseType 'blob' axios would decode the PDF as text and corrupt it — the most
          // damaging and least visible slip these wrappers can carry, so it is asserted on every method.
          responseType: 'blob',
          headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        }),
      );
    });

    it('returns a null filename when the response carries no Content-Disposition', async () => {
      axiosPost.mockResolvedValue({
        data: new Blob(['pdf'], { type: 'application/pdf' }),
        headers: {},
      });

      const result = await call(payload, 'token');

      expect(result.filename).toBeNull();
    });

    it('propagates a request failure to the caller', async () => {
      // Every report screen relies on this rejecting so its own catch can surface
      // "Unable to submit report" — a wrapper that swallowed the error would leave the UI stuck.
      axiosPost.mockRejectedValue(new Error('boom'));

      await expect(call(payload, 'token')).rejects.toThrow('boom');
    });
  });

  /**
   * `extractFilename` is private, so it is exercised through a submit call. These are the cases that decide
   * what the browser names a downloaded report — the visible half of the feature.
   */
  describe('Content-Disposition filename parsing', () => {
    const submitWithDisposition = async (contentDisposition: string | undefined) => {
      axiosPost.mockResolvedValue({
        data: new Blob(['pdf'], { type: 'application/pdf' }),
        headers: contentDisposition === undefined ? {} : { 'content-disposition': contentDisposition },
      });

      const payload: ScaleSiteComplianceReportRequest = {
        inspectionId: 123,
        outputFormat: 'PDF',
        preview: true,
      };
      const { filename } = await service.submitScaleSiteComplianceReport(payload, 'token');
      return filename;
    };

    it('reads a quoted filename', async () => {
      await expect(submitWithDisposition('attachment; filename="scaler-register.pdf"')).resolves.toBe(
        'scaler-register.pdf',
      );
    });

    it('reads an unquoted filename', async () => {
      await expect(submitWithDisposition('attachment; filename=scaler-register.pdf')).resolves.toBe(
        'scaler-register.pdf',
      );
    });

    it('is case-insensitive about the filename parameter', async () => {
      await expect(submitWithDisposition('attachment; FILENAME="report.xls"')).resolves.toBe('report.xls');
    });

    it('prefers and percent-decodes an RFC 5987 UTF-8 filename', async () => {
      // The UTF-8 form is checked FIRST by the service, so when both are present the decoded one wins —
      // this is what makes a non-ASCII report name (an accented district) arrive intact.
      await expect(
        submitWithDisposition(
          "attachment; filename=\"fallback.pdf\"; filename*=UTF-8''rapport%20r%C3%A9gional.pdf",
        ),
      ).resolves.toBe('rapport régional.pdf');
    });

    it('stops at the parameter boundary rather than swallowing later parameters', async () => {
      await expect(
        submitWithDisposition('attachment; filename="report.pdf"; size=1024'),
      ).resolves.toBe('report.pdf');
    });

    it('returns null for a header with no filename parameter', async () => {
      await expect(submitWithDisposition('attachment')).resolves.toBeNull();
    });

    it('returns null when the header is absent', async () => {
      await expect(submitWithDisposition(undefined)).resolves.toBeNull();
    });
  });

  it('omits the Authorization header when no token is supplied', async () => {
    // The screens call `await userToken()` first; if that resolves undefined the request must still be
    // well-formed rather than sending the literal "Bearer undefined".
    axiosPost.mockResolvedValue({ data: new Blob(['pdf']), headers: {} });

    await service.submitScalingAdministrationReport(
      { regDist: 'ALL', outputFormat: 'PDF', preview: true },
      undefined,
    );

    const config = axiosPost.mock.calls[0][2] as { headers: Record<string, string> };
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('ReportsService.submitMarkSiteDesignationReport', () => {
  const axiosPost = vi.mocked(axios.post);
  const service = new ReportsService();

  beforeEach(() => {
    axiosPost.mockReset();
  });

  it('POSTs the MSD report request as a blob and returns the blob + parsed filename', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    axiosPost.mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': 'inline; filename="Mark-Site-Designation.pdf"' },
    });

    const payload: MarkSiteDesignationReportRequest = {
      regDist: 'ALL',
      markOrSite: 'MARK',
      outputFormat: 'PDF',
      preview: true,
    };

    const result = await service.submitMarkSiteDesignationReport(payload, 'token');

    expect(result.blob).toBe(blob);
    expect(result.filename).toBe('Mark-Site-Designation.pdf');
    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/reports\/mark-site-designation$/),
      payload,
      expect.objectContaining({ responseType: 'blob' }),
    );
  });
});
