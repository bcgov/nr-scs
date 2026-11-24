import {
  Column,
  Select,
  SelectItem,
  TextInput,
} from '@carbon/react';
import { useMutation } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import PermissionLink from '@/components/core/PermissionLink';
import { PERMISSIONS } from '@/context/auth/permissions';
import type { PageableResponse, TableHeaderType } from '@/components/Form/TableResource/types';
import ClientLocSearch from '@/components/core/ClientLocSearch';
import DistrictSelect from '@/components/core/DistrictSelect';
import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import usePersistentState from '@/hooks/usePersistentState';
import API from '@/services/APIs';
import type { StaticLov } from '@/services/lov.service';
import type {
  ScalerRiskAssessmentSearchParams,
  ScalerRiskAssessmentSearchResult,
} from '@/services/scalerRiskAssessments.service';
import { extractApiError } from '@/utils/extractApiError';
import { getRiskLevelPillClass, mapStaticLovOptions, trimToUndefined } from '@/utils/queryUtils';

import './index.scss';

import { toPagedResponse } from '@/utils/toPagedResponse';
import { formatRatio } from '@/utils/formatRatio';
import RiskAssessmentSearchLayout from '../riskAssessments/RiskAssessmentSearchLayout';
type ScalerRiskSearchForm = {
  riskQuestionnaireId: string;
  riskTypeCode: string;
  completeInd: string;
  scalerLicenceNo: string;
  orgUnitNo: string;
  clientNumber: string;
  clientLocnCode: string;
  scalerLicenceTypeCode: string;
  primarySort: number;
  secondarySort: number;
};

type ScalerRiskRow = {
  id: string;
  riskQuestionnaireId: string;
  ratingMaxRating: string;
  responsesQuestions: string;
  level: string;
  range: string;
  version: string;
  scalerLicenceNo: string;
  scalerClientLoc: string;
  orgUnitName: string;
  clientName: string;
  raw: ScalerRiskAssessmentSearchResult;
};

const DEFAULT_FORM: ScalerRiskSearchForm = {
  riskQuestionnaireId: '',
  riskTypeCode: '',
  completeInd: '',
  scalerLicenceNo: '',
  orgUnitNo: '',
  clientNumber: '',
  clientLocnCode: '00',
  scalerLicenceTypeCode: '',
  primarySort: 1,
  secondarySort: 0,
};

const SORT_OPTIONS = [
  { label: 'Assessment ID', value: '1' },
  { label: 'Level', value: '8' },
  { label: 'Ver.', value: '4' },
  { label: 'Licence #', value: '3' },
  { label: 'Scaler (Client / Loc)', value: '16' },
  { label: 'Reg/Dist', value: '14' },
  { label: 'Client Name', value: '17' },
];

const TABLE_HEADERS: TableHeaderType<ScalerRiskRow>[] = [
  {
    key: 'riskQuestionnaireId',
    header: 'Assessment ID',
    selected: true,
    renderAs: (_value, row) => {
      const id = row?.raw?.riskQuestionnaireId;
      const display = String(id ?? '');
      if (!id) {
        return <>{display}
        </>;
      }
      return <PermissionLink permission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ} to={`/scaler-risk-assessments/view/${id}`}>{display}</PermissionLink>;
    },
  },
  { key: 'ratingMaxRating', header: 'Rating / Max Rating', selected: true },
  { key: 'responsesQuestions', header: 'Responses / Questions', selected: true },
  {
    key: 'level',
    header: 'Level',
    selected: true,
    renderAs: (value, row) => {
      const pillClass = getRiskLevelPillClass(row?.raw?.riskTypeCode);
      const display = typeof value === 'string' ? value : String(row?.level ?? '');
      return pillClass ? <span className={pillClass}>{display}</span> : <>{display}</>;
    },
  },
  { key: 'range', header: 'Range', selected: true },
  { key: 'version', header: 'Ver.', selected: true },
  {
    key: 'scalerLicenceNo',
    header: 'Licence #',
    selected: true,
    renderAs: (value, row) => {
      const licenceNo = row?.raw?.scalerLicenceNo;
      const display = typeof value === 'string' ? value : String(licenceNo ?? '');
      if (!licenceNo) {
        return <>{display}
        </>;
      }
      return <PermissionLink permission={PERMISSIONS.SCALER_READ} to={`/scalers/view/${encodeURIComponent(licenceNo)}`}>{display}</PermissionLink>;
    },
  },
  { key: 'scalerClientLoc', header: 'Scaler (Client / Loc)', selected: true },
  { key: 'orgUnitName', header: 'Reg / Dist', selected: true },
  { key: 'clientName', header: 'Client Name', selected: true },
];

