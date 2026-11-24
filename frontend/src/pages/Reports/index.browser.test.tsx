import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import * as authModule from '@/context/auth/useAuth';
import { PageTitleProvider } from '@/context/pageTitle/PageTitleProvider';

import DesignatedMarkExceptionPage from './DesignatedMarkException';
import DistrictCheckScalePerformancePage from './DistrictCheckScalePerformance';
import DistrictSiteInspectionPerformancePage from './DistrictSiteInspectionPerformance';
import MarkSiteDesignationPage from './MarkSiteDesignation';
import ScaleSiteRegisterPage from './ScaleSiteRegister';
import ScalerRegisterPage from './ScalerRegister';
import ScalingAdministrationPage from './ScalingAdministration';
import ScalingExceptionPage from './ScalingException';

/**
 * The eight Reports-tab parameter screens that had no component test. (The ninth, Scale Site Compliance,
 * has its own file next to it — it is the in-context one and behaves differently enough to keep separate.)
 *
 * WHY TABLE-DRIVEN, AND WHAT THIS LAYER ADDS. Each of these screens duplicates the same `handleSend`:
 * await a token, POST via its own service method, then branch on Preview/recipient to either download +
 * "Report Generated" or confirm with "Report request submitted", with a catch that surfaces
 * "Unable to submit report". That duplication is the risk worth covering — a fix or regression applied to
 * one screen's copy and not the others is exactly what a per-screen assertion catches, and it is per-screen
 * code, so testing it once on a shared component would prove nothing.
 *
 * The e2e suite (`frontend/e2e/features/reports/`) covers each screen's PARAMETER
 * MAPPING against the real backend, and the delivery/download wiring end-to-end on the archetype screen. It
 * cannot cover the success/error branches on all nine, because Jasper generation is environment-blocked
 * (every `POST /api/reports/*` returns HTTP 500 on the deployed WAR) — every real submit takes the error
 * path. Here the service is mocked, so BOTH success branches and the failure branch are reachable per
 * screen. The two layers are complementary, not redundant.
 *
 * The default payload is also asserted per screen: it is cheap here, runs in CI with no stack, and pins the
 * per-screen defaults (`regDist` → "ALL", the sort codes, `preview` → true) that the e2e suite otherwise
 * needs a running database to check.
 */

const mockSubmit = vi.fn();
/**
 * Scale Site Register is the only screen that calls a NON-report endpoint before dispatching: it resolves
 * its optional Scale Site # filter against the site search first. Its own block at the bottom of this file
 * owns those assertions; for every other screen this spy must simply never be reached.
 */
const mockSearchScaleSites = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

/**
 * One mock for every report method: each screen calls exactly one of them, so pointing them all at the same
 * spy lets the table stay generic while still asserting the payload that screen built. The two LOV methods
 * are the only other API surface these screens touch — `getRegionDistrictRollupLov` feeds every screen's
 * Reg / Dist control, `getStaticLov` feeds Mark Exemptions and Scale Type. Both resolve empty: the dropdowns
 * then render with only their "All" option, which is all these assertions need (choosing a REAL org unit is
 * the e2e suite's job, since the option values are live data).
 */
vi.mock('@/services/APIs', () => ({
  default: {
    reports: {
      submitScalerRegisterReport: (...args: unknown[]) => mockSubmit(...args),
      submitScaleSiteRegisterReport: (...args: unknown[]) => mockSubmit(...args),
      submitMarkSiteDesignationReport: (...args: unknown[]) => mockSubmit(...args),
      submitDesignatedMarksExceptionReport: (...args: unknown[]) => mockSubmit(...args),
      submitScalingAdministrationReport: (...args: unknown[]) => mockSubmit(...args),
      submitScalingExceptionReport: (...args: unknown[]) => mockSubmit(...args),
      submitDistrictCheckScalePerformanceReport: (...args: unknown[]) => mockSubmit(...args),
      submitDistrictSiteInspectionPerformanceReport: (...args: unknown[]) => mockSubmit(...args),
    },
    lov: {
      getRegionDistrictRollupLov: vi.fn().mockResolvedValue([]),
      getStaticLov: vi.fn().mockResolvedValue([]),
    },
    scaleSites: {
      searchScaleSites: (...args: unknown[]) => mockSearchScaleSites(...args),
    },
  },
}));

