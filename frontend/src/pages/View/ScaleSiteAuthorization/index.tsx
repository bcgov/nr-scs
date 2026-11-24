import AuthorizationConditionsSection from '@/components/Form/AuthorizationConditionsSection';
import PageTitle from '@/components/core/PageTitle';
import { useReportDownload } from '@/components/core/ReportPage/useReportDownload';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { ScaleSiteAuthCondition, ScaleSiteAuthorizationDetail } from '@/services/scaleSiteAuthorizations.service';
import type { ScaleSiteSearchResult } from '@/services/scaleSites.service';
import { extractApiError } from '@/utils/extractApiError';
import { Column, Form, Grid, InlineNotification, SkeletonText, TextArea, TextInput } from '@carbon/react';
import Button from '@/components/core/Button';
import WhoDidIt from '@/components/core/WhoDidIt';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ScaleSiteAuthorizationViewPage: React.FC = () => {
  const { scaleSiteAuthorizationId } = useParams<{ scaleSiteAuthorizationId: string }>();
  const { userToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [record, setRecord] = useState<ScaleSiteAuthorizationDetail | null>(null);
  const [scaleSite, setScaleSite] = useState<ScaleSiteSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isGeneratingReport = statusMessage !== null;
  const resolvedNumericId = useMemo(() => Number(scaleSiteAuthorizationId ?? 0), [scaleSiteAuthorizationId]);
  const downloadLetter = useReportDownload('PDF', `scale-site-authorization-letter-${resolvedNumericId}`);

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

        const detail = await API.scaleSiteAuthorizations.getScaleSiteAuthorization(resolvedNumericId, token);
        if (!mounted) {
          return;
        }
        setRecord(detail ?? null);
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
    const loadScaleSite = async () => {
      if (!record?.scaleSiteIdNmbr) {
        setScaleSite(null);
        return;
      }

      try {
        const token = await userToken();
        const matches = await API.scaleSites.searchScaleSites({ scaleSiteIdNmbr: record.scaleSiteIdNmbr }, token);
        if (!mounted) {
          return;
        }
        setScaleSite(matches?.[0] ?? null);
      } catch {
        if (!mounted) {
          return;
        }
        setScaleSite(null);
      }
    };

    loadScaleSite();
    return () => { mounted = false; };
  }, [record?.scaleSiteIdNmbr, userToken]);

  const textValue = useCallback((value?: string | number | null) => {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }, []);

  const expectedVolume = useMemo(() => {
    if (record?.expectedScaleVolume === null || record?.expectedScaleVolume === undefined) {
      return '';
    }
    return String(record.expectedScaleVolume);
  }, [record?.expectedScaleVolume]);

  const conditionSetNoop = useCallback<React.Dispatch<React.SetStateAction<ScaleSiteAuthCondition[]>>>(
    () => undefined,
    [],
  );

  const letterLabel = record?.letterExists ? 'View Letter' : 'Create Letter';

  /**
   * Where leaving this page lands: the owning site's Site Authorizations tab, or the previous history
   * entry when the record carries no site number. Used by both Back and the post-delete redirect, so
   * they cannot disagree.
   */
  const goBack = useCallback(() => {
    if (record?.scaleSiteIdNmbr) {
      navigate(`/scale-sites/view/${record.scaleSiteIdNmbr}?tab=authorizations`);
    } else {
      navigate(-1);
    }
  }, [navigate, record?.scaleSiteIdNmbr]);

  const handleDelete = useCallback(async () => {
    if (!record?.scaleSiteAuthorizationId) {
      return;
    }
    if (record.letterExists) {
      window.alert(
        'The current record has a Scale Site Authorization Designation Letter associated to it and cannot be deleted.\nYou can cancel this Authorization by setting a cancellation date and reason for this Scale Site Authorization.',
      );
      return;
    }
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const token = await userToken();
      await API.scaleSiteAuthorizations.deleteScaleSiteAuthorization(record.scaleSiteAuthorizationId, token);
      // `goBack()` lands on the site's Authorizations tab, whose list is cached under
      // refetchOnMount:false + a 3h staleTime — without this the deleted row lingers as a phantom
      // entry until a manual refresh. Same reasoning as the create/edit forms.
      queryClient.removeQueries({ queryKey: ['scale-site-authorizations'] });
      queryClient.removeQueries({ queryKey: ['workbench', 'scale-site-authorizations'] });
      goBack();
    } catch (e) {
      setError(extractApiError(e, 'Could not delete record.'));
    }
  }, [goBack, queryClient, record?.letterExists, record?.scaleSiteAuthorizationId, userToken]);

  const handleLetterClick = useCallback(async () => {
    if (!record?.scaleSiteAuthorizationId) {
      return;
    }
    if (!record.letterExists) {
      if (record.status === 'Cancelled') {
        window.alert('This authorization is cancelled and cannot have a letter created.');
        return;
      }
      navigate(`/scale-site-authorizations/${record.scaleSiteAuthorizationId}/letter`);
      return;
    }

    setError(null);
    setStatusMessage('Please wait while the letter is downloaded.');

    try {
      const token = await userToken();
      const { blob, filename } = await API.scaleSiteAuthorizations.getScaleSiteAuthorizationLetter(
        record.scaleSiteAuthorizationId,
        token,
      );
      downloadLetter(blob, filename);
    } catch (e) {
      setError(extractApiError(e, 'Could not download letter.'));
    } finally {
      setStatusMessage(null);
    }
  }, [downloadLetter, navigate, record?.letterExists, record?.scaleSiteAuthorizationId, record?.status, userToken]);

  return (
    <Grid className="report-grid scale-site-authorization-view">
      <Column lg={16} md={8} sm={4}>
        <PageTitle
          title="Scale Site Authorization"
          breadCrumbs={[
            { name: 'Scale Sites', path: '/scale-sites' },
            { name: scaleSiteAuthorizationId ? `Authorization ${scaleSiteAuthorizationId}` : 'Authorization' },
          ]}
        />
        {error ? (
          <InlineNotification kind="error" title="Error" subtitle={error} />
        ) : null}
        {statusMessage ? (
          <InlineNotification kind="info" title="Downloading letter" subtitle={statusMessage} />
        ) : null}
        {loading ? (
          <SkeletonText paragraph lineCount={6} />
        ) : null}
        {record && !loading ? (
          <Form className="scs__form">
            <fieldset className="scale-site-authorization-view__fieldset">
              <h4 className="scs__form__section-title">Scale Site</h4>
              <Grid className="scs__form__grid">
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="scale-site-number"
                    labelText="Scale Site #"
                    value={textValue(record.scaleSiteIdNmbr)}
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="scale-site-name"
                    labelText="Scale Site Name"
                    value={textValue(scaleSite?.siteName)}
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="scale-site-region"
                    labelText="Region"
                    value={textValue(scaleSite?.region)}
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="scale-site-district"
                    labelText="District"
                    value={textValue(scaleSite?.district)}
                    readOnly
                  />
                </Column>
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="scale-site-type"
                    labelText="Site Type"
                    value={textValue(scaleSite?.methodTypeCodeName)}
                    readOnly
                  />
                </Column>
              </Grid>

              <div className="scs__form__divider" />

              <h4 className="scs__form__section-title">Scale Site Authorization</h4>
              <Grid className="scs__form__grid">
                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="authorization-number"
                    labelText="Authorization #"
                    value={textValue(record.scaleSiteAuthorizationId)}
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
                    id="expected-volume"
                    value={expectedVolume}
                    labelText="Expected Annual Scale Volume"
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

                <Column lg={16} md={8} sm={4}>
                  <TextArea
                    id="cancellation-reason"
                    labelText="Cancellation Reason"
                    value={textValue(record.cancellationReasonTxt)}
                    readOnly
                    rows={3}
                  />
                </Column>
              </Grid>

              <div className="scs__form__divider" />

              <AuthorizationConditionsSection
                conditionClassCode="SIA"
                templateFilterField="SIA"
                conditions={record.conditions ?? []}
                setConditions={conditionSetNoop}
                disabled
                readOnly
                showControls={false}
                loadDefaults={false}
                conditionLinkPath="/maintenance/conditions"
                searchConditions={API.scaleSiteAuthorizations.searchActiveScaleSiteAuthConditions}
                getTemplateConditions={API.scaleSiteAuthorizations.getScaleSiteAuthTemplateConditions}
              />
            </fieldset>

            <div className="form-actions">
              <Button
                kind="secondary"
                className="action-btn"
                onClick={goBack}
                disabled={isGeneratingReport}
              >
                Back
              </Button>
              <PermissionGate permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_UPDATE}>
                <Button
                  kind="primary"
                  onClick={() => navigate(`/scale-site-authorizations/edit/${record.scaleSiteAuthorizationId}`)}
                  className="action-btn"
                  disabled={isGeneratingReport}
                >
                  Edit Record
                </Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_DELETE}>
                <Button
                  kind="danger"
                  className="action-btn"
                  onClick={handleDelete}
                  disabled={isGeneratingReport}
                >
                  Delete
                </Button>
              </PermissionGate>
              {/* Gated on whichever verb the click would use — see View/ScalerAuthorization. */}
              <PermissionGate
                permission={
                  record?.letterExists
                    ? PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_VIEW
                    : PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_CREATE
                }
              >
                <Button kind="secondary" className="action-btn" onClick={handleLetterClick} disabled={isGeneratingReport}>
                  {letterLabel}
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

export default ScaleSiteAuthorizationViewPage;
