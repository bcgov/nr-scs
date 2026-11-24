import { Reset as ResetIcon, Search as SearchIcon } from '@carbon/icons-react';
import { Column, Grid, InlineNotification, Modal, TextInput } from '@carbon/react';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FC } from 'react';

import TableResource from '@/components/Form/TableResource';
import { type PageableResponse, type TableHeaderType } from '@/components/Form/TableResource/types';
import Button from '@/components/core/Button';
import ClientLocSearch from '@/components/core/ClientLocSearch';
import SortOptions from '@/components/core/SortOptions';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { ClientContactSearchResult } from '@/services/scaleSiteContacts.types';
import { extractApiError } from '@/utils/extractApiError';

import './ScaleSiteContactForm.scss';

import { toPagedResponse } from '@/utils/toPagedResponse';
import { formatRatio } from '@/utils/formatRatio';
interface Props {
  open: boolean;
  defaultClientNumber: string;
  onClose: () => void;
  onSelect: (clientContactId: number) => void;
}

interface ContactSearchForm {
  clientNumber: string;
  clientLocnCode: string;
  contactName: string;
  primarySort: number;
  secondarySort: number;
}

type SortOption = {
  label: string;
  value: string;
};

type ContactRow = ClientContactSearchResult & { id: string; clientLoc: string };

const DEFAULT_FORM: ContactSearchForm = {
  clientNumber: '',
  clientLocnCode: '',
  contactName: '',
  primarySort: 1,
  secondarySort: 0,
};

const EMPTY_RESPONSE: PageableResponse<ContactRow> = {
  content: [],
  page: {
    size: 10,
    number: 0,
    totalElements: 0,
    totalPages: 1,
  },
};

const TABLE_HEADERS: TableHeaderType<ContactRow>[] = [
  { key: 'clientContactId', header: 'Client Contact Id', selected: true },
  { key: 'contactName', header: 'Name', selected: true },
  { key: 'clientLoc', header: 'Client Number / Loc', selected: true },
  { key: 'businessPhone', header: 'Business Phone #', selected: true },
  { key: 'emailAddress', header: 'Email Address', selected: true },
];

// Client-side sort accessors keyed by the numeric sort codes used in the form.
const sortAccessor: Record<number, (row: ContactRow) => string> = {
  1: (row) => row.clientLoc.toLowerCase(),
  2: (row) => (row.contactName ?? '').toLowerCase(),
};

