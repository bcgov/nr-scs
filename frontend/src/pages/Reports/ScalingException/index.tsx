import { Grid, Column } from '@carbon/react';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';

import DateInput from '@/components/core/DateInput';
import RegDistSelect from '@/components/core/RegDistSelect';
import ReportPage from '@/components/core/ReportPage';
import { useReportSubmission } from '@/components/core/ReportPage/useReportSubmission';
import API from '@/services/APIs';
import {
  hasReportDateErrors,
  noReportDateErrors,
  validateReportDateRange,
  type ReportDateRangeErrors,
} from '@/utils/reportDateRange';

import type { ScalingExceptionReportRequest } from '@/services/reports.service';

const sortMap: Record<string, number> = {
  'Date of Scale': 1,
  'Scaler Licence Number': 2,
  'Scale Site Number': 3,
};

// Single source of truth for the sort default, so the initial state and onReset cannot drift apart
// (the Scale Site Register report had exactly that bug — Reset restored a different sort order).
const DEFAULT_PRIMARY_SORT = 'Date of Scale';

const ScalingExceptionPage: FC = () => {
  const [regDist, setRegDist] = useState('');
  const [fromScaleDate, setFromScaleDate] = useState('');
  const [toScaleDate, setToScaleDate] = useState('');
  const [primarySort, setPrimarySort] = useState(DEFAULT_PRIMARY_SORT);
  const [secondarySort, setSecondarySort] = useState('');
  const [dateErrors, setDateErrors] = useState<ReportDateRangeErrors>(noReportDateErrors);
  const { isLoading, error, success, outputParams, outputOptions, resetOutput, clearMessages, submit } =
    useReportSubmission({ downloadBaseName: 'Scaling-Exception' });

  // Cross-field date rules re-run as the window is edited, so an inverted range is called out as
  // soon as the second date is entered rather than only when Send is pressed.
  useEffect(() => {
    setDateErrors(validateReportDateRange(fromScaleDate, toScaleDate, 'change', { fromLabel: 'From Scale Date', toLabel: 'To Scale Date' }));
  }, [fromScaleDate, toScaleDate]);

  const onReset = () => {
    setRegDist('');
    setFromScaleDate('');
    setToScaleDate('');
    setPrimarySort(DEFAULT_PRIMARY_SORT);
    setSecondarySort('');
    resetOutput();
    setDateErrors(noReportDateErrors);
  };

  const payload: ScalingExceptionReportRequest = useMemo(() => ({
    regDist: regDist || 'ALL',
    fromDate: fromScaleDate || undefined,
    toDate: toScaleDate || undefined,
    primarySort: sortMap[primarySort] ?? 1,
    secondarySort: secondarySort ? sortMap[secondarySort] ?? 0 : 0,
    ...outputParams,
  }), [fromScaleDate, outputParams, primarySort, regDist, secondarySort, toScaleDate]);

  const handleSend = useCallback(async () => {
    clearMessages();

    // Validate BEFORE entering the loading state, so a rejected window never shows
    // "Report Generating...".
    const errors = validateReportDateRange(fromScaleDate, toScaleDate, 'submit', { fromLabel: 'From Scale Date', toLabel: 'To Scale Date' });
    setDateErrors(errors);
    if (hasReportDateErrors(errors)) {
      return;
    }

    await submit((token) => API.reports.submitScalingExceptionReport(payload, token));
  }, [clearMessages, fromScaleDate, payload, submit, toScaleDate]);

  return (
    <ReportPage
      title="Scaling Exception Report"
      subtitle="Description: This report lists exceptions that occured on the date of scale pertaining to authorizations for Scalers, Scale Sites, and a Scaler's relationship to a Scale Site."
      formClassName="scaling-exception-form"
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
      sortOrder={{
        layout: 'form',
        showHeading: true,
        options: [
          { value: 'Date of Scale', label: 'Date of Scale' },
          { value: 'Scaler Licence Number', label: 'Scaler Licence Number' },
          { value: 'Scale Site Number', label: 'Scale Site Number' },
        ],
        primarySort,
        onPrimarySortChange: setPrimarySort,
        secondarySort,
        onSecondarySortChange: setSecondarySort,
      }}
    >
      <Grid className="scs__form__grid">
        <Column lg={16} md={8} sm={4}>
          <RegDistSelect value={regDist} onChange={setRegDist} hideLabel={false} labelText="Reg / Dist" disabled={isLoading} grouped />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="from-scale-date"
            value={fromScaleDate}
            onChange={(v: string) => setFromScaleDate(v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="From Scale Date"
            labelText="From Scale Date"
            hideLabel={false}
            disabled={isLoading}
            invalid={Boolean(dateErrors.fromError)}
            invalidText={dateErrors.fromError ?? undefined}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="to-scale-date"
            value={toScaleDate}
            onChange={(v: string) => setToScaleDate(v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="To Scale Date"
            labelText="To Scale Date"
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

export default ScalingExceptionPage;
