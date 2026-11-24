import { Reset as ResetIcon, Search as SearchIcon } from '@carbon/icons-react';
import {
  Accordion,
  AccordionItem,
  Column,
  Form,
  Grid,
  InlineNotification,
  Select,
  SelectItem,
  TextInput
} from '@carbon/react';
import PermissionLink from '@/components/core/PermissionLink';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import { useMutation } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import TableResource from '@/components/Form/TableResource';
import { type PageableResponse, type TableHeaderType } from '@/components/Form/TableResource/types';
import ClientLocSearch from '@/components/core/ClientLocSearch';
import DistrictSelect from '@/components/core/DistrictSelect';
import PageTitle from '@/components/core/PageTitle';
import SortOptions from '@/components/core/SortOptions';
import { useActiveClient } from '@/context/activeClient/useActiveClient';
import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import usePersistentState from '@/hooks/usePersistentState';
import API from '@/services/APIs';
import type { AppointmentTypeLov, ScalerTrainingTypeLov, StaticLov } from '@/services/lov.service';
import type { Scaler, ScalerSearchParams } from '@/services/scalers.service';

import { extractApiError } from '@/utils/extractApiError';
import { APPOINTMENT_TYPE_LOV } from '@/utils/lovCache';

import './index.scss';

import { toPagedResponse } from '@/utils/toPagedResponse';
interface ScalerSearchForm {
  scalerLicenceNo: string;
  orgUnitNo: string;
  clientNumber: string;
  clientLocnCode: string;
  scalerLicenceTypeCode: string;
  clientName: string;
  legalFirstName: string;
  scalerAppointmentType: string;
  scalarTrainingType: string;
  checkScaleIdDisplay: string;
  primarySort: number;
  secondarySort: number;
}

type SortOption = {
  label: string;
  value: string;
};

const DEFAULT_FORM: ScalerSearchForm = {
  scalerLicenceNo: '',
  orgUnitNo: '',
  clientNumber: '',
  clientLocnCode: '00',
  scalerLicenceTypeCode: '',
  clientName: '',
  legalFirstName: '',
  scalerAppointmentType: '',
  scalarTrainingType: '',
  checkScaleIdDisplay: '',
  primarySort: 1,
  secondarySort: 0,
};

type ScalerRow = Scaler & { id: string };

const EMPTY_RESPONSE: PageableResponse<ScalerRow> = {
  content: [],
  page: {
    size: 10,
    number: 0,
    totalElements: 0,
    totalPages: 1,
  },
};

const TABLE_HEADERS: TableHeaderType<ScalerRow>[] = [
  {
    key: 'scalerLicenceNo',
    header: 'Licence #',
    selected: true,
  },
  { key: 'orgUnitName', header: 'Reg / Dist', selected: true },
  { key: 'clientName', header: 'Last Name', selected: true },
  { key: 'legalFirstName', header: 'First Name', selected: true },
  { key: 'legalMiddleName', header: 'Middle Name', selected: true },
  { key: 'licenceType', header: 'Licence Type', selected: true },
  { key: 'scalerClientLoc', header: 'Scaler (Client / Loc)', selected: true },
];

type ScalerSearchPageProps = {
  // When true, this page is rendered in a modal; infer modal-specific UI like no breadcrumbs and no gutters.
  modalMode?: boolean;
  onScalerSelect?: (scaler: Scaler) => void;
  hidePageTitle?: boolean;
};

