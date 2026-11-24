import { Search as SearchIcon, Reset as ResetIcon } from '@carbon/icons-react';
import {
  Accordion,
  AccordionItem,
  Column,
  Form,
  Grid,
  InlineNotification,
  TextInput,
} from '@carbon/react';
import { useMutation } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import TableResource from '@/components/Form/TableResource';
import Button from '@/components/core/Button';
import { type PageableResponse, type TableHeaderType } from '@/components/Form/TableResource/types';
import ClientLocSearch from '@/components/core/ClientLocSearch';
import PageTitle from '@/components/core/PageTitle';
import SortOptions from '@/components/core/SortOptions';
import { useActiveClient } from '@/context/activeClient/useActiveClient';
import { useAuth } from '@/context/auth/useAuth';
import usePersistentState from '@/hooks/usePersistentState';
import API from '@/services/APIs';
import { type Client, type ClientSearchParams } from '@/services/clients.service';
import { extractApiError } from '@/utils/extractApiError';

import './index.scss';

import { toPagedResponse } from '@/utils/toPagedResponse';
interface FormData {
  clientNumber: string;
  clientLocnCode: string;
  companyName: string;
  lastName: string;
  firstName: string;
  primarySort: number;
  secondarySort: number;
}

type SortOption = {
  label: string;
  value: string;
};

type ClientRow = Client & { id: string };

const EMPTY_RESPONSE: PageableResponse<ClientRow> = {
  content: [],
  page: {
    size: 10,
    number: 0,
    totalElements: 0,
    totalPages: 1,
  },
};

const TABLE_HEADERS: TableHeaderType<ClientRow>[] = [
  { key: 'client', header: 'Client (Client / Loc)', selected: true },
  { key: 'companyName', header: 'Company Name', selected: true },
  { key: 'lastName', header: 'Last Name', selected: true },
  { key: 'firstName', header: 'First Name', selected: true },
  { key: 'city', header: 'City', selected: true },
  { key: 'businessPhone', header: 'Business Phone #', selected: true },
  { key: 'cellPhone', header: 'Cell Phone #', selected: true },
  { key: 'emailAddress', header: 'Email Address', selected: true },
  { key: 'clientNumber', header: 'Client #', selected: false },
  { key: 'clientLocnCode', header: 'Loc', selected: false },
  { key: 'id', header: 'ID', selected: false },
];

type ClientSearchPageProps = {
  // When true, this page is rendered in a modal; infer modal-specific UI like no breadcrumbs and no gutters.
  modalMode?: boolean;
  onClientSelect?: (client: Client) => void;
  hidePageTitle?: boolean;
};

