import {
  Column,
  TextInput
} from '@carbon/react';

import PermissionLink from '@/components/core/PermissionLink';
import { PERMISSIONS } from '@/context/auth/permissions';
import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import type { PageableResponse, TableHeaderType } from '@/components/Form/TableResource/types';
import ClientLocSearch from '@/components/core/ClientLocSearch';
import DistrictSelect from '@/components/core/DistrictSelect';

import { useMutation } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import usePersistentState from '@/hooks/usePersistentState';
import API from '@/services/APIs';
import type { ScaleMethodTypeLov, StaticLov } from '@/services/lov.service';
import type {
  ScaleSiteRiskAssessmentSearchParams,
  ScaleSiteRiskAssessmentSearchResult,
} from '@/services/scaleSiteRiskAssessments.service';

import { extractApiError } from '@/utils/extractApiError';
import { getRiskLevelPillClass, mapStaticLovOptions, trimToUndefined } from '@/utils/queryUtils';

import './index.scss';

import { toPagedResponse } from '@/utils/toPagedResponse';
import { formatRatio } from '@/utils/formatRatio';
import RiskAssessmentSearchLayout from '../riskAssessments/RiskAssessmentSearchLayout';
type ScaleSiteRiskSearchForm = {
  riskQuestionnaireId: string;
  riskTypeCode: string;
  completeInd: string;
  scaleSiteIdNmbr: string;
  orgUnitNo: string;
  methodTypes: MethodTypeOption[];
  siteName: string;
  ownerClientNumber: string;
  ownerClientLocnCode: string;
  primarySort: number;
  secondarySort: number;
};

type MethodTypeOption = { code: string; description: string };

type ScaleSiteRiskRow = ScaleSiteRiskAssessmentSearchResult & {
  id: string;
  ratingMaxRating: string;
  responsesQuestions: string;
  level: string;
  range: string;
  version: string;
  ownerClientDisplay: string;
};

const DEFAULT_FORM: ScaleSiteRiskSearchForm = {
  riskQuestionnaireId: '',
  riskTypeCode: '',
  completeInd: '',
  scaleSiteIdNmbr: '',
  orgUnitNo: '',
  methodTypes: [],
  siteName: '',
  ownerClientNumber: '',
  ownerClientLocnCode: '',
  primarySort: 1,
  secondarySort: 0,
};

const SORT_OPTIONS = [
  { label: 'Assessment ID', value: '1' },
  { label: 'Level', value: '8' },
  { label: 'Ver.', value: '4' },
  { label: 'Scale Site #', value: '3' },
  { label: 'Site Name', value: '21' },
  { label: 'Reg / Dist', value: '22' },
  { label: 'Site Owner(Client/Loc)', value: '19' },
];

const TABLE_HEADERS: TableHeaderType<ScaleSiteRiskRow>[] = [
  {
    key: 'riskQuestionnaireId',
    header: 'Assessment ID',
    selected: true,
    renderAs: (_value, row) => {
      const id = row?.riskQuestionnaireId;
      return id != null ? (
        <PermissionLink permission={PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ} to={`/scale-site-risk-assessments/view/${id}`}>{id}</PermissionLink>
      ) : '';
    },
  },
  { key: 'ratingMaxRating', header: 'Rating / Max Rating', selected: true },
  { key: 'responsesQuestions', header: 'Responses / Questions', selected: true },
  {
    key: 'level',
    header: 'Level',
    selected: true,
    renderAs: (value, row) => {
      const pillClass = getRiskLevelPillClass(row?.riskTypeCode);
      return pillClass ? <span className={pillClass}>{value}</span> : <>{value}</>;
    },
  },
  { key: 'range', header: 'Range', selected: true },
  { key: 'version', header: 'Ver.', selected: true },
  {
    key: 'scaleSiteIdNmbr',
    header: 'Scale Site #',
    selected: true,
    renderAs: (value) => {
      const display = value ? String(value) : '';
      return display ? (
        <PermissionLink permission={PERMISSIONS.SCALE_SITE_READ} to={`/scale-sites/view/${encodeURIComponent(display)}`} title="Scale Site Record">
          {display}
        </PermissionLink>
      ) : '';
    },
  },
  { key: 'siteName', header: 'Scale Site Name', selected: true },
  { key: 'district', header: 'Reg / Dist', selected: true },
  { key: 'methodTypeCodeName', header: 'Site Type', selected: true },
  { key: 'ownerClientDisplay', header: 'Site Owner (Client / Loc)', selected: true },
];