type Screen = {
  name: string;
  heading: string;
  Component: React.ComponentType;
  /** The payload fields this screen must send on an untouched (or minimally-filled) submit. */
  defaultPayload: Record<string, unknown>;
  /**
   * Steps needed before Send can succeed. Only the two District Performance screens need this — they
   * REQUIRE a From/To window and block the submit client-side without one.
   */
  prepare?: () => void;
  /**
   * This screen's date window. Required, not optional: all eight screens have one, and
   * `utils/reportDateRange` is only the shared RULES — the wiring (which state feeds the validator, which
   * error object reaches which field, which labels the message uses) is per-screen copy, so a screen added
   * without this entry would be one whose wiring nothing checks.
   */
  dateWindow: DateWindow;
};

type DateWindow = {
  /**
   * ARIA labels of the From/To inputs. These are what `getByLabelText` resolves consistently, and they differ
   * from the visible `labelText` on some screens (Scaler Register shows "To Date", Mark Site Designation shows
   * "Effective Date (To)").
   */
  fromLabel: string;
  toLabel: string;
  /** The ordering message the pair must produce, in whichever labels the screen passed to the validator. */
  message: string;
};

const setDate = (labelText: string, value: string) => {
  const input = screen.getByLabelText(labelText);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

/** The District Performance screens require a valid window before they will dispatch. */
const supplyRequiredDates = () => {
  setDate('From Date', '2024-01-01');
  setDate('To Date', '2024-12-31');
};

/**
 * Describes a screen's date pair. `messageFrom`/`messageTo` default to the ARIA labels and are only passed
 * separately by Mark Site Designation, whose inputs are labelled "Effective From Date" but whose validator was
 * given "Effective Date (From)" — the message wording and the queryable label are genuinely different strings
 * there, and asserting the pair is the point of these rows.
 */
const dateWindow = (
  fromLabel: string,
  toLabel: string,
  messageFrom = fromLabel,
  messageTo = toLabel,
): DateWindow => ({
  fromLabel,
  toLabel,
  message: `${messageTo} must be on or after ${messageFrom}.`,
});

/** Fills a From/To pair the wrong way round, which trips the ordering rule every screen shares. */
const invertWindow = ({ fromLabel, toLabel }: DateWindow) => {
  setDate(fromLabel, '2024-12-31');
  setDate(toLabel, '2024-01-01');
};

const screens: Screen[] = [
  {
    name: 'ScalerRegisterPage',
    heading: 'Scaler Register Report',
    Component: ScalerRegisterPage,
    defaultPayload: {
      regDist: 'ALL',
      licenceStatus: 'ALL',
      authStatus: 'ALL',
      appointmentType: 'ALL',
      primarySort: 1,
      secondarySort: 0,
      outputFormat: 'PDF',
      preview: true,
    },
    dateWindow: dateWindow('From Date', 'To Date'),
  },
  {
    name: 'ScaleSiteRegisterPage',
    heading: 'Scale Site Register Report',
    Component: ScaleSiteRegisterPage,
    defaultPayload: {
      regDist: 'ALL',
      scaleType: 'ALL',
      siteStatus: 'ALL',
      primarySort: 1,
      secondarySort: 0,
      outputFormat: 'PDF',
      preview: true,
      authorizedScalersOnly: false,
    },
    dateWindow: dateWindow('From Date', 'To Date'),
  },
  {
    name: 'MarkSiteDesignationPage',
    heading: 'Mark Site Designation Report',
    Component: MarkSiteDesignationPage,
    defaultPayload: { regDist: 'ALL', markOrSite: 'MARK', outputFormat: 'PDF', preview: true },
    // The effective window stands in for the table's single-window assertion; both windows and their
    // independence are covered in the dedicated block below.
    dateWindow: dateWindow(
      'Effective From Date',
      'Effective To Date',
      'Effective Date (From)',
      'Effective Date (To)',
    ),
  },
  {
    name: 'DesignatedMarkExceptionPage',
    heading: 'Designated Marks Exception Report',
    Component: DesignatedMarkExceptionPage,
    defaultPayload: {
      markRegDist: 'ALL',
      siteRegDist: 'ALL',
      outputFormat: 'PDF',
      preview: true,
    },
    dateWindow: dateWindow('From Date', 'To Date'),
  },
  {
    name: 'ScalingAdministrationPage',
    heading: 'Scaling Administration Report',
    Component: ScalingAdministrationPage,
    defaultPayload: { regDist: 'ALL', outputFormat: 'PDF', preview: true },
    dateWindow: dateWindow('From Date', 'To Date'),
  },
  {
    name: 'ScalingExceptionPage',
    heading: 'Scaling Exception Report',
    Component: ScalingExceptionPage,
    defaultPayload: {
      regDist: 'ALL',
      primarySort: 1,
      secondarySort: 0,
      outputFormat: 'PDF',
      preview: true,
    },
    dateWindow: dateWindow('From Scale Date', 'To Scale Date'),
  },
  {
    name: 'DistrictCheckScalePerformancePage',
    heading: 'District Check Scale Performance',
    Component: DistrictCheckScalePerformancePage,
    defaultPayload: {
      regDist: 'ALL',
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
      outputFormat: 'PDF',
      preview: true,
    },
    prepare: supplyRequiredDates,
    dateWindow: dateWindow('From Date', 'To Date'),
  },
  {
    name: 'DistrictSiteInspectionPerformancePage',
    heading: 'District Site Inspection Performance',
    Component: DistrictSiteInspectionPerformancePage,
    defaultPayload: {
      regDist: 'ALL',
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
      outputFormat: 'PDF',
      preview: true,
    },
    prepare: supplyRequiredDates,
    dateWindow: dateWindow('From Date', 'To Date'),
  },
];

const authContext = (): AuthContextType => ({
  user: undefined,
  isLoggedIn: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  userToken: vi.fn().mockResolvedValue('token'),
});

const renderScreen = (Component: React.ComponentType) => {
  render(
    <MemoryRouter>
      <PageTitleProvider>
        <Component />
      </PageTitleProvider>
    </MemoryRouter>,
  );
};

const clickSend = () => fireEvent.click(screen.getByRole('button', { name: 'Send / View Report' }));

describe('Reports parameter screens', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    mockSubmit.mockReset();
    mockSearchScaleSites.mockReset();
    mockSearchScaleSites.mockResolvedValue([]);
    mockSubmit.mockResolvedValue({
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      filename: 'report.pdf',
    });
    mockUseAuth.mockReturnValue(authContext());
  });

  describe.each(screens)('$name', ({ heading, Component, defaultPayload, prepare, dateWindow: dates }) => {
    it('renders its title and output options', async () => {
      renderScreen(Component);

      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByLabelText('Email Recipient')).toBeInTheDocument();
      expect(screen.getByLabelText('File Format')).toBeInTheDocument();
    });

    it('sends its documented default parameters', async () => {
      renderScreen(Component);
      await screen.findByRole('heading', { level: 1, name: heading });

      prepare?.();
      clickSend();

      await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
      expect(mockSubmit.mock.calls[0][0]).toMatchObject(defaultPayload);
      // The token is resolved via useAuth and forwarded — a screen that dropped it would 401 in the
      // deployed app while still looking correct locally under mock auth.
      expect(mockSubmit.mock.calls[0][1]).toBe('token');
    });

    it('reports success after a preview submit', async () => {
      renderScreen(Component);
      await screen.findByRole('heading', { level: 1, name: heading });

      prepare?.();
      clickSend();

      expect(await screen.findByText('Report Generated')).toBeInTheDocument();
    });

    it('confirms submission without downloading when email delivery is requested', async () => {
      renderScreen(Component);
      await screen.findByRole('heading', { level: 1, name: heading });

      prepare?.();
      fireEvent.click(screen.getByLabelText('No'));
      fireEvent.change(screen.getByLabelText('Email Recipient'), {
        target: { value: 'reports@example.gov.bc.ca' },
      });
      clickSend();

      await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
      expect(mockSubmit.mock.calls[0][0]).toMatchObject({
        preview: false,
        emailRecipient: 'reports@example.gov.bc.ca',
      });
      expect(await screen.findByText('Report request submitted')).toBeInTheDocument();
      expect(screen.queryByText('Report Generated')).not.toBeInTheDocument();
    });

    it('surfaces the failure reason when the report request fails', async () => {
      // This is the branch every real submit takes in the current environment (Jasper 500), so the message
      // users actually see today is worth pinning per screen.
      mockSubmit.mockRejectedValue(new Error('Request failed with status code 500'));
      renderScreen(Component);
      await screen.findByRole('heading', { level: 1, name: heading });

      prepare?.();
      clickSend();

      expect(await screen.findByText('Unable to submit report')).toBeInTheDocument();
      expect(screen.getByText('Request failed with status code 500')).toBeInTheDocument();
    });

    it('falls back to a generic message when the failure carries no message', async () => {
      mockSubmit.mockRejectedValue({});
      renderScreen(Component);
      await screen.findByRole('heading', { level: 1, name: heading });

      prepare?.();
      clickSend();

      // `err?.message || 'Unable to submit report'` — the fallback lands in the notification's SUBTITLE,
      // so the title text appears twice; `findAllByText` avoids a false multiple-match failure.
      expect((await screen.findAllByText('Unable to submit report')).length).toBeGreaterThan(0);
    });

    it('does not submit when Preview is No and no recipient is given', async () => {
      renderScreen(Component);
      await screen.findByRole('heading', { level: 1, name: heading });

      prepare?.();
      fireEvent.click(screen.getByLabelText('No'));
      clickSend();

      expect(
        await screen.findByText(
          'If Preview Report has been set to No then the Email Recipient is required.',
        ),
      ).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('maps the MS Excel file format onto the XLS output format', async () => {
      renderScreen(Component);
      await screen.findByRole('heading', { level: 1, name: heading });

      prepare?.();
      fireEvent.change(screen.getByLabelText('File Format'), { target: { value: 'MS Excel' } });
      clickSend();

      await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
      expect(mockSubmit.mock.calls[0][0]).toMatchObject({ outputFormat: 'XLS' });
    });

    it('blocks the submit and reports the range error on its To field', async () => {
      renderScreen(Component);
      await screen.findByRole('heading', { level: 1, name: heading });

      invertWindow(dates);
      clickSend();

      // The message is reported ONCE, as the To field's own requirement text: the validator mirrors its
      // cross-field rangeError onto toError, and DateInput renders that below the input. Asserting the input is
      // also marked invalid pins the association — the text alone could be rendered anywhere on the page.
      expect(await screen.findByText(dates.message)).toBeInTheDocument();
      expect(screen.getByLabelText(dates.toLabel)).toHaveAttribute('aria-invalid', 'true');
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  /**
   * Mark Site Designation is the only screen with TWO independent windows, and so the only one whose wiring
   * can be CROSSED rather than merely missing: four DateInputs, two error objects, four custom labels. The
   * table row above proves one window reports; these prove each window reports its own dates under its own
   * labels, and that the four values reach the payload in the right slots. A future edit that swapped
   * `expiryFrom` for `effectiveTo`, or crossed the label pairs, passes every other test in this file.
   */
  describe('MarkSiteDesignationPage date windows', () => {
    const EFFECTIVE = dateWindow(
      'Effective From Date',
      'Effective To Date',
      'Effective Date (From)',
      'Effective Date (To)',
    );
    const EXPIRY = dateWindow('Expiry From Date', 'Expiry To Date', 'Expiry Date (From)', 'Expiry Date (To)');

    const renderPage = async () => {
      renderScreen(MarkSiteDesignationPage);
      await screen.findByRole('heading', { level: 1, name: 'Mark Site Designation Report' });
    };

    it('reports an inverted effective window without implicating the expiry window', async () => {
      await renderPage();

      invertWindow(EFFECTIVE);
      clickSend();

      expect(await screen.findByText(EFFECTIVE.message)).toBeInTheDocument();
      expect(screen.getByLabelText(EFFECTIVE.toLabel)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByText(EXPIRY.message)).not.toBeInTheDocument();
      expect(screen.getByLabelText(EXPIRY.toLabel)).not.toHaveAttribute('aria-invalid');
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('reports an inverted expiry window without implicating the effective window', async () => {
      await renderPage();

      invertWindow(EXPIRY);
      clickSend();

      expect(await screen.findByText(EXPIRY.message)).toBeInTheDocument();
      expect(screen.getByLabelText(EXPIRY.toLabel)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByText(EFFECTIVE.message)).not.toBeInTheDocument();
      expect(screen.getByLabelText(EFFECTIVE.toLabel)).not.toHaveAttribute('aria-invalid');
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    /**
     * Mark Site Designation is also the only screen whose windows are ALL-OR-NOTHING (legacy
     * `MarkSiteDesignationReportBo.validateDates`). Regression guard for the QA-reported gap where a
     * half-filled window generated the report instead of being rejected. Note the message lands on the
     * FROM field in BOTH directions, which is what legacy did — hence the explicit From-field assertions.
     *
     * That an EMPTY window still submits — the distinction between this rule and `required` — is already
     * proved by the table's "sends its documented default parameters" row, which submits this screen with
     * no dates at all; swapping `pairedRequired` for `required` here would break it.
     */
    const pairedMessage = ({ fromLabel, toLabel }: { fromLabel: string; toLabel: string }) =>
      `If a value is entered in either ${fromLabel} or ${toLabel}, then a value must be entered in both.`;

    const EFFECTIVE_PAIRED = pairedMessage({
      fromLabel: 'Effective Date (From)',
      toLabel: 'Effective Date (To)',
    });
    const EXPIRY_PAIRED = pairedMessage({
      fromLabel: 'Expiry Date (From)',
      toLabel: 'Expiry Date (To)',
    });

    it('blocks the submit when only the effective From date is given', async () => {
      // The exact QA repro: a From with no To used to generate the report.
      await renderPage();

      setDate('Effective From Date', '2024-01-01');
      clickSend();

      expect(await screen.findByText(EFFECTIVE_PAIRED)).toBeInTheDocument();
      expect(screen.getByLabelText('Effective From Date')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByText(EXPIRY_PAIRED)).not.toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('blocks the submit when only the effective To date is given', async () => {
      await renderPage();

      setDate('Effective To Date', '2024-12-31');
      clickSend();

      // Same message, still on the From field — the direction of the omission does not change either.
      expect(await screen.findByText(EFFECTIVE_PAIRED)).toBeInTheDocument();
      expect(screen.getByLabelText('Effective From Date')).toHaveAttribute('aria-invalid', 'true');
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('blocks the submit when only one expiry date is given, without implicating the effective window', async () => {
      await renderPage();

      setDate('Expiry From Date', '2025-01-01');
      clickSend();

      expect(await screen.findByText(EXPIRY_PAIRED)).toBeInTheDocument();
      expect(screen.getByLabelText('Expiry From Date')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByText(EFFECTIVE_PAIRED)).not.toBeInTheDocument();
      expect(screen.getByLabelText('Effective From Date')).not.toHaveAttribute('aria-invalid');
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('reports BOTH windows when each is half-filled', async () => {
      // The two windows are validated independently, so one being wrong must not mask the other.
      await renderPage();

      setDate('Effective From Date', '2024-01-01');
      setDate('Expiry To Date', '2025-06-30');
      clickSend();

      expect(await screen.findByText(EFFECTIVE_PAIRED)).toBeInTheDocument();
      expect(screen.getByText(EXPIRY_PAIRED)).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('does not flag a half-filled window until Send is pressed', async () => {
      // Half-filled is the normal state between the two dates; nagging mid-entry would red-flag a form the
      // user has not finished. The rule gates dispatch, not typing.
      await renderPage();

      setDate('Effective From Date', '2024-01-01');

      expect(screen.queryByText(EFFECTIVE_PAIRED)).not.toBeInTheDocument();
      expect(screen.getByLabelText('Effective From Date')).not.toHaveAttribute('aria-invalid');
    });

    it('sends all four dates in their own payload fields', async () => {
      await renderPage();

      // Deliberately four DISTINCT values in a known order, so a swapped pair shows up as a wrong field
      // rather than passing because both sides happened to hold the same date.
      setDate('Effective From Date', '2024-01-01');
      setDate('Effective To Date', '2024-06-30');
      setDate('Expiry From Date', '2025-01-01');
      setDate('Expiry To Date', '2025-06-30');
      clickSend();

      await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
      expect(mockSubmit.mock.calls[0][0]).toMatchObject({
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-06-30',
        expiryFrom: '2025-01-01',
        expiryTo: '2025-06-30',
      });
    });
  });

  /**
   * Scale Site # is the only free-text filter on any of these screens that must EXIST before the report
   * runs (legacy `ScaleSiteReportBo.validateScaleSiteRep` -> `errors.mark_site_scale`). It shipped as a
   * pass-through, so a typo produced an empty report that read as a legitimately empty result - the bug
   * these tests pin. The lookup is per-screen code (the shared `ReportPage` knows nothing about it), so
   * the assertions belong here rather than on the component.
   */
  describe('ScaleSiteRegisterPage scale site filter', () => {
    const renderPage = async () => {
      renderScreen(ScaleSiteRegisterPage);
      await screen.findByRole('heading', { level: 1, name: 'Scale Site Register Report' });
    };

    const setSiteNumber = (value: string) =>
      fireEvent.change(screen.getByLabelText('Scale Site #'), { target: { value } });

    it('caps the field at the 4 characters a scale site number can be', async () => {
      // QA reported the field accepted any length. SCALE_SITE_ID_NMBR is 4 (legacy used maxlength="4"),
      // and anything longer can only fail the existence check - so the cap is asserted on the attribute
      // the browser enforces, since fireEvent.change sets the value directly and bypasses it.
      await renderPage();

      expect(screen.getByLabelText('Scale Site #')).toHaveAttribute('maxlength', '4');
    });

    it('does not look up a site when the filter is left blank', async () => {
      await renderPage();

      clickSend();

      await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
      // A blank filter is not an unknown site: the report must run, and must run without a wasted call.
      expect(mockSearchScaleSites).not.toHaveBeenCalled();
      expect(mockSubmit.mock.calls[0][0].scaleSiteNumber).toBeUndefined();
    });

    it('blocks the submit and reports the unknown site on its own field', async () => {
      await renderPage();

      setSiteNumber('TEST');
      clickSend();

      expect(await screen.findByText('A Scale Site could not be found for TEST.')).toBeInTheDocument();
      // Marked invalid, not merely printed somewhere on the page - the message has to point at the field.
      expect(screen.getByLabelText('Scale Site #')).toHaveAttribute('aria-invalid', 'true');
      expect(mockSubmit).not.toHaveBeenCalled();
      // The rejected form never claims to be generating anything.
      expect(screen.queryByText('Report Generating...')).not.toBeInTheDocument();
    });

    it('rejects a site whose number merely resembles the one entered', async () => {
      // The search matches exactly today, so this is the client refusing to depend on that: only the
      // number entered counts as found, never a neighbour the endpoint might one day return for "52".
      mockSearchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: '520', siteName: 'Site 520' }]);
      await renderPage();

      setSiteNumber('52');
      clickSend();

      expect(await screen.findByText('A Scale Site could not be found for 52.')).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('runs the report on the canonical number when the site exists', async () => {
      mockSearchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: '52A', siteName: 'Site 52A' }]);
      await renderPage();

      // Typed with stray whitespace and in lowercase: both are normalized before the lookup AND before
      // the report request, so the run filters on the number the site is actually stored under.
      setSiteNumber('  52a  ');
      clickSend();

      await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
      expect(mockSearchScaleSites).toHaveBeenCalledWith({ scaleSiteIdNmbr: '52A' }, 'token');
      expect(mockSubmit.mock.calls[0][0]).toMatchObject({ scaleSiteNumber: '52A' });
      expect(await screen.findByText('Report Generated')).toBeInTheDocument();
    });

    it('clears the error as soon as the field is corrected and then runs the report', async () => {
      await renderPage();

      setSiteNumber('TEST');
      clickSend();
      expect(await screen.findByText('A Scale Site could not be found for TEST.')).toBeInTheDocument();

      mockSearchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: '520', siteName: 'Site 520' }]);
      setSiteNumber('520');

      // Gone on the keystroke, not left standing until the next submit contradicts it.
      expect(screen.queryByText('A Scale Site could not be found for TEST.')).not.toBeInTheDocument();

      clickSend();

      await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
      expect(mockSubmit.mock.calls[0][0]).toMatchObject({ scaleSiteNumber: '520' });
    });

    it('does not run the report when the site lookup itself fails', async () => {
      // An unverifiable filter is not a verified one: failing open here would resurrect the empty-report
      // bug whenever the search endpoint is down.
      mockSearchScaleSites.mockRejectedValue({
        response: { data: { message: 'Scale site search is unavailable.' } },
      });
      await renderPage();

      setSiteNumber('520');
      clickSend();

      expect(await screen.findByText('Scale site search is unavailable.')).toBeInTheDocument();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('clears the unknown-site error on Reset', async () => {
      await renderPage();

      setSiteNumber('TEST');
      clickSend();
      expect(await screen.findByText('A Scale Site could not be found for TEST.')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

      await waitFor(() =>
        expect(screen.queryByText('A Scale Site could not be found for TEST.')).not.toBeInTheDocument(),
      );
      expect(screen.getByLabelText('Scale Site #')).toHaveValue('');
    });
  });
});
