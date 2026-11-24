import PermissionLink from '@/components/core/PermissionLink';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import { Reset as ResetIcon, Search as SearchIcon } from '@carbon/icons-react';
import {
    Accordion,
    AccordionItem,
    Column,
    Form,
    Grid,
    InlineNotification,
    TextInput
} from '@carbon/react';
import { useMutation } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/core/Button';
import TableResource from '@/components/Form/TableResource';
import { type PageableResponse, type TableHeaderType } from '@/components/Form/TableResource/types';
import ClientLocSearch from '@/components/core/ClientLocSearch';
import DistrictSelect from '@/components/core/DistrictSelect';
import PageTitle from '@/components/core/PageTitle';
import SortOptions from '@/components/core/SortOptions';
import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import usePersistentState from '@/hooks/usePersistentState';
import API from '@/services/APIs';
import type { ScaleMethodTypeLov } from '@/services/lov.service';
import type { ScaleSiteSearchParams, ScaleSiteSearchResult } from '@/services/scaleSites.service';

import { extractApiError } from '@/utils/extractApiError';
import { trimToUndefined } from '@/utils/queryUtils';

import './index.scss';

import { toPagedResponse } from '@/utils/toPagedResponse';
type SearchMode = 'parameters' | 'inspection';

type ScaleSiteSearchForm = {
  scaleSiteIdNmbr: string;
  orgUnitNo: string;
  siteName: string;
  ownerClientNumber: string;
  ownerClientLocnCode: string;
  inspectionId: string;
  primarySort: number;
  secondarySort: number;
};

type ScaleSiteRow = ScaleSiteSearchResult & { id: string; ownerClientDisplay: string };
type MethodTypeOption = { code: string; description: string };

const DEFAULT_FORM: ScaleSiteSearchForm = {
  scaleSiteIdNmbr: '',
  orgUnitNo: '',
  siteName: '',
  ownerClientNumber: '',
  ownerClientLocnCode: '',
  inspectionId: '',
  primarySort: 1,
  secondarySort: 0,
};

const TABLE_HEADERS: TableHeaderType<ScaleSiteRow>[] = [
  { key: 'scaleSiteIdNmbr', header: 'Scale Site #', selected: true },
  { key: 'siteName', header: 'Scale Site Name', selected: true },
  { key: 'region', header: 'Region', selected: true },
  { key: 'district', header: 'District', selected: true },
  { key: 'methodTypeCodeName', header: 'Site Type', selected: true },
  { key: 'ownerClientDisplay', header: 'Site Owner (Client / Loc)', selected: true },
];

const SORT_OPTIONS = [
  { label: 'Scale Site #', value: '1' },
  { label: 'Region', value: '11' },
  { label: 'District', value: '10' },
  { label: 'Site Type', value: '3' },
  { label: 'Scale Site Name', value: '8' },
  { label: 'Site Owner', value: '7' },
];

const EMPTY_RESPONSE: PageableResponse<ScaleSiteRow> = {
  content: [],
  page: { size: 10, number: 0, totalElements: 0, totalPages: 1 },
};

const toOwnerClientDisplay = (ownerClientNumber?: string | null, ownerClientLocnCode?: string | null): string => {
  if (!ownerClientNumber && !ownerClientLocnCode) {
    return '';
  }
  return `${ownerClientNumber ?? ''}/${ownerClientLocnCode ?? ''}`;
};

type ScaleSitesSearchPageProps = {
  modalMode?: boolean;
  onScaleSiteSelect?: (site: ScaleSiteSearchResult) => void;
};

