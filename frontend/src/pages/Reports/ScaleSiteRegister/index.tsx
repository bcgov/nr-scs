import { Grid, Column, Select, SelectItem, TextInput } from '@carbon/react';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';

import DateInput from '@/components/core/DateInput';
import RegDistSelect from '@/components/core/RegDistSelect';
import ReportPage from '@/components/core/ReportPage';
import { useReportSubmission } from '@/components/core/ReportPage/useReportSubmission';
import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import API from '@/services/APIs';
import {
  hasReportDateErrors,
  noReportDateErrors,
  validateReportDateRange,
  type ReportDateRangeErrors,
} from '@/utils/reportDateRange';

import type { StaticLov } from '@/services/lov.service';
import type { ScaleSiteRegisterReportRequest } from '@/services/reports.service';

const primarySortMap: Record<string, number> = {
  'Scale Site Number': 1,
  'Scale Site Name': 2,
  'Scale Site Owner': 3,
  'Client Name': 4,
  'Scale Type': 5,
};

// Single source of truth for the sort default. Previously the initial state said 'Scale Site Number' while
// onReset said 'Scale Site Name', so pressing Reset silently changed the report's ordering (primarySort 1 → 2)
// instead of restoring the form. Both now read this constant.
const DEFAULT_PRIMARY_SORT = 'Scale Site Number';

// The number is trimmed and uppercased once, here: it is both what the existence check looks up and what
// the report filters on, and legacy uppercased the field server-side. P_SCALE_SITE_NMBR reaches the report
// engine verbatim, so a lowercase entry that skipped this would clear validation and then match nothing.
const normalizeSiteNumber = (value: string) => value.trim().toUpperCase();

