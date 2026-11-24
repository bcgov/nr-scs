import { Grid, Column, Select, SelectItem } from '@carbon/react';
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

import type { ScalerRegisterReportRequest } from '@/services/reports.service';

const primarySortMap: Record<string, number> = {
  'Scaler Last Name': 1,
  'License #': 2,
};

// Single source of truth for the sort default, so the initial state and onReset cannot drift apart
// (the Scale Site Register report had exactly that bug — Reset restored a different sort order).
const DEFAULT_PRIMARY_SORT = 'Scaler Last Name';

const toCode = (value: string) => value?.toUpperCase() || 'ALL';

const ScalerRegisterPage: FC = () => {
  const [regDist, setRegDist] = useState('');
  const [licenceStatus, setLicenceStatus] = useState('All');
  const [authStatus, setAuthStatus] = useState('ALL');
  const [appointmentStatus, setAppointmentStatus] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [primarySort, setPrimarySort] = useState(DEFAULT_PRIMARY_SORT);
  const [secondarySort, setSecondarySort] = useState('');
  const [dateErrors, setDateErrors] = useState<ReportDateRangeErrors>(noReportDateErrors);
  const { isLoading, error, success, outputParams, outputOptions, resetOutput, clearMessages, submit } =
    useReportSubmission({ downloadBaseName: 'Scaler-Register' });

  // Cross-field date rules re-run as the window is edited, so an inverted range is called out as soon as
  // the second date is entered rather than only when Send is pressed.
  useEffect(() => {
    setDateErrors(validateReportDateRange(fromDate, toDate, 'change'));
  }, [fromDate, toDate]);

  const onReset = () => {
    setRegDist('');
    setLicenceStatus('All');
    setAuthStatus('ALL');
    setAppointmentStatus('All');
    setFromDate('');
    setToDate('');
    setPrimarySort(DEFAULT_PRIMARY_SORT);
    setSecondarySort('');
    resetOutput();
    setDateErrors(noReportDateErrors);
  };

  const payload: ScalerRegisterReportRequest = useMemo(
    () => ({
      regDist: regDist || 'ALL',
      licenceStatus: toCode(licenceStatus),
      authStatus: authStatus || 'ALL',
      appointmentType: toCode(appointmentStatus),
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      primarySort: primarySortMap[primarySort] ?? 1,
      secondarySort: secondarySort ? primarySortMap[secondarySort] ?? 0 : 0,
      ...outputParams,
    }),
    [appointmentStatus, authStatus, fromDate, licenceStatus, outputParams, primarySort, regDist, secondarySort, toDate],
  );

  const handleSend = useCallback(async () => {
    clearMessages();

    // Validate BEFORE entering the loading state, so a rejected window never shows "Report Generating...".
    const errors = validateReportDateRange(fromDate, toDate, 'submit');
    setDateErrors(errors);
    if (hasReportDateErrors(errors)) {
      return;
    }

    await submit((token) => API.reports.submitScalerRegisterReport(payload, token));
  }, [clearMessages, fromDate, payload, submit, toDate]);

  return (
    <ReportPage
      title="Scaler Register Report"
      subtitle="Description: This report lists all scalers, authorized or unauthorized, by District, Region or the whole Province and provides additional scaler licence and authorization details."
      formClassName="scaler-register-form"
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
          { value: 'Scaler Last Name', label: 'Scaler Last Name' },
          { value: 'License #', label: 'License #' },
        ],
        primarySort,
        onPrimarySortChange: setPrimarySort,
        secondarySort,
        onSecondarySortChange: setSecondarySort,
        disabled: isLoading,
      }}
    >
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4}>
          <RegDistSelect value={regDist} onChange={setRegDist} hideLabel={false} labelText="Reg / Dist" disabled={isLoading} grouped />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="licence-status"
            value={licenceStatus}
            onChange={(e) => setLicenceStatus(e.target.value)}
            disabled={isLoading}
            labelText="Licence Status"
          >
            <SelectItem value="All" text="All" />
            <SelectItem value="Cancelled" text="Cancelled" />
            <SelectItem value="Expired" text="Expired" />
            <SelectItem value="Suspended" text="Suspended" />
            <SelectItem value="Valid" text="Valid" />
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="auth-status"
            value={authStatus}
            onChange={(e) => setAuthStatus(e.target.value)}
            disabled={isLoading}
            labelText="Authorization Status"
          >
            <SelectItem value="ALL" text="All" />
            <SelectItem value="CANCELLED" text="Cancelled" />
            <SelectItem value="EXPIRED" text="Expired" />
            <SelectItem value="VALID" text="Valid" />
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="appointment-status"
            value={appointmentStatus}
            onChange={(e) => setAppointmentStatus(e.target.value)}
            disabled={isLoading}
            labelText="Appointment Type Status"
          >
            <SelectItem value="All" text="All" />
            <SelectItem value="Cancelled" text="Cancelled" />
            <SelectItem value="Expired" text="Expired" />
            <SelectItem value="Valid" text="Valid" />
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="from-date"
            value={fromDate}
            onChange={(v: string) => setFromDate(v)}
            disabled={isLoading}
            placeholder="YYYY-MM-DD"
            ariaLabel="From Date"
            labelText="From Date"
            hideLabel={false}
            invalid={Boolean(dateErrors.fromError)}
            invalidText={dateErrors.fromError ?? undefined}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="to-date"
            value={toDate}
            onChange={(v: string) => setToDate(v)}
            disabled={isLoading}
            placeholder="YYYY-MM-DD"
            ariaLabel="To Date"
            labelText="To Date"
            hideLabel={false}
            invalid={Boolean(dateErrors.toError)}
            invalidText={dateErrors.toError ?? undefined}
          />
        </Column>
      </Grid>
      <div className="scs__form__divider" />
    </ReportPage>
  );
};

export default ScalerRegisterPage;