const ScaleSitesSearchPage: React.FC<ScaleSitesSearchPageProps> = ({ modalMode, onScaleSiteSelect }) => {
  const { userToken, user } = useAuth();
  const navigate = useNavigate();

  const isClientRestricted = user?.isClientRestricted ?? false;
  const restrictedClient = user?.clientNumbers?.[0];
  const isMultiClient = isClientRestricted && (user?.clientNumbers?.length ?? 0) > 1;

  // Persist list state across navigation only for the standalone route, never for the modal picker.
  const isModal = Boolean(modalMode);
  const persist = !isModal;

  // searchMode is intentionally NOT persisted: the inspection path navigates away rather than
  // producing list results, so restoring it on return would open a mode that mismatches the
  // restored parameter results. Defaulting to 'parameters' always matches the persisted results.
  const [searchMode, setSearchMode] = useState<SearchMode>('parameters');
  const [formData, setFormData] = usePersistentState<ScaleSiteSearchForm>('scaleSiteQuery.formData', DEFAULT_FORM, persist);
  const [selectedMethodOptions, setSelectedMethodOptions] = usePersistentState<MethodTypeOption[]>(
    'scaleSiteQuery.selectedMethodOptions',
    [],
    persist,
  );
  const [hasSearched, setHasSearched] = usePersistentState('scaleSiteQuery.hasSearched', false, persist);
  // Cache the submitted search params (not the result rows) so returning to the page re-fetches
  // fresh data — any create/edit/delete done elsewhere is reflected instead of a stale cached list.
  const [lastSearchParams, setLastSearchParams] = usePersistentState<ScaleSiteSearchParams | undefined>(
    'scaleSiteQuery.lastSearchParams',
    undefined,
    persist,
  );
  // Result rows are ephemeral: re-fetched on mount from the cached params, never persisted.
  const [lastData, setLastData] = useState<ScaleSiteSearchResult[] | undefined>(undefined);
  const [page, setPage] = usePersistentState('scaleSiteQuery.page', 0, persist);
  const [pageSize, setPageSize] = usePersistentState('scaleSiteQuery.pageSize', 10, persist);
  const [clientError, setClientError] = useState<string | null>(null);

  const loadMethodTypes = useCallback(async () => {
    const token = await userToken();
    return API.lov.getScaleMethodTypeLov(undefined, token);
  }, [userToken]);

  const { data: scaleMethodTypes, error: scaleMethodTypesError } = useLovOptions<ScaleMethodTypeLov>(
    loadMethodTypes,
    { errorMessage: 'Could not load scale site method types.', cacheKey: 'scale-method-type-lov' },
  );

  const methodTypeOptions = useMemo(() => {
    return (scaleMethodTypes ?? [])
      .filter((m): m is Required<Pick<ScaleMethodTypeLov, 'code' | 'description'>> => Boolean(m.code && m.description))
      .map((m) => ({ code: String(m.code).trim(), description: String(m.description).trim() }));
  }, [scaleMethodTypes]);

  const mutation = useMutation({
    mutationFn: async (params: ScaleSiteSearchParams) => {
      const token = await userToken();
      return API.scaleSites.searchScaleSites(params, token);
    },
    onSuccess: (data) => setLastData(data),
  });

  // On return to the page (remount), re-run the last parameter search so the list reflects any
  // changes made elsewhere. Mount-only: a fresh page with no prior search leaves this inert.
  useEffect(() => {
    if (hasSearched && lastSearchParams) {
      mutation.mutate(lastSearchParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed + lock the owner-client filter to a restricted user's own client (the server enforces this too).
  useEffect(() => {
    if (isClientRestricted && restrictedClient && formData.ownerClientNumber !== restrictedClient) {
      setFormData((prev) => ({ ...prev, ownerClientNumber: restrictedClient }));
    }
  }, [isClientRestricted, restrictedClient, formData.ownerClientNumber, setFormData]);

  const inspectionMutation = useMutation({
    mutationFn: async (inspectionId: number) => {
      const token = await userToken();
      return API.scaleSiteInspections.searchScaleSiteInspection(inspectionId, token);
    },
    onSuccess: (data) => {
      if (!data.inspectionId) {
        setClientError('Inspection search did not return an inspection id.');
        return;
      }
      if (!data.scaleSiteIdNmbr) {
        setClientError('Inspection search did not return a scale site number.');
        return;
      }
      navigate(`/scale-sites/${encodeURIComponent(data.scaleSiteIdNmbr)}/inspections/view/${encodeURIComponent(String(data.inspectionId))}`);
    },
  });

  const isBusy = mutation.isPending || inspectionMutation.isPending;

  const results: PageableResponse<ScaleSiteRow> = useMemo(() => {
    const data = lastData;
    if (!data) {
      return hasSearched ? EMPTY_RESPONSE : ({} as PageableResponse<ScaleSiteRow>);
    }

    const mapped: ScaleSiteRow[] = data.map((row, idx) => ({
      ...row,
      id: row.scaleSiteIdNmbr ?? `${row.siteName ?? 'scale-site'}-${idx}`,
      ownerClientDisplay: toOwnerClientDisplay(row.ownerClientNumber, row.ownerClientLocnCode),
    }));

    return toPagedResponse(mapped, page, pageSize);
  }, [hasSearched, lastData, page, pageSize]);

  const serverError = useMemo(() => {
    if (clientError) {
      return clientError;
    }
    const activeIsError = searchMode === 'inspection' ? inspectionMutation.isError : mutation.isError;
    const activeError = searchMode === 'inspection' ? inspectionMutation.error : mutation.error;
    if (!activeIsError) {
      return null;
    }
    return extractApiError(activeError, 'An error occurred while searching. Please try again.');
  }, [clientError, inspectionMutation.error, inspectionMutation.isError, mutation.error, mutation.isError, searchMode]);

  const switchSearchMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setClientError(null);
    mutation.reset();
    inspectionMutation.reset();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClientError(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  const doSearch = () => {
    setClientError(null);
    if (searchMode === 'inspection') {
      const inspectionIdValue = trimToUndefined(formData.inspectionId);
      if (!inspectionIdValue) {
        setClientError('Inspection id is required.');
        return;
      }
      const inspectionId = Number(inspectionIdValue);
      if (!Number.isInteger(inspectionId) || inspectionId <= 0) {
        setClientError('Inspection id must be a positive whole number.');
        return;
      }
      inspectionMutation.mutate(inspectionId);
      return;
    }
    setHasSearched(true);
    setPage(0);
    const params: ScaleSiteSearchParams = {
      scaleSiteIdNmbr: trimToUndefined(formData.scaleSiteIdNmbr),
      orgUnitNo: formData.orgUnitNo ? Number(formData.orgUnitNo) : undefined,
      siteName: trimToUndefined(formData.siteName),
      ownerClientNumber: trimToUndefined(formData.ownerClientNumber),
      ownerClientLocnCode: trimToUndefined(formData.ownerClientLocnCode),
      methodTypes: (selectedMethodOptions ?? []).map((o) => o.code).filter(Boolean).length > 0 ? (selectedMethodOptions ?? []).map((o) => o.code) : undefined,
      primarySort: formData.primarySort,
      secondarySort: formData.secondarySort,
    };
    setLastSearchParams(params);
    mutation.mutate(params);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    doSearch();
  };
  const handleReset = () => {
    setSearchMode('parameters');
    setFormData(
      isClientRestricted && restrictedClient ? { ...DEFAULT_FORM, ownerClientNumber: restrictedClient } : DEFAULT_FORM,
    );
    setSelectedMethodOptions([]);
    setHasSearched(false);
    setLastSearchParams(undefined);
    setLastData(undefined);
    setPage(0);
    setPageSize(10);
    setClientError(null);
    mutation.reset();
    inspectionMutation.reset();
  };

  const stopModalSelectEvent = useCallback((e: React.SyntheticEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  // In the modal picker the action buttons sit inside Carbon's scrollable modal body. When the
  // body overflows (small screens), Carbon's Modal focus-trap `handleBlur` calls
  // `scrollIntoView({ block: 'center' })` on whatever element receives focus. Clicking a button
  // focuses it on mousedown, so Carbon re-centers it mid-click — moving it out from under the
  // pointer before mouseup, so `click` never fires (the press is "eaten" and the modal scrolls).
  // Preventing the mousedown default stops the button taking focus via pointer, so Carbon's
  // scroll never triggers and the click lands first time. Keyboard focus (Tab) is unaffected.
  const preventFocusScroll = useCallback((e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); }, []);
  const handleModalSiteSelect = useCallback((e: React.MouseEvent<HTMLButtonElement>, site: ScaleSiteSearchResult) => {
    stopModalSelectEvent(e);
    onScaleSiteSelect?.(site);
  }, [onScaleSiteSelect, stopModalSelectEvent]);

  const renderScaleSiteCell = useCallback((value: unknown, row?: ScaleSiteRow) => {
    const display = typeof value === 'string' || typeof value === 'number' ? String(value) : String(row?.scaleSiteIdNmbr ?? '');
    if (isModal && onScaleSiteSelect && row) {
      return (
        <button
          type="button"
          onPointerDown={stopModalSelectEvent}
          onMouseDown={stopModalSelectEvent}
          onTouchStart={stopModalSelectEvent}
          onClick={(e) => handleModalSiteSelect(e, row)}
          style={{ background: 'none', border: 'none', padding: 0, margin: 0, color: 'var(--cds-text-link, #0f62fe)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
        >
          {display}
        </button>
      );
    }

    return (
      <PermissionLink permission={PERMISSIONS.SCALE_SITE_READ} to={`/scale-sites/view/${encodeURIComponent(display)}`} title="Scale Site Record">
        {display}
      </PermissionLink>
    );
  }, [handleModalSiteSelect, isModal, onScaleSiteSelect, stopModalSelectEvent]);

  const headersWithRender: TableHeaderType<ScaleSiteRow>[] = useMemo(() => TABLE_HEADERS.map((h) => (h.key === 'scaleSiteIdNmbr' ? { ...h, renderAs: renderScaleSiteCell } : h)), [renderScaleSiteCell]);

  return (
    <Grid className="scale-site-search-page">
      <Column lg={16} md={8} sm={4}>
        {isModal ? null : (
          <PageTitle title="Queries - Scale Sites" subtitle="Search scale sites by parameters or inspection number." breadCrumbs={[{ name: 'Scale Sites' }]} />
        )}

        {isMultiClient && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title="Multiple clients not supported"
            subtitle="Your account is associated with more than one forest client. A single client per login is required; multi-client access isn't available yet."
            className="scale-site-search__notification"
          />
        )}

        {isModal ? (
          <div className="scale-site-search-form scs__form" role="form">
            <h4 className="scs__form__section-title">Choose your search parameters.</h4>
            {serverError ? (<InlineNotification kind="error" lowContrast title="Search failed" subtitle={serverError} onCloseButtonClick={() => mutation.reset()} className="scale-site-search__notification" />) : null}

            <Grid className="scs__form__grid">
              <Column lg={8} md={8} sm={4}>
                <TextInput id="scaleSiteIdNmbr" name="scaleSiteIdNmbr" labelText="Scale Site #" value={formData.scaleSiteIdNmbr} onChange={handleInputChange} maxLength={8} disabled={isBusy} />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <DistrictSelect id="orgUnitNo" value={formData.orgUnitNo} onChange={(value) => setFormData((prev) => ({ ...prev, orgUnitNo: value }))} hideLabel={false} labelText="Reg / Dist" disabled={isBusy} />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <TextInput id="siteName" name="siteName" labelText="Scale Site Name" value={formData.siteName} onChange={handleInputChange} maxLength={40} disabled={isBusy} />
              </Column>

                <Column lg={8} md={8} sm={4} className="scale-site-search__client-loc">
                <ClientLocSearch labelText="Site Owner (Client / Loc)" client={formData.ownerClientNumber} loc={formData.ownerClientLocnCode} onClientChange={(value) => setFormData((prev) => ({ ...prev, ownerClientNumber: value }))} onLocChange={(value) => setFormData((prev) => ({ ...prev, ownerClientLocnCode: value }))} showSearchButton={!isClientRestricted} clientId="ownerClientNumber" locId="ownerClientLocnCode" clientReadOnly={isClientRestricted} />
              </Column>

              <Column lg={8} md={8} sm={4}>
                {scaleMethodTypesError ? (<InlineNotification kind="error" lowContrast hideCloseButton title="Could not load site types" subtitle={scaleMethodTypesError} className="scale-site-search__inline-notification" />) : null}
                <ActiveMultiSelect<MethodTypeOption>
                  id="method-types"
                  items={methodTypeOptions}
                  itemToString={(item) => (item?.description ? String(item.description) : '')}
                  titleText="Site Type"
                  selectedItems={selectedMethodOptions}
                  onChange={(event) => setSelectedMethodOptions(event.selectedItems ?? [])}
                />
              </Column>
            </Grid>

            <div className="scs__form__divider" />

            <SortOptions layout="form" showHeading options={SORT_OPTIONS} primarySort={String(formData.primarySort)} onPrimarySortChange={(value) => setFormData((prev) => ({ ...prev, primarySort: Number(value) }))} secondarySort={String(formData.secondarySort)} onSecondarySortChange={(value) => setFormData((prev) => ({ ...prev, secondarySort: Number(value) }))} disabled={isBusy} />

            <div className="scale-site-search__actions form-actions">
              <Button type="button" onMouseDown={preventFocusScroll} onClick={() => { doSearch(); }} renderIcon={SearchIcon} disabled={isBusy}>Search</Button>
              <Button type="button" kind="secondary" onMouseDown={preventFocusScroll} onClick={handleReset} renderIcon={ResetIcon} disabled={isBusy}>Reset</Button>
            </div>
          </div>
        ) : (
          <Form onSubmit={handleSubmit} className="scale-site-search-form scs__form">
            {serverError ? (<InlineNotification kind="error" lowContrast title="Search failed" subtitle={serverError} onCloseButtonClick={() => mutation.reset()} className="scale-site-search__notification" />) : null}

            <Accordion className="scs-query-accordion">
              <AccordionItem title={<h4 style={{ margin: 0 }}>Choose your search parameters.</h4>} open={searchMode === 'parameters'} onHeadingClick={() => switchSearchMode('parameters')}>
                <Grid className="scs__form__grid">
                  <Column lg={8} md={8} sm={4}><TextInput id="scaleSiteIdNmbr" name="scaleSiteIdNmbr" labelText="Scale Site #" value={formData.scaleSiteIdNmbr} onChange={handleInputChange} maxLength={8} disabled={isBusy} /></Column>

                  <Column lg={8} md={8} sm={4}><DistrictSelect id="orgUnitNo" value={formData.orgUnitNo} onChange={(value) => setFormData((prev) => ({ ...prev, orgUnitNo: value }))} hideLabel={false} labelText="Reg / Dist" disabled={isBusy} /></Column>

                  <Column lg={8} md={8} sm={4}><TextInput id="siteName" name="siteName" labelText="Scale Site Name" value={formData.siteName} onChange={handleInputChange} maxLength={40} disabled={isBusy} /></Column>

                  <Column lg={8} md={8} sm={4} className="scale-site-search__client-loc"><ClientLocSearch labelText="Site Owner (Client / Loc)" client={formData.ownerClientNumber} loc={formData.ownerClientLocnCode} onClientChange={(value) => setFormData((prev) => ({ ...prev, ownerClientNumber: value }))} onLocChange={(value) => setFormData((prev) => ({ ...prev, ownerClientLocnCode: value }))} showSearchButton={!isClientRestricted} clientId="ownerClientNumber" locId="ownerClientLocnCode" clientReadOnly={isClientRestricted} /></Column>

                  <Column lg={8} md={8} sm={4}>
                    {scaleMethodTypesError ? (<InlineNotification kind="error" lowContrast hideCloseButton title="Could not load site types" subtitle={scaleMethodTypesError} className="scale-site-search__inline-notification" />) : null}
                    <ActiveMultiSelect<MethodTypeOption>
                      id="method-types"
                      items={methodTypeOptions}
                      itemToString={(item) => (item?.description ? String(item.description) : '')}
                      titleText="Site Type"
                      selectedItems={selectedMethodOptions}
                      onChange={(event) => setSelectedMethodOptions(event.selectedItems ?? [])}
                    />
                  </Column>
                </Grid>

                <div className="scs__form__divider" />

                <SortOptions layout="form" showHeading options={SORT_OPTIONS} primarySort={String(formData.primarySort)} onPrimarySortChange={(value) => setFormData((prev) => ({ ...prev, primarySort: Number(value) }))} secondarySort={String(formData.secondarySort)} onSecondarySortChange={(value) => setFormData((prev) => ({ ...prev, secondarySort: Number(value) }))} disabled={isBusy} />
              </AccordionItem>

              {/* Gated on the permission behind the record it navigates to. This is a lookup-by-number
                  box: it resolves an arbitrary inspection id and jumps straight to that inspection's
                  record, so a role without inspection access would otherwise get a search that always
                  fails. (The server is scoped independently — `ScaleSiteInspectionService` guards the
                  resolved site — so this gate is the usability half, not the containment half.) */}
              <PermissionGate permission={PERMISSIONS.SCALE_SITE_INSPECTION_QUERY}>
                <AccordionItem title={<h4 style={{ margin: 0 }}>OR enter inspection #</h4>} open={searchMode === 'inspection'} onHeadingClick={() => switchSearchMode('inspection')}>
                  <Grid className="scs__form__grid"><Column lg={8} md={8} sm={4}><TextInput id="inspectionId" name="inspectionId" labelText="Inspection #" value={formData.inspectionId} onChange={handleInputChange} maxLength={10} disabled={isBusy} /></Column></Grid>
                </AccordionItem>
              </PermissionGate>
            </Accordion>

            <div className="scale-site-search__actions form-actions"><Button type="submit" onMouseDown={preventFocusScroll} onClick={(e) => {
              e.preventDefault();
              doSearch();
            }} renderIcon={SearchIcon} disabled={isBusy}>Search</Button><Button type="button" kind="secondary" onMouseDown={preventFocusScroll} onClick={handleReset} renderIcon={ResetIcon} disabled={isBusy}>Reset</Button></div>
          </Form>
        )}
      </Column>

      <Column lg={16} md={8} sm={4} className="scale-site-search-results">
        <TableResource headers={headersWithRender} content={results} loading={mutation.isPending || (hasSearched && !lastData && !mutation.isError)} error={mutation.isError} onPageChange={({ page, pageSize }) => {
          setPage(page - 1);
          setPageSize(pageSize);
        }} />
        {!isModal && hasSearched && !mutation.isPending && lastData !== undefined ? (
          <PermissionGate permission={PERMISSIONS.SCALE_SITE_CREATE}>
            <Button type="button" kind="primary" onClick={() => navigate('/scale-sites/create')} style={{ marginTop: '16px' }}>
              Create Scale Site
            </Button>
          </PermissionGate>
        ) : null}
      </Column>

    </Grid>
  );
};

export { ScaleSitesSearchPage };
export default ScaleSitesSearchPage;