const ClientSearchPage: React.FC<ClientSearchPageProps> = ({ modalMode, onClientSelect, hidePageTitle = false }) => {
  const { userToken, user } = useAuth();

  const isClientRestricted = user?.isClientRestricted ?? false;
  const { activeClient: restrictedClient } = useActiveClient();

  // Persist list state across navigation only for the standalone route, never for the modal picker.
  const isModal = Boolean(modalMode);
  const persist = !isModal;

  const [formData, setFormData] = usePersistentState<FormData>(
    'clientQuery.formData',
    {
      clientNumber: '',
      clientLocnCode: '',
      companyName: '',
      lastName: '',
      firstName: '',
      primarySort: 1,
      secondarySort: 0,
    },
    persist,
  );

  const [hasSearched, setHasSearched] = usePersistentState('clientQuery.hasSearched', false, persist);
  // Cache the submitted search params (not the result rows) so returning to the page re-fetches
  // fresh data — any create/edit/delete done elsewhere is reflected instead of a stale cached list.
  const [lastSearchParams, setLastSearchParams] = usePersistentState<ClientSearchParams | undefined>(
    'clientQuery.lastSearchParams',
    undefined,
    persist,
  );
  // Result rows are ephemeral: re-fetched on mount from the cached params, never persisted.
  const [lastData, setLastData] = useState<Client[] | undefined>(undefined);

  const [page, setPage] = usePersistentState('clientQuery.page', 0, persist);
  const [pageSize, setPageSize] = usePersistentState('clientQuery.pageSize', 10, persist);
  // Filter-section open/closed for the full-page view. Intentionally NOT persisted: a transient
  // view preference, defaulting to open on every mount (matches Scalers / Scale Sites / RSK pages).
  const [filtersOpen, setFiltersOpen] = useState(true);

  const sortOptions: SortOption[] = useMemo(
    () => [
      { label: 'Client', value: '1' },
      { label: 'Company Name', value: '2' },
      { label: 'Last Name', value: '3' },
      { label: 'First Name', value: '4' },
    ],
    [],
  );

  const mutation = useMutation({
    mutationFn: async (params: ClientSearchParams) => {
      const token = await userToken();
      return API.client.searchClients(params, token);
    },
    onSuccess: (data) => {
      setLastData(data);
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

  useEffect(() => {
    if (isClientRestricted && restrictedClient && formData.clientNumber !== restrictedClient) {
      setFormData((prev) => ({ ...prev, clientNumber: restrictedClient }));
    }
  }, [isClientRestricted, restrictedClient, formData.clientNumber, setFormData]);

  const results: PageableResponse<ClientRow> = useMemo(() => {
    // A failed search clears the table: the previous run's rows are dropped so they can't be read as
    // the (failed) query's results, and TableResource falls to its error state while the banner
    // carries the specific reason.
    if (mutation.isError) {
      return {} as PageableResponse<ClientRow>;
    }
    const data = lastData;
    if (!data) {
      return hasSearched ? EMPTY_RESPONSE : ({} as PageableResponse<ClientRow>);
    }

    const mapped: ClientRow[] = data.map((c, idx) => {
      const id =
        c.client ??
        (c.clientNumber || c.clientLocnCode
          ? `${c.clientNumber ?? ''}/${c.clientLocnCode ?? ''}`
          : String(idx));
      return { ...c, id };
    });

    return toPagedResponse(mapped, page, pageSize);
  }, [lastData, hasSearched, page, pageSize, mutation.isError]);

  // Surface a failed search as an error banner. Without this, an errored request left the prior
  // successful results on screen unchanged — the stale-results-instead-of-error bug: `mutation.error`
  // was never rendered, and TableResource only shows its error state when it has no content to fall
  // back to, so the previous run's rows kept showing.
  const serverError = useMemo(() => {
    if (!mutation.isError) {
      return null;
    }
    return extractApiError(mutation.error, 'An error occurred while searching. Please try again.');
  }, [mutation.isError, mutation.error]);

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

  const handleModalClientSelect = useCallback((e: React.MouseEvent<HTMLButtonElement>, client: Client) => {
    stopModalSelectEvent(e);

    const nativeEvent = e.nativeEvent as Event & {
      stopImmediatePropagation?: () => void;
    };
    nativeEvent.stopImmediatePropagation?.();

    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur?.();

    onClientSelect?.(client);
  }, [onClientSelect, stopModalSelectEvent]);

  const renderClientCell = useCallback((value: unknown, row?: ClientRow) => {
    const fallbackDisplay = `${row?.clientNumber ?? ''}/${row?.clientLocnCode ?? ''}`;
    const display = typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : fallbackDisplay;

    if (isModal && onClientSelect && row) {
      return (
        <button
          type="button"
          onPointerDown={stopModalSelectEvent}
          onMouseDown={stopModalSelectEvent}
          onTouchStart={stopModalSelectEvent}
          onClick={(e) => handleModalClientSelect(e, row)}
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

    return display;
  }, [handleModalClientSelect, isModal, onClientSelect, stopModalSelectEvent]);

  // Create headers here so we can inject renderers when used in modal mode.
  const headersWithRender: TableHeaderType<ClientRow>[] = useMemo(() => {
    return TABLE_HEADERS.map((h) => {
      if (h.key === 'client') {
        return {
          ...h,
          renderAs: renderClientCell,
        };
      }
      return h;
    });
  }, [renderClientCell]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const doSearch = () => {
    setHasSearched(true);
    setPage(0);

    const params: ClientSearchParams = {
      clientNumber: formData.clientNumber || undefined,
      clientLocnCode: formData.clientLocnCode || undefined,
      companyName: formData.companyName || undefined,
      lastName: formData.lastName || undefined,
      firstName: formData.firstName || undefined,
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
    setFormData({
      clientNumber: isClientRestricted && restrictedClient ? restrictedClient : '',
      clientLocnCode: '',
      companyName: '',
      lastName: '',
      firstName: '',
      primarySort: 1,
      secondarySort: 0,
    });
    setHasSearched(false);
    setLastSearchParams(undefined);
    setLastData(undefined);
    setPage(0);
    setPageSize(10);
    setFiltersOpen(true);
    mutation.reset();
  };

  const formFields = (
    <>
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4} className="client-search__client-loc">
          <ClientLocSearch
            labelText="Client (Client / Loc)"
            client={formData.clientNumber}
            loc={formData.clientLocnCode}
            onClientChange={(value) => setFormData((prev) => ({ ...prev, clientNumber: value ?? '' }))}
            onLocChange={(value) => setFormData((prev) => ({ ...prev, clientLocnCode: value ?? '' }))}
            showSearchButton={false}
            clientId="clientNumber"
            locId="clientLocnCode"
            clientReadOnly={isClientRestricted}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput id="companyName" name="companyName" labelText="Company Name" value={formData.companyName} onChange={handleInputChange} placeholder="e.g., ABC Logging" />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput id="lastName" name="lastName" labelText="Last Name" value={formData.lastName} onChange={handleInputChange} placeholder="e.g., Smith" />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput id="firstName" name="firstName" labelText="First Name" value={formData.firstName} onChange={handleInputChange} placeholder="e.g., John" />
        </Column>
      </Grid>

      <div className="scs__form__divider" />

      <SortOptions layout="form" showHeading options={sortOptions} primarySort={String(formData.primarySort)} onPrimarySortChange={(value) => setFormData((prev) => ({ ...prev, primarySort: Number(value) }))} secondarySort={String(formData.secondarySort)} onSecondarySortChange={(value) => setFormData((prev) => ({ ...prev, secondarySort: Number(value) }))} />
    </>
  );

  const actions = (
    <div className="form-actions">
      <Button type="submit" onMouseDown={preventFocusScroll} onClick={(e) => {
        e.preventDefault();
        doSearch();
      }} renderIcon={SearchIcon} disabled={mutation.isPending}>Search</Button>
      <Button type="button" kind="secondary" onMouseDown={preventFocusScroll} onClick={handleReset} renderIcon={ResetIcon} disabled={mutation.isPending}>Reset</Button>
    </div>
  );

  // Modal picker keeps the flat, always-visible filter block (an accordion inside the small
  // picker modal would be awkward). The full-page view gets the collapsible section for
  // consistency with the other query pages.
  const errorBanner = serverError ? (
    <InlineNotification
      kind="error"
      lowContrast
      title="Search failed"
      subtitle={serverError}
      onCloseButtonClick={() => mutation.reset()}
      className="client-search__notification"
    />
  ) : null;

  const formInnerModal = (
    <>
      <h4 className="scs__form__section-title ">Choose your search parameters.</h4>
      {errorBanner}
      {formFields}
      {actions}
    </>
  );

  const formInnerPage = (
    <>
      {errorBanner}
      <Accordion className="scs-query-accordion">
        <AccordionItem
          title={<h4 style={{ margin: 0 }}>Choose your search parameters.</h4>}
          open={filtersOpen}
          onHeadingClick={() => setFiltersOpen((prev) => !prev)}
        >
          {formFields}
        </AccordionItem>
      </Accordion>
      {actions}
    </>
  );

  return (
    <Grid className="client-search-page">
      <Column lg={16} md={8} sm={4}>
        {isModal ? (
          <>
            {!hidePageTitle ? <PageTitle title="Queries - Client" noGutter useColumn={false} /> : null}
            <div className="client-search-form scs__form" role="form">{formInnerModal}</div>
          </>
        ) : (
          <>
            <PageTitle title="Queries - Client" breadCrumbs={[{ name: 'Client' }]} noGutter={false} />
            <Form onSubmit={handleSubmit} className="client-search-form scs__form">{formInnerPage}</Form>
          </>
        )}
      </Column>
      <Column lg={16} md={8} sm={4} className="client-search-results">
        <TableResource headers={headersWithRender} content={results} loading={mutation.isPending || (hasSearched && !lastData && !mutation.isError)} error={mutation.isError} onPageChange={({ page, pageSize }) => {
          setPage(page - 1);
          setPageSize(pageSize);
        }} />
      </Column>
    </Grid>
  );
};

export default ClientSearchPage;