const EMPTY_RESPONSE: PageableResponse<ScalerRiskRow> = {
  content: [],
  page: {
    size: 10,
    number: 0,
    totalElements: 0,
    totalPages: 1,
  },
};

const ScalerRiskAssessmentsPage: React.FC = () => {
  const { userToken } = useAuth();

  // Persisted across navigation so filters, sorting, and paging remain in place when the user
  // opens an assessment and returns. Result rows are NOT persisted: we cache the submitted search
  // params and re-fetch on return so edits/deletes made elsewhere are reflected, not a stale list.
  const [formData, setFormData] = usePersistentState<ScalerRiskSearchForm>(
    'scalerRiskQuery.formData',
    DEFAULT_FORM,
  );
  const [hasSearched, setHasSearched] = usePersistentState('scalerRiskQuery.hasSearched', false);
  const [lastSearchParams, setLastSearchParams] = usePersistentState<ScalerRiskAssessmentSearchParams | undefined>(
    'scalerRiskQuery.lastSearchParams',
    undefined,
  );
  // Result rows are ephemeral: re-fetched on mount from the cached params, never persisted.
  const [lastData, setLastData] = useState<ScalerRiskAssessmentSearchResult[] | undefined>(undefined);
  const [page, setPage] = usePersistentState('scalerRiskQuery.page', 0);
  const [pageSize, setPageSize] = usePersistentState('scalerRiskQuery.pageSize', 10);
  const [clientError, setClientError] = useState<string | null>(null);
  // Filter-section open/closed. Intentionally NOT persisted: it is a transient view preference,
  // and defaulting to open on every mount matches the other query pages (Scalers, Scale Sites).
  const [filtersOpen, setFiltersOpen] = useState(true);

  const searchMutation = useMutation({
    mutationFn: async (params: ScalerRiskAssessmentSearchParams) => {
      const token = await userToken();
      return API.scalerRiskAssessments.searchScalerRiskAssessments(params, token);
    },
    onSuccess: (data) => {
      setClientError(null);
      setLastData(data);
    },
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

  const loadScalerLicenceTypeLov = useCallback(async () => {
    const token = await userToken();
    return API.lov.getStaticLov({ tableKey: 'SCALER_LICENCE_TYPE_CODE' }, token);
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
    data: scalerLicenceTypeLov,
    isLoading: isLoadingScalerLicenceTypeLov,
    error: scalerLicenceTypeLovError,
  } = useLovOptions<StaticLov>(loadScalerLicenceTypeLov, {
    errorMessage: 'Could not load licence type options.',
    cacheKey: 'scaler-licence-type-lov',
  });

  const riskLevelOptions = useMemo(() => mapStaticLovOptions(riskLevelLov ?? []), [riskLevelLov]);
  const scalerLicenceTypeOptions = useMemo(() => mapStaticLovOptions(scalerLicenceTypeLov ?? []), [scalerLicenceTypeLov]);

  const isLovLoading = isLoadingRiskLevelLov || isLoadingScalerLicenceTypeLov;
  const lovError = riskLevelLovError || scalerLicenceTypeLovError;

  const results: PageableResponse<ScalerRiskRow> = useMemo(() => {
    const data = lastData;
    if (!data) {
      return hasSearched ? EMPTY_RESPONSE : ({} as PageableResponse<ScalerRiskRow>);
    }
    if (!Array.isArray(data)) {
      return EMPTY_RESPONSE;
    }

    const mapped: ScalerRiskRow[] = data.map((row, idx) => ({
      id: String(row.riskQuestionnaireId ?? `risk-${idx}`),
      riskQuestionnaireId: row.riskQuestionnaireId != null ? String(row.riskQuestionnaireId) : '',
      ratingMaxRating: formatRatio(row.riskRating, row.maxRiskRating),
      responsesQuestions: formatRatio(row.numResp, row.questCount),
      level: row.codeDescription ?? row.riskTypeCode ?? '',
      range:
        row.rangeLowValue != null && row.rangeHighValue != null
          ? `${row.rangeLowValue}-${row.rangeHighValue}`
          : '',
      version: row.versionNo != null ? String(row.versionNo) : '',
      scalerLicenceNo: row.scalerLicenceNo ?? '',
      scalerClientLoc: row.scalerClientLoc ?? '',
      orgUnitName: row.orgUnitName ?? '',
      clientName: row.clientName ?? '',
      raw: row,
    }));

    return toPagedResponse(mapped, page, pageSize);
  }, [hasSearched, lastData, page, pageSize]);

  const serverError = useMemo(() => {
    if (clientError) {
      return clientError;
    }

    if (!searchMutation.isError) {
      return null;
    }

    return extractApiError(searchMutation.error, 'An error occurred while searching. Please try again.');
  }, [clientError, searchMutation.error, searchMutation.isError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const doSearch = () => {
    setClientError(null);
    setHasSearched(true);
    setPage(0);

    const params: ScalerRiskAssessmentSearchParams = {
      riskQuestionnaireId: trimToUndefined(formData.riskQuestionnaireId),
      riskTypeCode: trimToUndefined(formData.riskTypeCode),
      completeInd: trimToUndefined(formData.completeInd) as 'Y' | 'N' | undefined,
      scalerLicenceNo: trimToUndefined(formData.scalerLicenceNo),
      orgUnitNo: trimToUndefined(formData.orgUnitNo) ? Number(formData.orgUnitNo) : undefined,
      clientNumber: trimToUndefined(formData.clientNumber),
      scalerLicenceTypeCode: trimToUndefined(formData.scalerLicenceTypeCode) as 'SCS' | 'WA' | undefined,
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
    setClientError(null);
    setPage(0);
    setPageSize(10);
    setFiltersOpen(true);
    searchMutation.reset();
  };

  return (
    <RiskAssessmentSearchLayout
      pageClassName="scaler-risk-assessment-page"
      formClassName="scaler-risk-assessment-form"
      notificationClassName="scaler-risk-assessment-notification"
      resultsClassName="scaler-risk-assessment-results"
      title="Queries - Scaler Risk Assessment"
      subtitle="Search scaler risk assessments by parameters."
      breadCrumbs={[{ name: 'Scaler Risk Assessment' }]}
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
                  id="scalerLicenceNo"
                  name="scalerLicenceNo"
                  labelText="Licence #"
                  value={formData.scalerLicenceNo}
                  onChange={handleInputChange}
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
                <ClientLocSearch
                  labelText="Scaler (Client / Loc)"
                  client={formData.clientNumber}
                  loc={formData.clientLocnCode}
                  onClientChange={(value) => setFormData((prev) => ({ ...prev, clientNumber: value }))}
                  onLocChange={(value) => setFormData((prev) => ({ ...prev, clientLocnCode: value }))}
                  showSearchButton
                  clientId="clientNumber"
                  locId="clientLocnCode"
                  locReadOnly
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <Select
                  id="scalerLicenceTypeCode"
                  name="scalerLicenceTypeCode"
                  labelText="Licence Type"
                  value={formData.scalerLicenceTypeCode}
                  onChange={handleInputChange}
                  disabled={isLovLoading || searchMutation.isPending}
                >
                  <SelectItem value="" text="" />
                  {scalerLicenceTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} text={option.label} />
                  ))}
                </Select>
              </Column>
    </RiskAssessmentSearchLayout>
  );
};

export default ScalerRiskAssessmentsPage;