const EMPTY_RESPONSE: PageableResponse<ScaleSiteRiskRow> = {
  content: [],
  page: { size: 10, number: 0, totalElements: 0, totalPages: 1 },
};

const toOwnerClientDisplay = (ownerClientNumber?: string | null, ownerClientLocnCode?: string | null): string => {
  if (!ownerClientNumber && !ownerClientLocnCode) {
    return '';
  }
  return `${ownerClientNumber ?? ''} / ${ownerClientLocnCode ?? ''}`;
};

const ScaleSiteRiskAssessmentsPage: React.FC = () => {
  const { userToken } = useAuth();

  // Persisted across navigation so filters, sorting, and paging remain in place when the user
  // opens an assessment and returns. Result rows are NOT persisted: we cache the submitted search
  // params and re-fetch on return so edits/deletes made elsewhere are reflected, not a stale list.
  const [formData, setFormData] = usePersistentState<ScaleSiteRiskSearchForm>(
    'scaleSiteRiskQuery.formData',
    DEFAULT_FORM,
  );
  const [hasSearched, setHasSearched] = usePersistentState('scaleSiteRiskQuery.hasSearched', false);
  const [lastSearchParams, setLastSearchParams] = usePersistentState<ScaleSiteRiskAssessmentSearchParams | undefined>(
    'scaleSiteRiskQuery.lastSearchParams',
    undefined,
  );
  // Result rows are ephemeral: re-fetched on mount from the cached params, never persisted.
  const [lastData, setLastData] = useState<ScaleSiteRiskAssessmentSearchResult[] | undefined>(undefined);
  const [page, setPage] = usePersistentState('scaleSiteRiskQuery.page', 0);
  const [pageSize, setPageSize] = usePersistentState('scaleSiteRiskQuery.pageSize', 10);
  // Filter-section open/closed. Intentionally NOT persisted: it is a transient view preference,
  // and defaulting to open on every mount matches the other query pages (Scalers, Scale Sites).
  const [filtersOpen, setFiltersOpen] = useState(true);

  const searchMutation = useMutation({
    mutationFn: async (params: ScaleSiteRiskAssessmentSearchParams) => {
      const token = await userToken();
      return API.scaleSiteRiskAssessments.searchScaleSiteRiskAssessments(params, token);
    },
    onSuccess: (data) => setLastData(data),
  });

  // On return to the page (remount), re-run the last search so the list reflects any changes
  // made elsewhere. Mount-only: a fresh page with no prior search leaves this inert.
  useEffect(() => {
    if (hasSearched && lastSearchParams) {
      searchMutation.mutate(lastSearchParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRiskLevelLov = useCallback(async () => {
    const token = await userToken();
    return API.lov.getStaticLov({ tableKey: 'RISK_TYPE_CODE' }, token);
  }, [userToken]);

  const loadMethodTypes = useCallback(async () => {
    const token = await userToken();
    return API.lov.getScaleMethodTypeLov(undefined, token);
  }, [userToken]);

  const {
    data: riskLevelLov,
    isLoading: isLoadingRiskLevelLov,
    error: riskLevelLovError,
  } = useLovOptions<StaticLov>(loadRiskLevelLov, {
    errorMessage: 'Could not load risk level options.',
    cacheKey: 'risk-type-code-lov',
  });

  const {
    data: scaleMethodTypes,
    isLoading: isLoadingScaleMethodTypes,
    error: scaleMethodTypesError,
  } = useLovOptions<ScaleMethodTypeLov>(loadMethodTypes, {
    errorMessage: 'Could not load site type options.',
    cacheKey: 'scale-method-type-lov',
  });

  const riskLevelOptions = useMemo(() => mapStaticLovOptions(riskLevelLov ?? []), [riskLevelLov]);

  const methodTypeOptions = useMemo(() => {
    return (scaleMethodTypes ?? [])
      .filter((m): m is Required<Pick<ScaleMethodTypeLov, 'code' | 'description'>> => Boolean(m.code && m.description))
      .map((m) => ({ code: String(m.code).trim(), description: String(m.description).trim() }));
  }, [scaleMethodTypes]);

  const isLovLoading = isLoadingRiskLevelLov || isLoadingScaleMethodTypes;
  const lovError = riskLevelLovError || scaleMethodTypesError;

  const results: PageableResponse<ScaleSiteRiskRow> = useMemo(() => {
    const data = lastData;
    if (!data) {
      return hasSearched ? EMPTY_RESPONSE : ({} as PageableResponse<ScaleSiteRiskRow>);
    }
    if (!Array.isArray(data)) {
      return EMPTY_RESPONSE;
    }

    const mapped: ScaleSiteRiskRow[] = data.map((row, idx) => ({
      ...row,
      id: String(row.riskQuestionnaireId ?? `scale-site-risk-${idx}`),
      ratingMaxRating: formatRatio(row.riskRating, row.maxRiskRating),
      responsesQuestions: formatRatio(row.numResp, row.questCount),
      level: row.codeDescription ?? row.riskTypeCode ?? '',
      range:
        row.rangeLowValue != null && row.rangeHighValue != null
          ? `${row.rangeLowValue}-${row.rangeHighValue}`
          : '',
      version: row.versionNo != null ? String(row.versionNo) : '',
      ownerClientDisplay: toOwnerClientDisplay(row.ownerClientNumber, row.ownerClientLocnCode),
    }));

    return toPagedResponse(mapped, page, pageSize);
  }, [hasSearched, lastData, page, pageSize]);

  const serverError = useMemo(() => {
    if (!searchMutation.isError) {
      return null;
    }

    return extractApiError(searchMutation.error, 'An error occurred while searching. Please try again.');
  }, [riskLevelLovError, scaleMethodTypesError, searchMutation.error, searchMutation.isError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const doSearch = () => {
    setHasSearched(true);
    setPage(0);

    const params: ScaleSiteRiskAssessmentSearchParams = {
      riskQuestionnaireId: trimToUndefined(formData.riskQuestionnaireId),
      riskTypeCode: trimToUndefined(formData.riskTypeCode),
      completeInd: trimToUndefined(formData.completeInd) as 'Y' | 'N' | undefined,
      scaleSiteIdNmbr: trimToUndefined(formData.scaleSiteIdNmbr),
      orgUnitNo: trimToUndefined(formData.orgUnitNo) ? Number(formData.orgUnitNo) : undefined,
      methodTypes: formData.methodTypes.map((option) => option.code),
      siteName: trimToUndefined(formData.siteName),
      ownerClientNumber: trimToUndefined(formData.ownerClientNumber),
      ownerClientLocnCode: trimToUndefined(formData.ownerClientLocnCode),
      primarySort: formData.primarySort,
      secondarySort: formData.secondarySort,
    };

    setLastSearchParams(params);
    searchMutation.mutate(params);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    doSearch();
  };

  const handleReset = () => {
    setFormData(DEFAULT_FORM);
    setHasSearched(false);
    setLastSearchParams(undefined);
    setLastData(undefined);
    setPage(0);
    setPageSize(10);
    setFiltersOpen(true);
    searchMutation.reset();
  };

  return (
    <RiskAssessmentSearchLayout
      pageClassName="scale-site-risk-assessment-page"
      formClassName="scale-site-risk-assessment-form"
      notificationClassName="scale-site-risk-assessment-notification"
      resultsClassName="scale-site-risk-assessment-results"
      title="Queries - Scale Site Risk Assessment"
      subtitle="Search scale site risk assessments by parameters."
      breadCrumbs={[{ name: 'Scale Site Risk Assessment' }]}
      lovError={lovError}
      serverError={serverError}
      onDismissServerError={() => searchMutation.reset()}
      filtersOpen={filtersOpen}
      onToggleFilters={() => setFiltersOpen((prev) => !prev)}
      disabled={isLovLoading || searchMutation.isPending}
      riskQuestionnaireId={formData.riskQuestionnaireId}
      riskTypeCode={formData.riskTypeCode}
      completeInd={formData.completeInd}
      riskLevelOptions={riskLevelOptions}
      onInputChange={handleInputChange}
      sortOptions={SORT_OPTIONS}
      primarySort={String(formData.primarySort)}
      onPrimarySortChange={(value) =>
        setFormData((prev) => ({ ...prev, primarySort: Number(value) || 1 }))
      }
      secondarySort={String(formData.secondarySort === 0 ? '' : formData.secondarySort)}
      onSecondarySortChange={(value) =>
        setFormData((prev) => ({
          ...prev,
          secondarySort: Number(trimToUndefined(value) ?? '0') || 0,
        }))
      }
      onSubmit={handleSubmit}
      onReset={handleReset}
      tableHeaders={TABLE_HEADERS}
      content={results}
      tableLoading={searchMutation.isPending || (hasSearched && !lastData && !searchMutation.isError)}
      tableError={searchMutation.isError}
      onPageChange={({ page: nextPage, pageSize: nextPageSize }) => {
        setPage(nextPage - 1);
        setPageSize(nextPageSize);
      }}
    >

              <Column lg={8} md={8} sm={4}>
                <TextInput
                  id="scaleSiteIdNmbr"
                  name="scaleSiteIdNmbr"
                  labelText="Scale Site #"
                  value={formData.scaleSiteIdNmbr}
                  onChange={handleInputChange}
                  maxLength={8}
                  disabled={isLovLoading || searchMutation.isPending}
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <DistrictSelect
                  id="orgUnitNo"
                  value={formData.orgUnitNo}
                  onChange={(value) => setFormData((prev) => ({ ...prev, orgUnitNo: value }))}
                  hideLabel={false}
                  labelText="Reg / Dist"
                  disabled={isLovLoading || searchMutation.isPending}
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <ActiveMultiSelect<MethodTypeOption>
                  id="method-types"
                  items={methodTypeOptions}
                  itemToString={(item) => (item?.description ? String(item.description) : '')}
                  titleText="Site Type"
                  selectedItems={formData.methodTypes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, methodTypes: event.selectedItems ?? [] }))}
                  disabled={isLovLoading || searchMutation.isPending}
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <TextInput
                  id="siteName"
                  name="siteName"
                  labelText="Scale Site Name"
                  value={formData.siteName}
                  onChange={handleInputChange}
                  disabled={isLovLoading || searchMutation.isPending}
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <ClientLocSearch
                  labelText="Site Owner (Client / Loc)"
                  client={formData.ownerClientNumber}
                  loc={formData.ownerClientLocnCode}
                  onClientChange={(value) => setFormData((prev) => ({ ...prev, ownerClientNumber: value }))}
                  onLocChange={(value) => setFormData((prev) => ({ ...prev, ownerClientLocnCode: value }))}
                  showSearchButton
                  clientId="ownerClientNumber"
                  locId="ownerClientLocnCode"
                />
              </Column>
    </RiskAssessmentSearchLayout>
  );
};

export default ScaleSiteRiskAssessmentsPage;
