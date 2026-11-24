import { Grid, Column } from '@carbon/react';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';

import DateInput from '@/components/core/DateInput';
import RegDistSelect from '@/components/core/RegDistSelect';
import ReportPage from '@/components/core/ReportPage';
import { type ReportSubmitResult, useReportSubmission } from '@/components/core/ReportPage/useReportSubmission';
import {
  hasReportDateErrors,
  noReportDateErrors,
  validateReportDateRange,
  type ReportDateRangeErrors,
} from '@/utils/reportDateRange';

/**
 * The parameter set shared by every Reg/Dist + date-window report. All three callers post exactly
 * these fields, so the payload is built here rather than in each page.
 */
export type RegDistDateRangeReportRequest = {
  regDist: string;
  fromDate?: string;
  toDate?: string;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

/** Cross-field date rules; omit for a report whose window is optional and uncapped. */
export type ReportDateRules = { required: boolean; maxYears: number };

type Props = {
  title: string;
  subtitle: string;
  formClassName: string;
  /** Base name for the downloaded file, e.g. `District-Check-Scale-Performance`. */
  downloadBaseName: string;
  /**
   * Date-window rules. When supplied, From/To are marked required and validated on every edit;
   * when omitted the window is optional and only the ordering rule applies.
   */
  dateRules?: ReportDateRules;
  submit: (
    payload: RegDistDateRangeReportRequest,
    token: string | undefined,
  ) => Promise<ReportSubmitResult>;
};

const requiredLabel = (text: string) => (
  <>
    {text}{' '}
    <span style={{ color: 'var(--cds-support-error, #da1e28)' }} aria-hidden="true">
      *
    </span>
  </>
);

/**
 * The shared Reg/Dist + From/To report screen. District Check Scale Performance, District Site
 * Inspection Performance and Scaling Administration are the same form over the same payload; only
 * their titles, endpoint and date rules differ.
 */
const RegDistDateRangeReport: FC<Props> = ({
  title,
  subtitle,
  formClassName,
  downloadBaseName,
  dateRules,
  submit,
}) => {
  const [regDist, setRegDist] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateErrors, setDateErrors] = useState<ReportDateRangeErrors>(noReportDateErrors);
  // `submit` is this component's prop (the endpoint to post to); the hook's runner is `submitReport`.
  const { isLoading, error, success, outputParams, outputOptions, resetOutput, clearMessages, submit: submitReport } =
    useReportSubmission({ downloadBaseName });

  // Cross-field date rules re-run as the window is edited, so an inverted range is called out as
  // soon as the second date is entered rather than only when Send is pressed. The effect keys on
  // the rule *values*, not the object: a caller writing `dateRules={{ required: true, maxYears: 1 }}`
  // inline hands over a new object every render, which would otherwise re-run the effect, set a
  // fresh errors object, and re-render forever.
  const dateRulesRequired = dateRules?.required;
  const dateRulesMaxYears = dateRules?.maxYears;
  useEffect(() => {
    const rules =
      dateRulesRequired === undefined || dateRulesMaxYears === undefined
        ? undefined
        : { required: dateRulesRequired, maxYears: dateRulesMaxYears };
    setDateErrors(validateReportDateRange(fromDate, toDate, 'change', rules));
  }, [dateRulesRequired, dateRulesMaxYears, fromDate, toDate]);

  const onReset = () => {
    setRegDist('');
    setFromDate('');
    setToDate('');
    setDateErrors(noReportDateErrors);
    resetOutput();
  };

  const payload: RegDistDateRangeReportRequest = useMemo(
    () => ({
      regDist: regDist || 'ALL',
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      ...outputParams,
    }),
    [fromDate, outputParams, regDist, toDate],
  );

  const handleSend = useCallback(async () => {
    clearMessages();

    // Validate BEFORE entering the loading state, so a rejected window never shows
    // "Report Generating...".
    const errors = validateReportDateRange(fromDate, toDate, 'submit', dateRules);
    setDateErrors(errors);
    if (hasReportDateErrors(errors)) {
      return;
    }

    await submitReport((token) => submit(payload, token));
  }, [clearMessages, dateRules, fromDate, payload, submit, submitReport, toDate]);

  const datesRequired = Boolean(dateRules?.required);

  return (
    <ReportPage
      title={title}
      subtitle={subtitle}
      formClassName={formClassName}
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
        <Column lg={16} md={8} sm={4}>
          <RegDistSelect
            value={regDist}
            onChange={setRegDist}
            hideLabel={false}
            labelText="Reg / Dist"
            disabled={isLoading}
            grouped
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="from-date"
            value={fromDate}
            onChange={(v: string) => setFromDate(v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="From Date"
            labelText={datesRequired ? requiredLabel('From Date') : 'From Date'}
            hideLabel={false}
            disabled={isLoading}
            invalid={Boolean(dateErrors.fromError)}
            invalidText={dateErrors.fromError ?? undefined}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="to-date"
            value={toDate}
            onChange={(v: string) => setToDate(v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="To Date"
            labelText={datesRequired ? requiredLabel('To Date') : 'To Date'}
            hideLabel={false}
            disabled={isLoading}
            invalid={Boolean(dateErrors.toError)}
            invalidText={dateErrors.toError ?? undefined}
          />
        </Column>
      </Grid>
      <div className="scs__form__divider" />
    </ReportPage>
  );
};

export default RegDistDateRangeReport;