const ScaleSiteRegisterPage: FC = () => {
  const [regDist, setRegDist] = useState('');
  const [siteNumber, setSiteNumber] = useState('');
  const [scaleType, setScaleType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [primarySort, setPrimarySort] = useState(DEFAULT_PRIMARY_SORT);
  const [secondarySort, setSecondarySort] = useState('');
  const [authorizationStatus, setAuthorizationStatus] = useState('ALL');
  const { userToken } = useAuth();
  const [dateErrors, setDateErrors] = useState<ReportDateRangeErrors>(noReportDateErrors);
  const [siteNumberError, setSiteNumberError] = useState<string | null>(null);
  const { isLoading, error, success, outputParams, outputOptions, resetOutput, clearMessages, submit } =
    useReportSubmission({ downloadBaseName: 'Scale-Site-Register' });

  const loadScaleTypes = useCallback(async () => {
    const token = await userToken();
    return API.lov.getStaticLov(undefined, token);
  }, [userToken]);

  const { data: scaleTypeLovs, isLoading: isLoadingScaleTypes } = useLovOptions<StaticLov>(
    loadScaleTypes,
    {
      errorMessage: 'Could not load scale types.',
      cacheKey: 'static-lov:all',
    },
  );

  const scaleTypeOptions = useMemo(() => (scaleTypeLovs ?? [])
    .filter((opt) => String(opt.tableKey ?? '').toUpperCase() === 'SCALE_METHOD_TYPE_CODE')
    .filter((opt) => opt.code)
    .map((opt) => ({
      value: String(opt.code ?? '').trim(),
      text: String(opt.description ?? '').trim(),
    })), [scaleTypeLovs]);

  // Cross-field date rules re-run as the window is edited, so an inverted range is called out as
  // soon as the second date is entered rather than only when Send is pressed.
  useEffect(() => {
    setDateErrors(validateReportDateRange(fromDate, toDate, 'change'));
  }, [fromDate, toDate]);

  const onReset = () => {
    setRegDist('');
    setScaleType('');
    setFromDate('');
    setToDate('');
    setPrimarySort(DEFAULT_PRIMARY_SORT);
    setSecondarySort('');
    resetOutput();
    setSiteNumber('');
    setAuthorizationStatus('ALL');
    setDateErrors(noReportDateErrors);
    setSiteNumberError(null);
  };

  const payload: ScaleSiteRegisterReportRequest = useMemo(
    () => ({
      regDist: regDist || 'ALL',
      scaleType: scaleType || 'ALL',
      scaleSiteNumber: normalizeSiteNumber(siteNumber) || undefined,
      siteStatus: authorizationStatus || 'ALL',
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      primarySort: primarySortMap[primarySort] ?? 1,
      secondarySort: secondarySort ? primarySortMap[secondarySort] ?? 0 : 0,
      ...outputParams,
      authorizedScalersOnly: false,
    }),
    [
      authorizationStatus,
      fromDate,
      outputParams,
      primarySort,
      regDist,
      scaleType,
      secondarySort,
      siteNumber,
      toDate,
    ],
  );

  const handleSend = useCallback(async () => {
    clearMessages();
    setSiteNumberError(null);

    // Validate BEFORE entering the loading state, so a rejected window never shows
    // "Report Generating...".
    const errors = validateReportDateRange(fromDate, toDate, 'submit');
    setDateErrors(errors);
    if (hasReportDateErrors(errors)) {
      return;
    }

    // Scale Site # is an optional filter, but a value matching no site must BLOCK the run rather than
    // quietly produce an empty report - legacy ScaleSiteReportBo.validateScaleSiteRep() rejected the
    // submit with errors.mark_site_scale before anything reached the report engine. Resolved through
    // the same site search every other Scale Site # field uses (Create/Edit Mark Site Designation,
    // Create/Edit Scaler Authorization). That search matches the number exactly today, so the compare
    // below is belt-and-braces: it keeps "found" meaning THIS site if the search ever broadens.
    const enteredSiteNumber = normalizeSiteNumber(siteNumber);

    const checkSiteNumber = async (token: string | undefined) => {
      if (enteredSiteNumber) {
        const matches = await API.scaleSites.searchScaleSites(
          { scaleSiteIdNmbr: enteredSiteNumber },
          token,
        );
        const found = matches?.some(
          (site) => String(site.scaleSiteIdNmbr ?? '').trim().toUpperCase() === enteredSiteNumber,
        );

        if (!found) {
          setSiteNumberError(`A Scale Site could not be found for ${enteredSiteNumber}.`);
          return false;
        }
      }
      return true;
    };

    await submit(
      (token) => API.reports.submitScaleSiteRegisterReport(payload, token),
      { checks: checkSiteNumber, checksBeforeLoading: true },
    );
  }, [clearMessages, fromDate, payload, siteNumber, submit, toDate]);

  return (
    <ReportPage
      title="Scale Site Register Report"
      subtitle="Description: This report lists all scale sites, authorized or unauthorized, by District, Region or the whole Province and provides additional scale site  authorization details."
      formClassName="scale-site-register-form"
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
          { value: 'Scale Site Number', label: 'Scale Site Number' },
          { value: 'Scale Site Name', label: 'Scale Site Name' },
          { value: 'Client Name', label: 'Client Name' },
          { value: 'Scale Site Owner', label: 'Scale Site Owner' },
          { value: 'Scale Type', label: 'Scale Type' },
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
            id="scale-type"
            value={scaleType}
            onChange={(e) => setScaleType(e.target.value)}
            labelText="Scale Type"
            disabled={isLoading || isLoadingScaleTypes}
          >
            <SelectItem value="" text="All" />
            {scaleTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} text={opt.text} />
            ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="site-number"
            value={siteNumber}
            onChange={(e) => {
              setSiteNumber(e.target.value);
              setSiteNumberError(null);
            }}
            placeholder=""
            labelText="Scale Site #"
            // SCALE_SITE_ID_NMBR is 4 characters (legacy scaleSiteRegister.jsp used size="4" maxlength="4",
            // and every validator declared MAXLENGTH_SCALE_SITE_ID_NMBR = 4). Without the cap a longer
            // entry could only ever fail the existence check below, so stop it at the keystroke instead of
            // spending a lookup to reject it. Matches Create/Edit Scale Site Authorization.
            maxLength={4}
            disabled={isLoading}
            invalid={Boolean(siteNumberError)}
            invalidText={siteNumberError ?? undefined}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="authorization-status"
            value={authorizationStatus}
            onChange={(e) => setAuthorizationStatus(e.target.value)}
            labelText="Auth Status"
            disabled={isLoading}
          >
            <SelectItem value="ALL" text="All" />
            <SelectItem value="CANCELLED" text="Cancelled" />
            <SelectItem value="EXPIRED" text="Expired" />
            <SelectItem value="VALID" text="Valid" />
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

export default ScaleSiteRegisterPage;
