import {
  Column,
  Grid,
  Select,
  SelectItem
} from '@carbon/react';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';

import DateInput from '@/components/core/DateInput';
import MultiValueInput from '@/components/core/MultiValueInput';
import RegDistSelect from '@/components/core/RegDistSelect';
import ReportPage from '@/components/core/ReportPage';
import { useReportSubmission } from '@/components/core/ReportPage/useReportSubmission';
import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import API from '@/services/APIs';
import { dedupeCaseInsensitive } from '@/utils/dedupeCaseInsensitive';
import {
  hasReportDateErrors,
  noReportDateErrors,
  validateReportDateRange,
  type ReportDateRangeErrors,
} from '@/utils/reportDateRange';

import type { StaticLov } from '@/services/lov.service';
import type { MarkSiteDesignationReportRequest } from '@/services/reports.service';
// The two date windows on this screen are ALL-OR-NOTHING: legacy `MarkSiteDesignationReportBo.validateDates`
// raised `errors.mark_site_eff_date_both` / `errors.mark_site_exp_date_both` when exactly one half of a pair
// was filled. This is the only screen legacy applied that rule to, hence the opt-in flag rather than a change
// to the shared helper's defaults. Hoisted to module scope so the change-mode and submit-mode call sites
// below cannot drift apart on the rule set or the labels.
const EFFECTIVE_WINDOW = {
  fromLabel: 'Effective Date (From)',
  toLabel: 'Effective Date (To)',
  pairedRequired: true,
} as const;

const EXPIRY_WINDOW = {
  fromLabel: 'Expiry Date (From)',
  toLabel: 'Expiry Date (To)',
  pairedRequired: true,
} as const;

// Legacy capped each mark / site box at 12 characters (markSiteDesignation.jsp). The cap also keeps an over-long
// mark off /timber-marks/exists, whose 20-character limit would refuse it with a 400 (shown here as "could not
// verify") instead of flagging it on its field as not existing.
const MARK_SITE_MAX_LENGTH = 12;

