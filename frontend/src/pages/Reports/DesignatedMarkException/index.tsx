import { Grid, Column } from '@carbon/react';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';

import DateInput from '@/components/core/DateInput';
import MultiValueInput from '@/components/core/MultiValueInput';
import RegDistSelect from '@/components/core/RegDistSelect';
import ReportPage from '@/components/core/ReportPage';
import { useReportSubmission } from '@/components/core/ReportPage/useReportSubmission';
import API from '@/services/APIs';
import { dedupeCaseInsensitive } from '@/utils/dedupeCaseInsensitive';
import {
  hasReportDateErrors,
  noReportDateErrors,
  validateReportDateRange,
  type ReportDateRangeErrors,
} from '@/utils/reportDateRange';

import type { DesignatedMarksExceptionReportRequest } from '@/services/reports.service';

// Legacy capped each mark / site box at 12 characters (designatedMarksException.jsp). The cap also keeps an over-long
// mark off /timber-marks/exists, whose 20-character limit would refuse it with a 400 (shown here as "could not
// verify") instead of flagging it on its field as not existing.
const MARK_SITE_MAX_LENGTH = 12;

const DesignatedMarkExceptionPage: FC = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [markRegDist, setMarkRegDist] = useState('');
  const [marks, setMarks] = useState<string[]>([]);
  const [siteRegDist, setSiteRegDist] = useState('');
  const [sites, setSites] = useState<string[]>([]);

  const [dateErrors, setDateErrors] = useState<ReportDateRangeErrors>(noReportDateErrors);
  const [invalidMarks, setInvalidMarks] = useState<string[]>([]);
  const [invalidSites, setInvalidSites] = useState<string[]>([]);
  const { isLoading, error, setError, success, outputParams, outputOptions, resetOutput, clearMessages, submit } =
    useReportSubmission({ downloadBaseName: 'Designated-Marks-Exception' });

  // Cross-field date rules re-run as the window is edited, so an inverted range is called out as
  // soon as the second date is entered rather than only when Send is pressed.
  useEffect(() => {
    setDateErrors(validateReportDateRange(fromDate, toDate, 'change'));
  }, [fromDate, toDate]);

  // Clear the "does not exist" flags as soon as the marks change, so a corrected/removed
  // mark drops its red state without waiting for the next Send.
  useEffect(() => {
    setInvalidMarks([]);
  }, [marks]);

  useEffect(() => {
    setInvalidSites([]);
  }, [sites]);

  const onReset = () => {
    setFromDate('');
    setToDate('');
    setMarkRegDist('');
    setMarks([]);
    setSiteRegDist('');
    setSites([]);
    resetOutput();
    setDateErrors(noReportDateErrors);
    setInvalidMarks([]);
    setInvalidSites([]);
  };

  const normalizedMarks = useMemo(
    () => dedupeCaseInsensitive(
      marks
        .map((value) => value.trim())
        .filter(Boolean),
    ).slice(0, 6),
    [marks],
  );

  const normalizedSites = useMemo(
    () => dedupeCaseInsensitive(
      sites
        .map((value) => value.trim())
        .filter(Boolean),
    ).slice(0, 6),
    [sites],
  );

  const payload: DesignatedMarksExceptionReportRequest = useMemo(() => ({
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    markRegDist: markRegDist || 'ALL',
    siteRegDist: siteRegDist || 'ALL',
    mark1: normalizedMarks[0] || undefined,
    mark2: normalizedMarks[1] || undefined,
    mark3: normalizedMarks[2] || undefined,
    mark4: normalizedMarks[3] || undefined,
    mark5: normalizedMarks[4] || undefined,
    mark6: normalizedMarks[5] || undefined,
    site1: normalizedSites[0] || undefined,
    site2: normalizedSites[1] || undefined,
    site3: normalizedSites[2] || undefined,
    site4: normalizedSites[3] || undefined,
    site5: normalizedSites[4] || undefined,
    site6: normalizedSites[5] || undefined,
    ...outputParams,
  }), [
    fromDate,
    markRegDist,
    siteRegDist,
    toDate,
    normalizedMarks,
    normalizedSites,
    outputParams,
  ]);

  const handleSend = useCallback(async () => {
    clearMessages();

    // Validate BEFORE entering the loading state, so a rejected window never shows
    // "Report Generating...".
    const errors = validateReportDateRange(fromDate, toDate, 'submit');
    setDateErrors(errors);
    if (hasReportDateErrors(errors)) {
      return;
    }

    // Referential checks (legacy DesignatedMarksExceptionReportForm.validate): every mark must be a real
    // timber mark (ReportValidator.doesMarkExist — HAULING_AUTHORITY, so a mark needs no designation) and
    // every site a real scale site (ReportValidator.doesSiteExist — an exact site-number read). Offending
    // values are flagged on their own field and the report is not sent; the endpoint enforces the same rules.
    // A thrown lookup means validation could not RUN — distinct from the report itself failing (legacy
    // surfaced these separately), so it gets its own message and never reads as a report failure.
    const checkMarksAndSites = async (token: string | undefined) => {
      let missingMarks: string[];
      let missingSites: string[];
      try {
        const [markChecks, siteChecks] = await Promise.all([
          Promise.all(
            normalizedMarks.map(async (mark) => ({
              value: mark,
              exists: await API.timberMarks.timberMarkExists(mark, token),
            })),
          ),
          Promise.all(
            normalizedSites.map(async (site) => {
              // The search endpoint matches partially, so require an exact site-number hit, as legacy's
              // ScaleSiteDelegate.findBySiteId did.
              const matches = await API.scaleSites.searchScaleSites({ scaleSiteIdNmbr: site }, token);
              const exists = matches.some(
                (match) => String(match.scaleSiteIdNmbr ?? '').trim().toUpperCase() === site.toUpperCase(),
              );
              return { value: site, exists };
            }),
          ),
        ]);
        missingMarks = markChecks.filter((check) => !check.exists).map((check) => check.value);
        missingSites = siteChecks.filter((check) => !check.exists).map((check) => check.value);
      } catch {
        setError('Unable to verify the entered marks and sites. Please try again.');
        return false;
      }
      setInvalidMarks(missingMarks);
      setInvalidSites(missingSites);
      return missingMarks.length === 0 && missingSites.length === 0;
    };

    await submit(
      (token) => API.reports.submitDesignatedMarksExceptionReport(payload, token),
      { checks: checkMarksAndSites },
    );
  }, [clearMessages, fromDate, normalizedMarks, normalizedSites, payload, setError, submit, toDate]);

  // One "does not exist" line per offending mark, matching the legacy field-level message.
  const marksInvalidText = invalidMarks.length
    ? invalidMarks.map((mark) => `A Timbermark for ${mark} does not exist in the system.`).join(' ')
    : undefined;
  const sitesInvalidText = invalidSites.length
    ? invalidSites.map((site) => `A Scale Site for ${site} does not exist in the system.`).join(' ')
    : undefined;

  return (
    <ReportPage
      title="Designated Marks Exception Report"
      subtitle="Description: This report lists all the non-designated timber marks that appear at scale sites by District, Region or the whole province."
      formClassName="designated-marks-exception-form"
      isLoading={isLoading}
      success={success}
      error={error}
      outputOptions={{
        ...outputOptions,
        onReset,
        onSend: handleSend,
        layout: 'form',
        showHeading: true,
      }}
    >
      <Grid className="scs__form__grid">
        <Column lg={8} md={4} sm={4}>
          <DateInput
            id="from-date"
            value={fromDate}
            onChange={(v: string) => setFromDate(v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="From Date"
            labelText="From Date"
            hideLabel={false}
            disabled={isLoading}
            invalid={Boolean(dateErrors.fromError)}
            invalidText={dateErrors.fromError ?? undefined}
          />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <DateInput
            id="to-date"
            value={toDate}
            onChange={(v: string) => setToDate(v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="To Date"
            labelText="To Date"
            hideLabel={false}
            disabled={isLoading}
            invalid={Boolean(dateErrors.toError)}
            invalidText={dateErrors.toError ?? undefined}
          />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <RegDistSelect id="mark-reg-dist" value={markRegDist} onChange={setMarkRegDist} hideLabel={false} labelText="Mark Reg / Dist" disabled={isLoading} grouped />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <MultiValueInput
            id="designated-marks"
            label="Marks"
            values={marks}
            onChange={setMarks}
            placeholder="Enter a timber mark"
            maxItems={6}
            maxLength={MARK_SITE_MAX_LENGTH}
            disabled={isLoading}
            invalidValues={invalidMarks}
            invalidText={marksInvalidText}
          />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <RegDistSelect id="site-reg-dist" value={siteRegDist} onChange={setSiteRegDist} hideLabel={false} labelText="Scale Site Reg / Dist" disabled={isLoading} grouped />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <MultiValueInput
            id="designated-sites"
            label="Scale Sites"
            values={sites}
            onChange={setSites}
            placeholder="Enter a scale site #"
            maxItems={6}
            maxLength={MARK_SITE_MAX_LENGTH}
            disabled={isLoading}
            invalidValues={invalidSites}
            invalidText={sitesInvalidText}
          />
        </Column>
      </Grid>
      <div className="scs__form__divider" />
    </ReportPage>
  );
};

export default DesignatedMarkExceptionPage;
