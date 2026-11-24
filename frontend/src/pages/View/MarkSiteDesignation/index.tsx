import {
  Column,
  Form,
  Grid,
  InlineNotification,
  SkeletonText,
  TextArea,
  TextInput,
} from '@carbon/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import TableResource from '@/components/Form/TableResource';
import type { PageableResponse, TableHeaderType } from '@/components/Form/TableResource/types';
import Button from '@/components/core/Button';
import ScaleSiteLink from '@/components/core/ScaleSiteLink';
import PageTitle from '@/components/core/PageTitle';
import WhoDidIt from '@/components/core/WhoDidIt';
import { useReportDownload } from '@/components/core/ReportPage/useReportDownload';
import { useSortableTable } from '@/hooks/useSortableTable';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type {
  MarkSiteDesignationCondition,
  MarkSiteDesignationDetail,
  MarkSiteDesignationScaleSite,
  MarkSiteDesignationSpeciesContent,
} from '@/services/markSiteDesignation.service';
import type { StaticLov } from '@/services/lov.service';
import { extractApiError } from '@/utils/extractApiError';

type ScaleSiteRow = MarkSiteDesignationScaleSite & { id: string };
type SpeciesContentRow = MarkSiteDesignationSpeciesContent & { id: string };
type ConditionRow = MarkSiteDesignationCondition & { id: string };
type ExceptionRow = { id: string; code: string };

const tableContent = <T,>(rows: Array<T & { id: string }>): PageableResponse<T & { id: string }> => ({
  content: rows,
  page: {
    size: Math.max(1, rows.length),
    number: 0,
    totalElements: rows.length,
    totalPages: 1,
  },
});

const scaleSiteHeaders: TableHeaderType<ScaleSiteRow>[] = [
  {
    key: 'scaleSiteIdNmbr',
    header: 'Site #',
    selected: true,
    // Legacy parity: viewMarkSite.jsp links each site number to scaleSiteView.do.
    renderAs: (value) => <ScaleSiteLink scaleSiteIdNmbr={value as string} />,
  },
  { key: 'siteName', header: 'Site Name', selected: true },
];

const conditionHeaders: TableHeaderType<ConditionRow>[] = [
  { key: 'scaleAuthConditionId', header: 'Condition #', selected: true, sortable: true },
  { key: 'scaleAuthConditionTitle', header: 'Title', selected: true, sortable: true },
  {
    key: 'ministryStandardInd',
    header: 'Mandatory?',
    selected: true,
    sortable: true,
    renderAs: (value) => {
      const normalized = String(value ?? '').trim().toUpperCase();
      if (normalized === 'Y') {
        return 'Yes';
      }
      if (normalized === 'N') {
        return 'No';
      }
      return '';
    },
  },
  { key: 'scaleAuthConditionDesc', header: 'Description', selected: true, sortable: true },
];

const exceptionHeaders = (exemptionLabelByCode: Map<string, string>): TableHeaderType<ExceptionRow>[] => [
  {
    key: 'code',
    header: 'Exemption',
    selected: true,
    renderAs: (value: unknown) => {
      const code = value == null ? '' : String(value);
      return exemptionLabelByCode.get(code) ?? code;
    },
  },
];

const speciesContentHeaders = (speciesLabelByCode: Map<string, string>): TableHeaderType<SpeciesContentRow>[] => [
  {
    key: 'scaleSpeciesCode',
    header: 'Species',
    selected: true,
    renderAs: (value: unknown) => {
      const code = value == null ? '' : String(value);
      return speciesLabelByCode.get(code) ?? code;
    },
  },
  {
    key: 'contentPercent',
    header: 'Content',
    selected: true,
    renderAs: (value) => {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      return `${value}%`;
    },
  },
];

const MarkSiteDesignationViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const [searchParams] = useSearchParams();
  const haulingMarkAuthorizationId = searchParams.get('haulingMarkAuthorizationId') ?? '';
  const resolvedAuthorizationId = Number(haulingMarkAuthorizationId);

  const [record, setRecord] = useState<MarkSiteDesignationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const isGeneratingReport = statusMessage !== null;
  const downloadLetter = useReportDownload('PDF', `mark-site-designation-letter-${resolvedAuthorizationId}`);
  const [speciesOptions, setSpeciesOptions] = useState<StaticLov[]>([]);
  const [exemptionOptions, setExemptionOptions] = useState<StaticLov[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      setRecord(null);

      try {
        if (!Number.isFinite(resolvedAuthorizationId) || resolvedAuthorizationId <= 0) {
          setError('A valid mark site designation id was not provided.');
          return;
        }

        const token = await userToken();
        const [detail, speciesLov, exemptionsLov] = await Promise.all([
          API.markSiteDesignation.getMarkSiteDesignation(resolvedAuthorizationId, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_SPECIES_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'EXEMPT_MARK_METHOD_CODE' }, token),
        ]);
        if (!mounted) {
          return;
        }
        setRecord(detail ?? null);
        setSpeciesOptions(speciesLov ?? []);
        setExemptionOptions(exemptionsLov ?? []);
      } catch (e) {
        if (!mounted) {
          return;
        }
        setError(extractApiError(e, 'Could not load mark site designation.'));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [resolvedAuthorizationId, userToken]);

  const scaleSiteRows = useMemo<ScaleSiteRow[]>(
    () => (record?.scaleSites ?? []).map((site, index) => ({
      ...site,
      id: `${site.scaleSiteIdNmbr ?? 'site'}-${index}`,
    })),
    [record?.scaleSites],
  );

  const conditionRows = useMemo<ConditionRow[]>(
    () => (record?.conditions ?? []).map((condition, index) => ({
      ...condition,
      id: `${condition.scaleAuthConditionId ?? 'condition'}-${index}`,
    })),
    [record?.conditions],
  );

  // Client-side, tri-state column sort for the read-only Conditions table (no default sort).
  const {
    sortedRows: sortedConditionRows,
    sortKey: conditionSortKey,
    sortDirection: conditionSortDirection,
    onSortChange: onConditionSortChange,
  } = useSortableTable(conditionRows);

  const speciesContentRows = useMemo<SpeciesContentRow[]>(
    () => (record?.speciesContent ?? []).map((species, index) => ({
      ...species,
      id: `${species.scaleSpeciesCode ?? 'species'}-${index}`,
    })),
    [record?.speciesContent],
  );

  const speciesLabelByCode = useMemo(
    () => new Map(speciesOptions.map((o) => [String(o.code ?? ''), String(o.description ?? o.code ?? '')])),
    [speciesOptions],
  );

  const exceptionRows = useMemo<ExceptionRow[]>(
    () => (record?.exceptions ?? []).map((code, index) => ({
      id: `${code ?? 'exception'}-${index}`,
      code: String(code ?? ''),
    })),
    [record?.exceptions],
  );

  const exemptionLabelByCode = useMemo(
    () => new Map(exemptionOptions.map((o) => [String(o.code ?? ''), String(o.description ?? o.code ?? '')])),
    [exemptionOptions],
  );

  const markHolderClientLoc = useMemo(() => {
    const client = String(record?.markHolderClient ?? '').trim();
    const loc = String(record?.markHolderLoc ?? '').trim();
    if (!client && !loc) {
      return '';
    }
    return `${client}/${loc}`;
  }, [record?.markHolderClient, record?.markHolderLoc]);

  const textValue = (value?: string | number | null) => {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  };

  const handleDelete = async () => {
    if (!record?.haulingMarkAuthorizationId || isDeleting) {
      return;
    }

    if (!globalThis.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      setIsDeleting(true);
      const token = await userToken();
      await API.markSiteDesignation.removeMarkSiteDesignationFromWorkbench(record.haulingMarkAuthorizationId, token);
      navigate('/welcome');
    } catch (deleteError) {
      setError(extractApiError(deleteError, 'Could not delete mark site designation.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLetterClick = useCallback(async () => {
    if (!record?.haulingMarkAuthorizationId) {
      return;
    }
    if (!record.letterExists) {
      navigate(`/mark-site-designations/${record.haulingMarkAuthorizationId}/letter`);
      return;
    }

    setError(null);
    setStatusMessage('Please wait while the letter is downloaded.');

    try {
      const token = await userToken();
      const { blob, filename } = await API.markSiteDesignation.getMarkSiteDesignationLetter(record.haulingMarkAuthorizationId, token);
      downloadLetter(blob, filename);
    } catch (e) {
      setError(extractApiError(e, 'Could not download letter.'));
    } finally {
      setStatusMessage(null);
    }
  }, [downloadLetter, navigate, record?.letterExists, record?.haulingMarkAuthorizationId, userToken]);

  return (
    <Grid className="view-mark-site-designation">
      <Column lg={16} md={8} sm={4}>
        <PageTitle
          title="Mark Site Designation"
          breadCrumbs={[
            { name: 'Queries' },
            { name: 'Mark Site Designations', path: '/mark-site-designations' },
            {
              name: 'Mark Site Designation',
              path: haulingMarkAuthorizationId
                ? `/mark-site-designations/view?haulingMarkAuthorizationId=${encodeURIComponent(haulingMarkAuthorizationId)}`
                : '/mark-site-designations/view',
            },
          ]}
        />
      </Column>

      <Column lg={16} md={8} sm={4}>
        {error ? (
          <InlineNotification kind="error" title="Error" subtitle={error} />
        ) : null}

        {statusMessage ? (
          <InlineNotification kind="info" title="Downloading letter" subtitle={statusMessage} />
        ) : null}

        {loading ? (
          <SkeletonText paragraph lineCount={10} />
        ) : null}

        {record && !loading ? (
          <Form className="scs__form">
            <h4 className="scs__form__section-title">MSD Authorization</h4>
            <Grid className="scs__form__grid">
              <Column lg={8} md={8} sm={4}>
                <TextInput id="msd-number" labelText="MSD #" value={textValue(record.haulingMarkAuthorizationId)} readOnly />
              </Column>
              <Column lg={8} md={8} sm={4}>
                <TextInput id="timber-mark" labelText="Timber Mark" value={textValue(record.timberMark)} readOnly />
              </Column>
              <Column lg={8} md={8} sm={4}>
                <TextInput id="mark-holder-client-loc" labelText="Mark Holder (Client / Loc)" value={markHolderClientLoc} readOnly />
              </Column>
              <Column lg={8} md={8} sm={4}>
                <TextInput id="mark-holder-name" labelText="Mark Holder Name" value={textValue(record.markHolderName)} readOnly />
              </Column>
              <Column lg={8} md={8} sm={4}>
                <TextInput id="mark-status" labelText="Mark Status" value={textValue(record.markStatus)} readOnly />
              </Column>
              <Column lg={8} md={8} sm={4}>
                <TextInput id="population" labelText="Population" value={textValue(record.population)} readOnly />
              </Column>
              <Column lg={8} md={8} sm={4}>
                <TextInput id="effective-date" labelText="Effective Date" value={textValue(record.effectiveDate)} readOnly />
              </Column>
              <Column lg={8} md={8} sm={4}>
                <TextInput id="expiry-date" labelText="Expiry Date" value={textValue(record.expiryDate)} readOnly />
              </Column>
              <Column lg={8} md={8} sm={4}>
                <TextInput id="estimated-volume" labelText="Est. Volume" value={textValue(record.estimatedVolume)} readOnly />
              </Column>
              <Column lg={8} md={8} sm={4}>
                <TextInput id="estimated-truck-loads" labelText="Est. Truck Loads" value={textValue(record.estimatedTruckLoads)} readOnly />
              </Column>
              <Column lg={16} md={8} sm={4}>
                <TextArea id="geographic-location" labelText="Geographic Location" value={textValue(record.geographicLocation)} readOnly rows={2} />
              </Column>
              <Column lg={16} md={8} sm={4}>
                <TextArea id="timber-description" labelText="Timber Description" value={textValue(record.timberDescription)} readOnly rows={2} />
              </Column>
              <Column lg={16} md={8} sm={4}>
                <TextArea id="transportation-date-desc" labelText="Transportation Date Desc" value={textValue(record.transportationDateDesc)} readOnly rows={2} />
              </Column>
              <Column lg={16} md={8} sm={4}>
                <TextArea id="other-requirements" labelText="Other Requirements" value={textValue(record.otherRequirements)} readOnly rows={2} />
              </Column>
            </Grid>

            <div className="scs__form__divider" />

            <h4 className="scs__form__section-title">Scale Sites</h4>
            <TableResource
              headers={scaleSiteHeaders}
              content={tableContent(scaleSiteRows)}
              loading={false}
              error={false}
              showEmptyTableWhenNoResults
            />

            <div className="scs__form__divider" />

            <h4 className="scs__form__section-title">Species Content</h4>
            <TableResource
              headers={speciesContentHeaders(speciesLabelByCode)}
              content={tableContent(speciesContentRows)}
              loading={false}
              error={false}
              showEmptyTableWhenNoResults
            />

            <div className="scs__form__divider" />

            <h4 className="scs__form__section-title">Exemptions</h4>
            <TableResource
              headers={exceptionHeaders(exemptionLabelByCode)}
              content={tableContent(exceptionRows)}
              loading={false}
              error={false}
              showEmptyTableWhenNoResults
            />

            <div className="scs__form__divider" />

            <h4 className="scs__form__section-title">Conditions</h4>
            <TableResource
              headers={conditionHeaders}
              content={tableContent(sortedConditionRows)}
              loading={false}
              error={false}
              showEmptyTableWhenNoResults
              sortKey={conditionSortKey}
              sortDirection={conditionSortDirection}
              onSortChange={onConditionSortChange}
            />

            <div className="form-actions">
              <PermissionGate permission={PERMISSIONS.MSD_UPDATE}>
                <Button
                  kind="secondary"
                  type="button"
                  onClick={() => navigate(`/mark-site-designations/edit/${encodeURIComponent(String(record.haulingMarkAuthorizationId))}`)}
                >
                  Edit Record
                </Button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.WORKBENCH_UPDATE}>
                <Button kind="danger" type="button" disabled={isDeleting || isGeneratingReport} onClick={handleDelete}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </PermissionGate>
              {/* Gated on whichever verb the click would use — see View/ScalerAuthorization. */}
              <PermissionGate
                permission={
                  record?.letterExists ? PERMISSIONS.MSD_LETTER_VIEW : PERMISSIONS.MSD_LETTER_CREATE
                }
              >
                <Button kind="secondary" type="button" onClick={handleLetterClick} disabled={isGeneratingReport}>
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

export default MarkSiteDesignationViewPage;