const ScalerSearch: React.FC<ScalerSearchPageProps> = ({
  modalMode,
  onScalerSelect,
  hidePageTitle = false,
}) => {
  const { userToken, user } = useAuth();
  const navigate = useNavigate();

  const isClientRestricted = user?.isClientRestricted ?? false;
  // The client currently switched to, not simply the first one held: a multi-client user searches as
  // one client at a time, and this must agree with the scope the API will apply to the same request.
  const { activeClient: restrictedClient } = useActiveClient();

  // Persist list state across navigation only for the standalone route, never for the modal picker.
  const isModal = Boolean(modalMode);
  const persist = !isModal;

  const [formData, setFormData] = usePersistentState<ScalerSearchForm>('scalerQuery.formData', DEFAULT_FORM, persist);
  // searchMode is intentionally NOT persisted: the check-scale path never produces list results (it
  // navigates to the check scale or stays with a field error), so restoring it on return would open a
  // mode that mismatches the restored parameter results. 'parameters' always matches them.
  const [searchMode, setSearchMode] = useState<'parameters' | 'checkScale'>('parameters');

  const [hasSearched, setHasSearched] = usePersistentState('scalerQuery.hasSearched', false, persist);
  // Cache the submitted search params (not the result rows) so returning to the page re-fetches
  // fresh data — any create/edit/delete done elsewhere is reflected instead of a stale cached list.
  const [lastSearchParams, setLastSearchParams] = usePersistentState<ScalerSearchParams | undefined>(
    'scalerQuery.lastSearchParams',
    undefined,
    persist,
  );
  // Result rows are ephemeral: re-fetched on mount from the cached params, never persisted.
  const [lastData, setLastData] = useState<Scaler[] | undefined>(undefined);

  const [page, setPage] = usePersistentState('scalerQuery.page', 0, persist);
  const [pageSize, setPageSize] = usePersistentState('scalerQuery.pageSize', 10, persist);

  const mutation = useMutation({
    mutationFn: async (params: ScalerSearchParams) => {
      const token = await userToken();
      return API.scalers.searchScalers(params, token);
    },
    onSuccess: (data) => {
      setLastData(data);
    },
  });

  // The check scale # search looks the record up before leaving the form, as legacy
  // QueriesScalersSearchAction.search() did: a miss is a field error here, not the view's generic one.
  const [checkScaleError, setCheckScaleError] = useState<string | null>(null);
  const checkScaleLookup = useMutation({
    mutationFn: async (checkScaleId: string) => {
      const token = await userToken();
      return API.checkScale.findCheckScale(checkScaleId, token);
    },
    onSuccess: (checkScale) => {
      if (checkScale) {
        // The record's own id, so "0042" opens /check-scales/view/42.
        navigate(`/check-scales/view/${checkScale.checkScaleId}`);
      } else {
        setCheckScaleError('No records were found.');
      }
    },
  });

  // On return to the page (remount), re-run the last search so the list reflects any changes
  // made elsewhere. Mount-only: a fresh page with no prior search leaves this inert.
  useEffect(() => {
    if (hasSearched && lastSearchParams) {
      mutation.mutate(lastSearchParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed + lock the client filter to a restricted user's own client (the server enforces this too).
  useEffect(() => {
    if (isClientRestricted && restrictedClient && formData.clientNumber !== restrictedClient) {
      setFormData((prev) => ({ ...prev, clientNumber: restrictedClient }));
    }
  }, [isClientRestricted, restrictedClient, formData.clientNumber, setFormData]);

  const results: PageableResponse<ScalerRow> = useMemo(() => {
    // A failed search clears the table: the previous run's rows are dropped so they can't be read as
    // the (failed) query's results, and TableResource falls to its error state while the banner
    // carries the specific reason.
    if (mutation.isError) {
      return {} as PageableResponse<ScalerRow>;
    }
    const data = lastData;
    if (!data) {
      return hasSearched ? EMPTY_RESPONSE : ({} as PageableResponse<ScalerRow>);
    }

    const mapped: ScalerRow[] = data.map((row, idx) => {
      const id = row.scalerLicenceNo ?? row.scalerClientLoc ?? String(idx);
      return { ...row, id };
    });

    return toPagedResponse(mapped, page, pageSize);
  }, [lastData, hasSearched, page, pageSize, mutation.isError]);

  // Surface a failed search as an error banner. Without this, an errored request left the prior
  // successful results on screen unchanged — the stale-results-instead-of-error bug: `mutation.error`
  // was never rendered, and TableResource only shows its error state when it has no content to fall
  // back to, so the previous run's rows kept showing.
  const serverError = useMemo(() => {
    // doSearch clears the other search's error before running one, so at most one of these is set.
    const error = checkScaleLookup.isError ? checkScaleLookup.error : mutation.isError ? mutation.error : null;
    if (!error) {
      return null;
    }
    return extractApiError(error, 'An error occurred while searching. Please try again.');
  }, [mutation.isError, mutation.error, checkScaleLookup.isError, checkScaleLookup.error]);

  const loadAppointmentTypes = useCallback(async () => {
    const token = await userToken();
    return API.lov.getAppointmentTypeLov(undefined, token);
  }, [userToken]);

  const {
    data: appointmentTypes,
    isLoading: isLoadingAppointmentTypes,
    error: appointmentTypesError,
  } = useLovOptions<AppointmentTypeLov>(loadAppointmentTypes, {
    errorMessage: 'Could not load appointment types.',
    cacheKey: APPOINTMENT_TYPE_LOV,
  });

  // Exam / Upgrade is the SCALER_TRAINING_TYPE LOV (legacy scalerSearch.jsp dropList), the same
  // list the scaler create/edit Exams & Upgrades section uses — not a two-value Exam/Upgrade choice.
  const loadTrainingTypes = useCallback(async () => {
    const token = await userToken();
    return API.lov.getScalerTrainingTypeLov(token);
  }, [userToken]);

  const {
    data: trainingTypes,
    isLoading: isLoadingTrainingTypes,
    error: trainingTypesError,
  } = useLovOptions<ScalerTrainingTypeLov>(loadTrainingTypes, {
    errorMessage: 'Could not load exam / upgrade types.',
    cacheKey: 'scaler-training-type-lov',
  });

  const loadLicenceTypes = useCallback(async () => {
    const token = await userToken();
    return API.lov.getStaticLov({ tableKey: 'SCALER_LICENCE_TYPE_CODE' }, token);
  }, [userToken]);

  const { data: licenceTypes } = useLovOptions<StaticLov>(loadLicenceTypes, {
    errorMessage: 'Could not load licence types.',
    cacheKey: 'static-lov-scaler-licence-type-code',
  });

  const sortOptions: SortOption[] = useMemo(
    () => [
      { label: 'Licence #', value: '1' },
      { label: 'Reg / Dist', value: '2' },
      { label: 'Last Name', value: '3' },
      { label: 'First Name', value: '4' },
      { label: 'Middle Name', value: '5' },
      { label: 'Licence Type', value: '6' },
      { label: 'Scaler (Client / Loc)', value: '7' },
    ],
    [],
  );

  const SECTION_HEADING = 'Choose your search parameters.';

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
  const preventFocusScroll = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  }, []);

  const handleModalScalerSelect = useCallback((e: React.MouseEvent<HTMLButtonElement>, scaler: Scaler) => {
    stopModalSelectEvent(e);

    const nativeEvent = e.nativeEvent as Event & {
      stopImmediatePropagation?: () => void;
    };
    nativeEvent.stopImmediatePropagation?.();

    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur?.();

    onScalerSelect?.(scaler);
  }, [onScalerSelect, stopModalSelectEvent]);

  const renderScalerCell = useCallback((value: unknown, row?: ScalerRow) => {
    const display = typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : String(row?.scalerLicenceNo ?? '');

    if (isModal && onScalerSelect && row) {
      return (
        <button
          type="button"
          onPointerDown={stopModalSelectEvent}
          onMouseDown={stopModalSelectEvent}
          onTouchStart={stopModalSelectEvent}
          onClick={(e) => handleModalScalerSelect(e, row)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            color: 'var(--cds-text-link, #0f62fe)',
            textDecoration: 'underline',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          {display}
        </button>
      );
    }

    return (
      <PermissionLink permission={PERMISSIONS.SCALER_READ} to={`/scalers/view/${encodeURIComponent(display)}`} title="Scaler Record">
        {display}
      </PermissionLink>
    );
  }, [handleModalScalerSelect, isModal, onScalerSelect, stopModalSelectEvent]);

  const headersWithRender: TableHeaderType<ScalerRow>[] = useMemo(() => {
    return TABLE_HEADERS.map((h) => {
      if (h.key === 'scalerLicenceNo') {
        return {
          ...h,
          renderAs: renderScalerCell,
        };
      }
      return h;
    });
  }, [renderScalerCell]);

  const handleElementChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'checkScaleIdDisplay') {
      setCheckScaleError(null);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const doSearch = () => {
    // An empty check scale # falls through to the parameter search, as it did in legacy.
    const checkScaleId = formData.checkScaleIdDisplay.trim();
    if (!isModal && searchMode === 'checkScale' && checkScaleId) {
      checkScaleLookup.reset();
      // Drop a failed parameter search's banner so it can't sit beside the check scale # result.
      if (mutation.isError) {
        mutation.reset();
      }
      if (!/^-?\d+$/.test(checkScaleId)) {
        setCheckScaleError('Check Scale # must be a number.');
        return;
      }
      setCheckScaleError(null);
      checkScaleLookup.mutate(checkScaleId);
      return;
    }

    checkScaleLookup.reset();
    setCheckScaleError(null);
    setHasSearched(true);
    setPage(0);

    const params: ScalerSearchParams = {
      scalerLicenceNo: formData.scalerLicenceNo || undefined,
      clientNumber: formData.clientNumber || undefined,
      orgUnitNo: formData.orgUnitNo ? Number(formData.orgUnitNo) : undefined,
      clientName: formData.clientName || undefined,
      legalFirstName: formData.legalFirstName || undefined,
      scalarTrainingType: formData.scalarTrainingType || undefined,
      scalerLicenceTypeCode: formData.scalerLicenceTypeCode || undefined,
      scalerAppointmentType: formData.scalerAppointmentType || undefined,
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
    setFormData(
      isClientRestricted && restrictedClient
        ? { ...DEFAULT_FORM, clientNumber: restrictedClient }
        : DEFAULT_FORM,
    );
    if (!isModal) {
      setSearchMode('parameters');
    }
    setHasSearched(false);
    setLastSearchParams(undefined);
    setLastData(undefined);
    setPage(0);
    setPageSize(10);
    mutation.reset();
    checkScaleLookup.reset();
    setCheckScaleError(null);
  };

  const formFields = (
    <>
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="scalerLicenceNo"
            name="scalerLicenceNo"
            labelText="Licence #"
            value={formData.scalerLicenceNo}
            onChange={handleElementChange}
            disabled={mutation.isPending}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DistrictSelect
            id="orgUnitNo"
            value={formData.orgUnitNo}
            onChange={(value) => setFormData((prev) => ({ ...prev, orgUnitNo: value }))}
            hideLabel={false}
            labelText="Reg / Dist"
            disabled={mutation.isPending}
          />
        </Column>

        <Column lg={8} md={8} sm={4} className="scaler-search__client-loc">
          <ClientLocSearch
            labelText="Scaler (Client / Loc)"
            client={formData.clientNumber}
            loc={formData.clientLocnCode}
            onClientChange={(value) => setFormData((prev) => ({ ...prev, clientNumber: value ?? '' }))}
            onLocChange={(value) => setFormData((prev) => ({ ...prev, clientLocnCode: value ?? '' }))}
            showSearchButton={!isClientRestricted}
            clientId="clientNumber"
            locId="clientLocnCode"
            clientReadOnly={isClientRestricted}
            locReadOnly
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="scalerLicenceTypeCode"
            name="scalerLicenceTypeCode"
            labelText="Licence Type"
            value={formData.scalerLicenceTypeCode}
            onChange={handleElementChange}
            disabled={mutation.isPending}
          >
            <SelectItem value="" text="" />
            {(licenceTypes ?? [])
              .filter((lov) => lov.code && lov.description)
              .map((lov) => (
                <SelectItem key={String(lov.code)} value={String(lov.code)} text={String(lov.description)} />
              ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="clientName"
            name="clientName"
            labelText="Last Name"
            value={formData.clientName}
            onChange={handleElementChange}
            disabled={mutation.isPending}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="legalFirstName"
            name="legalFirstName"
            labelText="First Name"
            value={formData.legalFirstName}
            onChange={handleElementChange}
            disabled={mutation.isPending}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="scalerAppointmentType"
            name="scalerAppointmentType"
            labelText="Appointment Type"
            value={formData.scalerAppointmentType}
            onChange={handleElementChange}
            disabled={isLoadingAppointmentTypes || mutation.isPending}
            invalid={Boolean(appointmentTypesError)}
            invalidText={appointmentTypesError ?? undefined}
          >
            <SelectItem value="" text="" />
            {(appointmentTypes ?? [])
              .filter((t) => t.code)
              .map((t) => (
                <SelectItem
                  key={String(t.code)}
                  value={String(t.code)}
                  text={String(t.description)}
                />
              ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="scalarTrainingType"
            name="scalarTrainingType"
            labelText="Exam / Upgrade"
            value={formData.scalarTrainingType}
            onChange={handleElementChange}
            disabled={isLoadingTrainingTypes || mutation.isPending}
            invalid={Boolean(trainingTypesError)}
            invalidText={trainingTypesError ?? undefined}
          >
            <SelectItem value="" text="" />
            {(trainingTypes ?? [])
              .filter((t) => t.code)
              .map((t) => (
                <SelectItem
                  key={String(t.code)}
                  value={String(t.code)}
                  text={String(t.description ?? t.code)}
                />
              ))}
          </Select>
        </Column>
      </Grid>

      <div className="scs__form__divider" />

      <SortOptions
        layout="form"
        showHeading
        options={sortOptions}
        primarySort={String(formData.primarySort)}
        onPrimarySortChange={(value) => setFormData((prev) => ({ ...prev, primarySort: Number(value) }))}
        secondarySort={String(formData.secondarySort)}
        onSecondarySortChange={(value) => setFormData((prev) => ({ ...prev, secondarySort: Number(value) }))}
        disabled={mutation.isPending}
      />
    </>
  );

  const errorBanner = serverError ? (
    <InlineNotification
      kind="error"
      lowContrast
      title="Search failed"
      subtitle={serverError}
      onCloseButtonClick={() => {
        mutation.reset();
        checkScaleLookup.reset();
      }}
      className="scaler-search__notification"
    />
  ) : null;

  const formInnerModal = (
    <>
      <h4 className="scs__form__section-title">{SECTION_HEADING}</h4>
      {errorBanner}
      {formFields}

      <div className="scaler-search__actions form-actions">
        <Button
          type="submit"
          onMouseDown={preventFocusScroll}
          onClick={(e) => {
            e.preventDefault();
            doSearch();
          }}
          renderIcon={SearchIcon}
          disabled={mutation.isPending || checkScaleLookup.isPending}
        >
          Search
        </Button>

        <Button
          type="button"
          kind="secondary"
          onMouseDown={preventFocusScroll}
          onClick={handleReset}
          renderIcon={ResetIcon}
          disabled={mutation.isPending || checkScaleLookup.isPending}
        >
          Reset
        </Button>
      </div>
    </>
  );

  const formInnerPage = (
    <>
      {errorBanner}
      <Accordion className="scs-query-accordion">
        <AccordionItem
          title={<h4 style={{ margin: 0 }}>{SECTION_HEADING}</h4>}
          open={searchMode === 'parameters'}
          onHeadingClick={() => setSearchMode('parameters')}
        >
          {formFields}
        </AccordionItem>

        <PermissionGate permission={PERMISSIONS.CHECK_SCALE_QUERY}>
          <AccordionItem
            title={<h4 style={{ margin: 0 }}>OR enter check scale #</h4>}
            open={searchMode === 'checkScale'}
            onHeadingClick={() => setSearchMode('checkScale')}
          >
            <Grid className="scs__form__grid">
              <Column lg={8} md={8} sm={4}>
                <TextInput
                  id="checkScaleIdDisplay"
                  name="checkScaleIdDisplay"
                  labelText="Check Scale #"
                  value={formData.checkScaleIdDisplay}
                  onChange={handleElementChange}
                  maxLength={15}
                  invalid={Boolean(checkScaleError)}
                  invalidText={checkScaleError ?? undefined}
                  readOnly={checkScaleLookup.isPending}
                />
              </Column>
            </Grid>
          </AccordionItem>
        </PermissionGate>
      </Accordion>

      <div className="scaler-search__actions form-actions">
        <Button
          type="submit"
          onMouseDown={preventFocusScroll}
          onClick={(e) => {
            e.preventDefault();
            doSearch();
          }}
          renderIcon={SearchIcon}
          disabled={mutation.isPending || checkScaleLookup.isPending}
        >
          Search
        </Button>

        <Button
          type="button"
          kind="secondary"
          onMouseDown={preventFocusScroll}
          onClick={handleReset}
          renderIcon={ResetIcon}
          disabled={mutation.isPending || checkScaleLookup.isPending}
        >
          Reset
        </Button>
      </div>
    </>
  );

  return (
    <Grid className="scaler-search-page">
      <Column lg={16} md={8} sm={4}>
        {isModal ? (
          <>
            {!hidePageTitle ? <PageTitle title="Queries - Scalers" noGutter useColumn={false} /> : null}
            <div className="scaler-search-form scs__form" role="form">{formInnerModal}</div>
          </>
        ) : (
          <>
            <PageTitle
              title="Queries - Scalers"
              breadCrumbs={[{ name: 'Scalers' }]}
              noGutter={false}
            />
            <Form onSubmit={handleSubmit} className="scaler-search-form scs__form">{formInnerPage}</Form>
          </>
        )}
      </Column>
      <Column lg={16} md={8} sm={4} className="scaler-search-results">
        <TableResource
          headers={headersWithRender}
          content={results}
          loading={mutation.isPending || (hasSearched && !lastData && !mutation.isError)}
          error={mutation.isError}
          onPageChange={({ page, pageSize }) => {
            setPage(page - 1);
            setPageSize(pageSize);
          }}
        />
        {!isModal && hasSearched && !mutation.isPending && !mutation.isError && lastData !== undefined ? (
          <PermissionGate permission={PERMISSIONS.SCALER_CREATE}>
            <Button
              type="button"
              kind="primary"
              onClick={() => navigate('/scalers/create')}
              style={{ marginTop: '16px' }}
            >
              Create Scaler
            </Button>
          </PermissionGate>
        ) : null}
      </Column>
    </Grid>
  );
};

export { ScalerSearch };
export default ScalerSearch;