const MarkSiteDesignationPage: FC = () => {
  const [regDist, setRegDist] = useState('');
  const [markOrSite, setMarkOrSite] = useState<'MARK' | 'SITE'>('MARK');
  const [specificValues, setSpecificValues] = useState<string[]>([]);
  const [markExceptions, setMarkExceptions] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [expiryFrom, setExpiryFrom] = useState('');
  const [expiryTo, setExpiryTo] = useState('');
  const { userToken } = useAuth();
  // TWO independent windows on this screen, so two error sets — and each names its own fields, because a
  // generic "To Date must be on or after From Date." could not tell the user which window is wrong.
  const [effectiveErrors, setEffectiveErrors] = useState<ReportDateRangeErrors>(noReportDateErrors);
  const [expiryErrors, setExpiryErrors] = useState<ReportDateRangeErrors>(noReportDateErrors);
  const [invalidSiteMarks, setInvalidSiteMarks] = useState<string[]>([]);
  const { isLoading, error, setError, success, outputParams, outputOptions, resetOutput, clearMessages, submit } =
    useReportSubmission({ downloadBaseName: 'Mark-Site-Designation' });

  const loadStaticLov = useCallback(async () => {
    const token = await userToken();
    return API.lov.getStaticLov(undefined, token);
  }, [userToken]);

  const { data: staticLovs, isLoading: isLoadingStaticLovs } = useLovOptions<StaticLov>(
    loadStaticLov,
    {
      errorMessage: 'Could not load mark exemptions.',
      cacheKey: 'static-lov:all',
    },
  );

  const markExceptionOptions = useMemo(() => (staticLovs ?? [])
    .filter((opt) => String(opt.tableKey ?? '').toUpperCase() === 'EXEMPT_MARK_METHOD_CODE')
    .filter((opt) => opt.code)
    .map((opt) => ({
      value: String(opt.code ?? '').trim(),
      text: String(opt.description ?? '').trim(),
    })), [staticLovs]);

  useEffect(() => {
    setEffectiveErrors(validateReportDateRange(effectiveFrom, effectiveTo, 'change', EFFECTIVE_WINDOW));
    setExpiryErrors(validateReportDateRange(expiryFrom, expiryTo, 'change', EXPIRY_WINDOW));
  }, [effectiveFrom, effectiveTo, expiryFrom, expiryTo]);

  // Drop the "does not exist" flags as soon as the entered values (or the Mark/Site toggle) change,
  // so a corrected value clears its red state without waiting for the next Send.
  useEffect(() => {
    setInvalidSiteMarks([]);
  }, [specificValues, markOrSite]);

  const onReset = () => {
    setRegDist('');
    setMarkOrSite('MARK');
    setSpecificValues([]);
    setMarkExceptions('');
    setEffectiveFrom('');
    setEffectiveTo('');
    setExpiryFrom('');
    setExpiryTo('');
    resetOutput();
    setEffectiveErrors(noReportDateErrors);
    setExpiryErrors(noReportDateErrors);
    setInvalidSiteMarks([]);
  };

  const normalizedSpecificValues = useMemo(
    () => dedupeCaseInsensitive(
      specificValues
        .map((value) => value.trim())
        .filter(Boolean),
    ).slice(0, 6),
    [specificValues],
  );

  const payload: MarkSiteDesignationReportRequest = useMemo(() => ({
    regDist: regDist || 'ALL',
    markOrSite,
    markExemption: markExceptions || undefined,
    effectiveFrom: effectiveFrom || undefined,
    effectiveTo: effectiveTo || undefined,
    expiryFrom: expiryFrom || undefined,
    expiryTo: expiryTo || undefined,
    siteMark1: normalizedSpecificValues[0] || undefined,
    siteMark2: normalizedSpecificValues[1] || undefined,
    siteMark3: normalizedSpecificValues[2] || undefined,
    siteMark4: normalizedSpecificValues[3] || undefined,
    siteMark5: normalizedSpecificValues[4] || undefined,
    siteMark6: normalizedSpecificValues[5] || undefined,
    ...outputParams,
  }), [
    effectiveFrom,
    effectiveTo,
    expiryFrom,
    expiryTo,
    markExceptions,
    markOrSite,
    regDist,
    normalizedSpecificValues,
    outputParams,
  ]);

  const handleSend = useCallback(async () => {
    clearMessages();

    // Validate BOTH windows before entering the loading state.
    const nextEffective = validateReportDateRange(effectiveFrom, effectiveTo, 'submit', EFFECTIVE_WINDOW);
    const nextExpiry = validateReportDateRange(expiryFrom, expiryTo, 'submit', EXPIRY_WINDOW);
    setEffectiveErrors(nextEffective);
    setExpiryErrors(nextExpiry);
    if (hasReportDateErrors(nextEffective) || hasReportDateErrors(nextExpiry)) {
      return;
    }

    // Referential check (legacy MarkSiteDesignationReportBo.validateSitesAndMarks): each entered value
    // must resolve to a scale site OR a hauling mark authority; flag the ones that are neither.
    // A thrown lookup here means validation could not RUN — distinct from the report itself
    // failing (legacy surfaced these separately), so it gets its own message and never reads
    // as a report failure.
    const checkSitesAndMarks = async (token: string | undefined) => {
      let siteMarkChecks: { value: string; exists: boolean }[];
      try {
        siteMarkChecks = await Promise.all(
          normalizedSpecificValues.map(async (value) => {
            // Site side mirrors legacy ScaleSiteDelegate.findBySiteId, an exact read: the search endpoint
            // matches partially, so require an exact id hit rather than any row.
            const sites = await API.scaleSites.searchScaleSites({ scaleSiteIdNmbr: value }, token);
            const siteExists = sites.some(
              (site) => String(site.scaleSiteIdNmbr ?? '').trim().toUpperCase() === value.toUpperCase(),
            );
            if (siteExists) {
              return { value, exists: true };
            }
            // Mark side mirrors legacy HaulingMarkAuthorityDelegate.findByTimberMark which — despite its name —
            // searches HAULING_AUTHORITY, so any real timber mark counts, designated or not. (This used to search
            // the hauling-mark-authorization view and refused real marks with no designation: defects.md #4.)
            const exists = await API.timberMarks.timberMarkExists(value, token);
            return { value, exists };
          }),
        );
      } catch {
        setError('Unable to verify the entered sites and marks. Please try again.');
        return false;
      }
      const missing = siteMarkChecks.filter((m) => !m.exists).map((m) => m.value);
      if (missing.length > 0) {
        setInvalidSiteMarks(missing);
        return false;
      }
      setInvalidSiteMarks([]);
      return true;
    };

    await submit(
      (token) => API.reports.submitMarkSiteDesignationReport(payload, token),
      { checks: checkSitesAndMarks },
    );
  }, [clearMessages, effectiveFrom, effectiveTo, expiryFrom, expiryTo, normalizedSpecificValues, payload, setError, submit]);

  const specificLabel = markOrSite === 'MARK' ? 'Specific Timber Marks' : 'Scale Site #';

  // One "does not exist" line per offending value, matching the legacy field-level message.
  const siteMarkInvalidText = invalidSiteMarks.length
    ? invalidSiteMarks.map((value) => `A Site nor Timbermark for ${value} exist in the system.`).join(' ')
    : undefined;

  return (
    <ReportPage
      title="Mark Site Designation Report"
      subtitle="Description: This report lists all designations by Timber Mark and or Scale Sites"
      formClassName="mark-site-designation-form"
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
        <Column lg={8} md={8} sm={4}>
          <RegDistSelect value={regDist} onChange={setRegDist} hideLabel={false} labelText="Reg / Dist" disabled={isLoading} grouped />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="mark-or-site"
            value={markOrSite}
            onChange={(e) => setMarkOrSite(e.target.value as 'MARK' | 'SITE')}
            labelText="Timber Mark or Scale Site #"
            disabled={isLoading}
          >
            <SelectItem value="MARK" text="Mark" />
            <SelectItem value="SITE" text="Site" />
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <MultiValueInput
            id="specific-values"
            label={specificLabel}
            values={specificValues}
            onChange={setSpecificValues}
            placeholder={markOrSite === 'MARK' ? 'Enter a timber mark' : 'Enter a scale site #'}
            maxItems={6}
            maxLength={MARK_SITE_MAX_LENGTH}
            disabled={isLoading}
            invalidValues={invalidSiteMarks}
            invalidText={siteMarkInvalidText}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="mark-exceptions"
            value={markExceptions}
            onChange={(e) => setMarkExceptions(e.target.value)}
            labelText="Mark Exemptions"
            disabled={isLoading || isLoadingStaticLovs}
          >
            <SelectItem value="" text="All" />
            {markExceptionOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} text={opt.text} />
            ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="effective-from"
            value={effectiveFrom}
            onChange={(v: string) => setEffectiveFrom(v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="Effective From Date"
            labelText="Effective Date (From)"
            hideLabel={false}
            disabled={isLoading}
            invalid={Boolean(effectiveErrors.fromError)}
            invalidText={effectiveErrors.fromError ?? undefined}
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="effective-to"
            value={effectiveTo}
            onChange={(v: string) => setEffectiveTo(v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="Effective To Date"
            labelText="Effective Date (To)"
            hideLabel={false}
            disabled={isLoading}
            invalid={Boolean(effectiveErrors.toError)}
            invalidText={effectiveErrors.toError ?? undefined}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="expiry-from"
            value={expiryFrom}
            onChange={(v: string) => setExpiryFrom(v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="Expiry From Date"
            labelText="Expiry Date (From)"
            hideLabel={false}
            disabled={isLoading}
            invalid={Boolean(expiryErrors.fromError)}
            invalidText={expiryErrors.fromError ?? undefined}
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="expiry-to"
            value={expiryTo}
            onChange={(v: string) => setExpiryTo(v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="Expiry To Date"
            labelText="Expiry Date (To)"
            hideLabel={false}
            disabled={isLoading}
            invalid={Boolean(expiryErrors.toError)}
            invalidText={expiryErrors.toError ?? undefined}
          />
        </Column>
      </Grid>
      <div className="scs__form__divider" />
    </ReportPage>
  );
};

export default MarkSiteDesignationPage;
