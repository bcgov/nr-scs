import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Column, Form, Grid, InlineNotification, SkeletonText, TextArea, TextInput } from '@carbon/react';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import ScaleSiteLink from '@/components/core/ScaleSiteLink';
import WhoDidIt from '@/components/core/WhoDidIt';
import AuthorizationConditionsSection from '@/components/Form/AuthorizationConditionsSection';
import TableResource from '@/components/Form/TableResource';
import type { PageableResponse, TableHeaderType } from '@/components/Form/TableResource/types';
import PageTitle from '@/components/core/PageTitle';
import { useAuth } from '@/context/auth/useAuth';
import { useAuthorizationLetterDownload } from '@/hooks/useAuthorizationLetterDownload';
import API from '@/services/APIs';
import type { RegionDistrictLov, StaticLov } from '@/services/lov.service';
import type { ScaleAuthCondition, ScalerAuthorizationDetail } from '@/services/scalerAuthorizations.service';
import type { ScalerSummary } from '@/services/scalers.service';
import type { ScalerTombstone } from '@/services/scalersTombstone.types';
import { extractApiError } from '@/utils/extractApiError';

const ScalerAuthorizationViewPage: React.FC = () => {
  const { scalerAuthorizationId } = useParams<{ scalerAuthorizationId: string }>();
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const queryClient = useQueryClient();
  const [record, setRecord] = useState<ScalerAuthorizationDetail | null>(null);
  const [districtLovs, setDistrictLovs] = useState<RegionDistrictLov[]>([]);
  const [jobFunctionLovs, setJobFunctionLovs] = useState<StaticLov[]>([]);
  const [sfpLovs, setSfpLovs] = useState<StaticLov[]>([]);
  const [scalerSummary, setScalerSummary] = useState<ScalerSummary | null>(null);
  const [scalerTombstone, setScalerTombstone] = useState<ScalerTombstone | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const resolvedNumericId = useMemo(() => Number(scalerAuthorizationId ?? 0), [scalerAuthorizationId]);
  // Shared with the Scaler/Scale Site authorization tabs: navigates to the letter page when no
  // letter exists yet, otherwise downloads the stored PDF. It reads blob error bodies correctly,
  // which a hand-rolled copy of this flow on this page previously did not.
  const letter = useAuthorizationLetterDownload({
    fetchLetter: (id, token) => API.scalerAuthorizations.getScalerAuthorizationLetter(id, token),
    letterRoute: (id) => `/scaler-authorizations/${id}/letter`,
    fallbackBaseName: `scaler-authorization-letter-${resolvedNumericId}`,
  });
  const isGeneratingReport = letter.busyId !== null;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      setRecord(null);
      try {
        const token = await userToken();
        if (!Number.isFinite(resolvedNumericId) || resolvedNumericId <= 0) {
          setError('Invalid ID');
          return;
        }

        const [detail, districts, jobFunctions, sfpProducts] = await Promise.all([
          API.scalerAuthorizations.getScalerAuthorization(resolvedNumericId, token),
          API.lov.getRegionDistrictLov(undefined, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_METHOD_TYPE_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_PRODUCT_CODE' }, token),
        ]);

        if (!mounted) {
          return;
        }
        setRecord(detail ?? null);
        setDistrictLovs(districts ?? []);
        setJobFunctionLovs(jobFunctions ?? []);
        setSfpLovs(sfpProducts ?? []);
      } catch (e: unknown) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Could not load record.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => { mounted = false; };
  }, [resolvedNumericId, userToken]);

  useEffect(() => {
    let mounted = true;
    const loadScalerHeader = async () => {
      if (!record?.scalerLicenceNo) {
        setScalerSummary(null);
        setScalerTombstone(null);
        return;
      }

      try {
        const token = await userToken();
        const [summary, tombstone] = await Promise.all([
          API.scalers.getScalerSummary(record.scalerLicenceNo, token),
          API.scalers.getScalerTombstone(record.scalerLicenceNo, token),
        ]);

        if (!mounted) {
          return;
        }
        setScalerSummary(summary ?? null);
        setScalerTombstone(tombstone ?? null);
      } catch {
        if (!mounted) {
          return;
        }
        setScalerSummary(null);
        setScalerTombstone(null);
      }
    };

    loadScalerHeader();
    return () => { mounted = false; };
  }, [record?.scalerLicenceNo, userToken]);

  const districtText = useMemo(() => {
    const code = record?.orgUnitNo ? String(record.orgUnitNo) : '';
    const match = districtLovs.find((lov) => String(lov.code ?? '').trim() === code.trim());
    return match?.description ?? code;
  }, [districtLovs, record?.orgUnitNo]);

  const jobFunctionLabels = useMemo(() => {
    const map = new Map(jobFunctionLovs.map((lov) => [String(lov.code ?? ''), String(lov.description ?? '')]));
    return (record?.jobFunctions ?? [])
      .map((code) => {
        const key = String(code ?? '');
        return map.get(key) || key;
      })
      .filter((value) => value && value.trim().length > 0);
  }, [jobFunctionLovs, record?.jobFunctions]);

  const sfpLabels = useMemo(() => {
    const map = new Map(sfpLovs.map((lov) => [String(lov.code ?? ''), String(lov.description ?? '')]));
    return (record?.authForestProducts ?? [])
      .map((code) => {
        const key = String(code ?? '');
        return map.get(key) || key;
      })
      .filter((value) => value && value.trim().length > 0);
  }, [sfpLovs, record?.authForestProducts]);

  const scalerName = useMemo(() => {
    if (!scalerTombstone) {
      return '';
    }
    return [scalerTombstone.clientName, scalerTombstone.legalFirstName]
      .filter(Boolean)
      .join(', ');
  }, [scalerTombstone]);

  const scalerRegion = useMemo(() => {
    return scalerTombstone?.regionName ?? scalerSummary?.orgUnitName ?? '';
  }, [scalerSummary, scalerTombstone]);

  const scalerDistrict = useMemo(() => {
    return scalerTombstone?.districtName ?? scalerSummary?.orgUnitName ?? '';
  }, [scalerSummary, scalerTombstone]);

  const textValue = useCallback((value?: string | number | null) => {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }, []);

  const jobFunctionRows = useMemo(
    () => jobFunctionLabels.map((label, index) => ({ id: `${label}-${index}`, label })),
    [jobFunctionLabels],
  );

  const sfpRows = useMemo(
    () => sfpLabels.map((label, index) => ({ id: `${label}-${index}`, label })),
    [sfpLabels],
  );

  const isDistrictWide = useMemo(() => {
    return String(record?.districtWideInd ?? '').trim().toUpperCase() === 'Y';
  }, [record?.districtWideInd]);

  const scaleSiteRows = useMemo(() => (
    record?.scaleSites ?? []
  ).map((site, index) => ({
    id: String(site.scaleSiteIdNmbr ?? index),
    scaleSiteIdNmbr: textValue(site.scaleSiteIdNmbr ?? ''),
    siteName: textValue(site.siteName ?? ''),
  })), [record?.scaleSites, textValue]);

  const tableContent = useCallback(<T,>(rows: Array<T & { id: string }>): PageableResponse<T & { id: string }> => ({
    content: rows,
    page: {
      size: Math.max(1, rows.length),
      number: 0,
      totalElements: rows.length,
      totalPages: 1,
    },
  }), []);

  const conditionSetNoop = useCallback<React.Dispatch<React.SetStateAction<ScaleAuthCondition[]>>>(
    () => undefined,
    [],
  );

  /**
   * Where this page came from: the Authorizations tab of the scaler that owns the authorization. Used
   * by both the breadcrumb and the Back button, so they always agree.
   *
   * Falls back to the scaler search when the record has not loaded (or carries no licence number),
   * which is the closest reachable ancestor.
   */
  const scalerPath = useMemo(
    () =>
      record?.scalerLicenceNo
        ? `/scalers/view/${encodeURIComponent(record.scalerLicenceNo)}?tab=authorizations`
        : '/scalers',
    [record?.scalerLicenceNo],
  );

  /**
   * `Scaler / Scaler Authorization`. The previous trail was copied from the create flow
   * ("Create / Scaler Authorizations / Scaler Authorization") and pointed at the create and *edit*
   * routes — so the breadcrumb offered a link into the edit form even to a role with no permission to
   * edit. The parent of an authorization is the scaler it belongs to.
   */
  const breadCrumbs = useMemo(
    () => [{ name: 'Scaler', path: scalerPath }, { name: 'Scaler Authorization' }],
    [scalerPath],
  );

  const handleDelete = useCallback(async () => {
    if (!record?.scalerAuthorizationId) {
      return;
    }
    if (record.letterExists) {
      window.alert(
        'The current record has a Scaler Authorization Designation Letter associated to it and cannot be deleted.\nYou can cancel this Authorization by setting a cancellation date and reason for this Scaler Authorization.',
      );
      return;
    }
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const token = await userToken();
      await API.scalerAuthorizations.deleteScalerAuthorization(record.scalerAuthorizationId, token);
      // The scaler's Authorizations tab is cached under refetchOnMount:false + a 3h staleTime, so
      // without this the deleted row lingers as a phantom entry until a manual refresh. The
      // create/edit forms already drop these keys; the delete path was missed.
      queryClient.removeQueries({ queryKey: ['scaler-authorizations'] });
      queryClient.removeQueries({ queryKey: ['workbench', 'scaler-authorizations'] });
      if (record.scalerLicenceNo) {
        navigate(`/scalers/view/${record.scalerLicenceNo}?tab=authorizations`);
      } else {
        navigate(-1);
      }
    } catch (e) {
      setError(extractApiError(e, 'Could not delete record.'));
    }
  }, [navigate, queryClient, record?.letterExists, record?.scalerAuthorizationId, record?.scalerLicenceNo, userToken]);

  return (
    <Grid className="report-grid scaler-authorization-view">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Scaler Authorization" breadCrumbs={breadCrumbs} />
        {error ? (
          <InlineNotification kind="error" title="Error" subtitle={error} />
        ) : null}
        {letter.error ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Authorization letter unavailable."
            subtitle={letter.error}
            onCloseButtonClick={letter.clearError}
          />
        ) : null}
        {letter.busyId !== null ? (
          <InlineNotification
            kind="info"
            lowContrast
            title="Downloading letter"
            subtitle="Please wait while the letter is downloaded."
            hideCloseButton
          />
        ) : null}
        {loading ? (
          <SkeletonText paragraph lineCount={6} />
        ) : null}
        {record && !loading ? (
          <Form className="scs__form">
            <fieldset className="scaler-authorization-view__fieldset">
              <h4 className="scs__form__section-title">Authorized Scaler</h4>
              <Grid className="scs__form__grid">
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="authorized-scaler-licence"
                    labelText="Authorized Scaler Licence #"
                    value={textValue(record.scalerLicenceNo)}
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="authorized-scaler-name"
                    labelText="Name"
                    value={textValue(scalerName)}
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="authorized-scaler-region"
                    labelText="Region"
                    value={textValue(scalerRegion)}
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="authorized-scaler-district"
                    labelText="District"
                    value={textValue(scalerDistrict)}
                    readOnly
                  />
                </Column>
              </Grid>

              <div className="scs__form__divider" />

              <h4 className="scs__form__section-title">Scaler Authorization</h4>
              <Grid className="scs__form__grid">
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="authorization-number"
                    labelText="Authorization #"
                    value={textValue(record.scalerAuthorizationId)}
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="effective-date"
                    value={textValue(record.authorizationEffectiveDate)}
                    labelText="Effective Date"
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="expiry-date"
                    value={textValue(record.authorizationExpiryDate)}
                    labelText="Expiry Date"
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="cancellation-date"
                    value={textValue(record.cancellationDate)}
                    labelText="Cancellation Date"
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextArea
                    id="cancellation-reason"
                    labelText="Cancellation Reason"
                    value={textValue(record.cancellationReasonTxt)}
                    readOnly
                    rows={3}
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="reg-dist"
                    labelText="Reg / Dist"
                    value={textValue(districtText)}
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="district-wide"
                    labelText="District Wide?"
                    value={isDistrictWide ? 'Yes' : record?.districtWideInd === 'N' ? 'No' : ''}
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="status"
                    labelText="Status"
                    value={textValue(record.status)}
                    readOnly
                  />
                </Column>
              </Grid>

              <div className="scs__form__divider" />

              <h4 className="scs__form__section-title">Job Functions</h4>
              <TableResource
                headers={[
                  { key: 'label', header: 'Job Function', selected: true },
                ] as TableHeaderType<(typeof jobFunctionRows)[number]>[]}
                content={tableContent(jobFunctionRows)}
                loading={false}
                error={false}
                hideHeader
              />

              <div className="scs__form__divider" />

              <h4 className="scs__form__section-title">Special Forest Products</h4>
              {sfpRows.length > 0 && (
                <TableResource
                  headers={[
                    { key: 'label', header: 'Special Forest Product', selected: true },
                  ] as TableHeaderType<(typeof sfpRows)[number]>[]}
                  content={tableContent(sfpRows)}
                  loading={false}
                  error={false}
                  hideHeader
                />
              )}

              {!isDistrictWide ? (
                <>
                  <div className="scs__form__divider" />
                  <h4 className="scs__form__section-title">Scale Sites</h4>
                  <TableResource
                    headers={[
                      {
                        key: 'scaleSiteIdNmbr',
                        header: 'Site #',
                        selected: true,
                        // Legacy parity: viewScalerAuthorization.jsp:156-158 links each site number
                        // to scaleSiteView.do. This is the route by which an Industry Scaler reaches a
                        // site record, so rendering it as text left the destination unreachable.
                        renderAs: (value: unknown) => <ScaleSiteLink scaleSiteIdNmbr={value as string} />,
                      },
                      { key: 'siteName', header: 'Site Name', selected: true },
                    ] as TableHeaderType<(typeof scaleSiteRows)[number]>[]}
                    content={tableContent(scaleSiteRows)}
                    loading={false}
                    error={false}
                  />
                </>
              ) : null}

              <div className="scs__form__divider" />
              <AuthorizationConditionsSection
                conditionClassCode="SCA"
                templateFilterField="SCA"
                conditions={record.conditions ?? []}
                setConditions={conditionSetNoop}
                disabled
                readOnly
                showControls={false}
                loadDefaults={false}
                conditionLinkPath="/maintenance/conditions"
                searchConditions={API.scalerAuthorizations.searchActiveScaleAuthConditions}
                getTemplateConditions={API.scalerAuthorizations.getScaleAuthTemplateConditions}
              />
            </fieldset>
            <div className="scs__form__divider" />

            <div className="form-actions">
              <Button
                kind="secondary"
                onClick={() => navigate(scalerPath)}
                className="action-btn"
                disabled={isGeneratingReport}
              >
                Back
              </Button>
              <PermissionGate permission={PERMISSIONS.SCALER_AUTHORIZATION_UPDATE}>
                <Button
                  kind="primary"
                  onClick={() => navigate(`/scaler-authorizations/edit/${record.scalerAuthorizationId}`)}
                  className="action-btn"
                  disabled={isGeneratingReport}
                >
                  Edit Record
                </Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.SCALER_AUTHORIZATION_DELETE}>
                <Button kind="danger" onClick={handleDelete} className="action-btn" disabled={isGeneratingReport}>
                  Delete
                </Button>
              </PermissionGate>
              {/* One button, two capabilities: it downloads the stored letter when there is one
                  and opens the composer when there is not, so it is gated on whichever verb the
                  click would actually use. The C&E Technician holds only the view half. */}
              <PermissionGate
                permission={
                  record?.letterExists
                    ? PERMISSIONS.SCALER_AUTHORIZATION_LETTER_VIEW
                    : PERMISSIONS.SCALER_AUTHORIZATION_LETTER_CREATE
                }
              >
                <Button
                  kind="secondary"
                  onClick={() => letter.open(record.scalerAuthorizationId, record.letterExists)}
                  className="action-btn"
                  disabled={isGeneratingReport}
                >
                  {record?.letterExists ? 'View Letter' : 'Create Letter'}
                </Button>
              </PermissionGate>
              <WhoDidIt audit={record} />
            </div>
          </Form>
        ) : null}
      </Column>
    </Grid>
  );
};

export default ScalerAuthorizationViewPage;