const ContactSearchModal: FC<Props> = ({ open, defaultClientNumber, onClose, onSelect }) => {
  const { userToken } = useAuth();

  const [formData, setFormData] = useState<ContactSearchForm>(DEFAULT_FORM);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastData, setLastData] = useState<ClientContactSearchResult[] | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const mutation = useMutation({
    mutationFn: async (params: {
      clientNumber?: string;
      clientLocnCode?: string;
      contactName?: string;
    }) => {
      const token = await userToken();
      return API.scaleSiteContacts.searchClientContacts(params, token);
    },
    onSuccess: (data) => {
      setLastData(data);
    },
  });

  const sortOptions: SortOption[] = useMemo(
    () => [
      { label: 'Client', value: '1' },
      { label: 'Name', value: '2' },
    ],
    [],
  );

  // Reset to a clean, owner-prefilled search each time the modal opens.
  useEffect(() => {
    if (open) {
      setFormData({ ...DEFAULT_FORM, clientNumber: defaultClientNumber });
      setHasSearched(false);
      setLastData(undefined);
      setPage(0);
      setPageSize(10);
      mutation.reset();
    }
    // mutation.reset is stable; intentionally only resetting when the modal (re)opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultClientNumber]);

  const results: PageableResponse<ContactRow> = useMemo(() => {
    const data = lastData;
    if (!data) {
      return hasSearched ? EMPTY_RESPONSE : ({} as PageableResponse<ContactRow>);
    }

    const mapped: ContactRow[] = data.map((row, idx) => {
      const clientLoc = formatRatio(row.clientNumber, row.clientLocnCode || null);
      const id = row.clientContactId != null ? String(row.clientContactId) : `${row.contactName ?? 'contact'}-${idx}`;
      return { ...row, id, clientLoc };
    });

    const sorted = [...mapped].sort((a, b) => {
      const primary = sortAccessor[formData.primarySort]?.(a).localeCompare(sortAccessor[formData.primarySort]?.(b) ?? '') ?? 0;
      if (primary !== 0 || !formData.secondarySort) {
        return primary;
      }
      return sortAccessor[formData.secondarySort]?.(a).localeCompare(sortAccessor[formData.secondarySort]?.(b) ?? '') ?? 0;
    });

    return toPagedResponse(sorted, page, pageSize);
  }, [lastData, hasSearched, page, pageSize, formData.primarySort, formData.secondarySort]);

  const handleSelect = useCallback(
    (clientContactId?: number | null) => {
      if (clientContactId != null) {
        onSelect(clientContactId);
        onClose();
      }
    },
    [onSelect, onClose],
  );

  // The Client Contact ID cell acts as the selection control for the row.
  const renderSelectCell = useCallback(
    (value: unknown, row?: ContactRow) => {
      if (row?.clientContactId == null) {
        return '—';
      }
      return (
        <button
          type="button"
          className="scs__contact-search__select-link"
          onClick={() => handleSelect(row.clientContactId)}
        >
          {String(value)}
        </button>
      );
    },
    [handleSelect],
  );

  const headersWithRender: TableHeaderType<ContactRow>[] = useMemo(
    () =>
      TABLE_HEADERS.map((header) =>
        header.key === 'clientContactId' ? { ...header, renderAs: renderSelectCell } : header,
      ),
    [renderSelectCell],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const doSearch = () => {
    setHasSearched(true);
    setPage(0);
    mutation.mutate({
      clientNumber: formData.clientNumber.trim() || undefined,
      clientLocnCode: formData.clientLocnCode.trim() || undefined,
      contactName: formData.contactName.trim() || undefined,
    });
  };

  const handleReset = () => {
    setFormData({ ...DEFAULT_FORM, clientNumber: defaultClientNumber });
    setHasSearched(false);
    setLastData(undefined);
    setPage(0);
    setPageSize(10);
    mutation.reset();
  };

  return (
    <Modal open={open} onRequestClose={onClose} modalHeading="Queries - Business Contact" passiveModal size="lg">
      <div className="scs__form" role="form">
        {mutation.isError ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Search failed."
            subtitle={extractApiError(mutation.error, 'Could not search contacts.')}
            className="scs__notification"
          />
        ) : null}

        <h4 className="scs__form__section-title">Choose your search parameters.</h4>

        <Grid className="scs__form__grid scs__contact-search__params">
          <Column lg={8} md={8} sm={4}>
            <ClientLocSearch
              labelText="Client (Client / Loc)"
              client={formData.clientNumber}
              loc={formData.clientLocnCode}
              onClientChange={(value) => setFormData((prev) => ({ ...prev, clientNumber: value ?? '' }))}
              onLocChange={(value) => setFormData((prev) => ({ ...prev, clientLocnCode: value ?? '' }))}
              showSearchButton={false}
              clientId="contact-search-client-number"
              locId="contact-search-locn-code"
              clientReadOnly
            />
          </Column>
          <Column lg={8} md={8} sm={4}>
            <TextInput
              id="contact-search-name"
              name="contactName"
              labelText="Name"
              maxLength={60}
              value={formData.contactName}
              onChange={handleInputChange}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  doSearch();
                }
              }}
              disabled={mutation.isPending}
            />
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

        <div className="form-actions">
          <Button type="button" onClick={doSearch} renderIcon={SearchIcon} disabled={mutation.isPending}>
            Search
          </Button>
          <Button type="button" kind="secondary" onClick={handleReset} renderIcon={ResetIcon} disabled={mutation.isPending}>
            Reset
          </Button>
        </div>
      </div>

      <TableResource
        headers={headersWithRender}
        content={results}
        loading={mutation.isPending}
        error={mutation.isError}
        onPageChange={({ page: nextPage, pageSize: nextPageSize }) => {
          setPage(nextPage - 1);
          setPageSize(nextPageSize);
        }}
      />
    </Modal>
  );
};

export default ContactSearchModal;
