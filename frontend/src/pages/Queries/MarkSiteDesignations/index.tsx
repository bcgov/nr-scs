import { Search as SearchIcon, Reset as ResetIcon } from '@carbon/icons-react';
import { Column, Form, Grid, InlineNotification, TextInput } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from 'react';

import PermissionLink from '@/components/core/PermissionLink';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import TableResource from '@/components/Form/TableResource';
import { type PageableResponse, type TableHeaderType } from '@/components/Form/TableResource/types';
import PageTitle from '@/components/core/PageTitle';
import { useAuth } from '@/context/auth/useAuth';
import usePersistentState from '@/hooks/usePersistentState';
import API from '@/services/APIs';
import { type MarkSiteDesignationSearchResult } from '@/services/markSiteDesignation.service';
import { requiredLabel } from '@/utils/requiredLabel';
import { toPagedResponse } from '@/utils/toPagedResponse';

import './index.scss';

interface MarkSiteDesignationFormData {
  timberMark: string;
}

type ValidationErrors = {
  timberMark?: string;
};

type MarkSiteDesignationRow = MarkSiteDesignationSearchResult & { id: string };

const EMPTY_RESPONSE: PageableResponse<MarkSiteDesignationRow> = {
  content: [],
  page: {
    size: 10,
    number: 0,
    totalElements: 0,
    totalPages: 1,
  },
};

const TABLE_HEADERS: TableHeaderType<MarkSiteDesignationRow>[] = [
  {
    key: 'haulingMarkAuthorizationId',
    header: 'MSD #',
    selected: true,
    renderAs: (value) => (
      value == null ? '' : (
        <PermissionLink
          permission={PERMISSIONS.MSD_READ}
          to={`/mark-site-designations/view?haulingMarkAuthorizationId=${encodeURIComponent(String(value))}`}
          title="Mark Site Designation"
        >
          {String(value)}
        </PermissionLink>
      )
    ),
  },
  { key: 'timberMark', header: 'Timber Mark', selected: true },
  { key: 'effectiveDate', header: 'Effective Date', selected: true },
  { key: 'expiryDate', header: 'Expiry Date', selected: true },
  { key: 'orgUnitName', header: 'Designated District', selected: true },
  { key: 'id', header: 'ID', selected: false },
];

/**
 * Returns a validation message when a timber mark contains SQL-LIKE wildcards, else undefined.
 * The backend supports LIKE matching, but this query page disallows wildcards — enforced for both
 * the form and the `?timberMark=` URL path so a hand-crafted URL can't trigger a wildcard search.
 */
function timberMarkWildcardError(value: string): string | undefined {
  if (value.includes('%')) {
    return 'Timber Mark can’t contain the % character.';
  }
  if (value.includes('_')) {
    return 'Timber Mark can’t contain the _ character.';
  }
  return undefined;
}

const MarkSiteDesignationSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // The search is driven entirely by the `timberMark` URL param, so navigating here with a
  // ?timberMark=... query (the MSD tab links) and searching from the form take the identical path.
  const timberMarkParam = useMemo(
    () => (searchParams.get('timberMark') ?? '').trim().toUpperCase(),
    [searchParams],
  );
  // Only search a URL-supplied mark if it passes the same wildcard guard the form enforces.
  const paramWildcardError = timberMarkParam ? timberMarkWildcardError(timberMarkParam) : undefined;
  const hasSearched = Boolean(timberMarkParam) && !paramWildcardError;

  const [formData, setFormData] = useState<MarkSiteDesignationFormData>({
    timberMark: timberMarkParam,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Remember the last searched timber mark so the result list is restored when the user returns
  // here after navigating to an MSD detail page (which drops the `?timberMark=` query param).
  const [persistedMark, setPersistedMark] = usePersistentState<string>('markSiteDesignationQuery.timberMark', '');

  // Zero-based page index + page size, persisted so paging survives a trip to an MSD detail page.
  const [page, setPage] = usePersistentState<number>('markSiteDesignationQuery.page', 0);
  const [pageSize, setPageSize] = usePersistentState<number>('markSiteDesignationQuery.pageSize', 10);

  // On first mount, if we arrived without a URL mark but have a persisted one, restore it to the
  // URL so the existing param-driven query re-runs. Mount-only: never override an explicit URL mark.
  useEffect(() => {
    if (!timberMarkParam && persistedMark) {
      setSearchParams({ timberMark: persistedMark }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the persisted value in step with each valid search (and clear it when the mark is cleared).
  useEffect(() => {
    if (hasSearched && timberMarkParam) {
      setPersistedMark(timberMarkParam);
    }
  }, [hasSearched, timberMarkParam, setPersistedMark]);

  // Keep the input in sync with the URL (e.g. when arriving via a link from the MSD tab), and
  // surface the wildcard error if the URL carried an invalid mark.
  useEffect(() => {
    setFormData({ timberMark: timberMarkParam });
    setErrors(paramWildcardError ? { timberMark: paramWildcardError } : {});
  }, [timberMarkParam, paramWildcardError]);

  const hasErrors = useMemo(() => Object.keys(errors).some((k) => Boolean(errors[k as keyof ValidationErrors])), [
    errors,
  ]);

  const searchQuery = useQuery({
    queryKey: ['mark-site-designations-search', timberMarkParam],
    queryFn: async () => {
      const token = await userToken();
      return API.markSiteDesignation.searchMarkSiteDesignationsByTimberMark(timberMarkParam, token);
    },
    enabled: hasSearched,
  });

  const results: PageableResponse<MarkSiteDesignationRow> = useMemo(() => {
    const data = searchQuery.data;
    if (!data) {
      return hasSearched ? EMPTY_RESPONSE : ({} as PageableResponse<MarkSiteDesignationRow>);
    }

    const mapped: MarkSiteDesignationRow[] = data.map((row, idx) => {
      const id = row.haulingMarkAuthorizationId == null ? String(idx) : String(row.haulingMarkAuthorizationId);
      return { ...row, id };
    });

    return toPagedResponse(mapped, page, pageSize);
  }, [searchQuery.data, hasSearched, page, pageSize]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.timberMark || formData.timberMark.trim() === '') {
      newErrors.timberMark = 'Timber Mark is required.';
    } else {
      const wildcardError = timberMarkWildcardError(formData.timberMark);
      if (wildcardError) {
        newErrors.timberMark = wildcardError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      // Keep existing behavior: uppercase matches backend expectations.
      [name]: value.toUpperCase(),
    }));

    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const doSearch = () => {
    if (!validateForm()) {
      return;
    }

    // A new search starts from the first page.
    setPage(0);
    // Push the timber mark into the URL; the query reacts to the param.
    setSearchParams({ timberMark: formData.timberMark });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    doSearch();
  };

  const handleReset = () => {
    setFormData({ timberMark: '' });
    setErrors({});
    setPersistedMark('');
    setPage(0);
    setSearchParams({});
  };

  const serverError = useMemo(() => {
    if (!searchQuery.isError) {
      return null;
    }

    const maybeAxios = searchQuery.error as
      | { response?: { data?: { message?: string; code?: string } }; message?: string }
      | null;
    return (
      maybeAxios?.response?.data?.message ||
      maybeAxios?.response?.data?.code ||
      maybeAxios?.message ||
      'An error occurred while searching. Please try again.'
    );
  }, [searchQuery.isError, searchQuery.error]);

  return (
    <Grid className="mark-site-designation-search-page">
      <PageTitle
        title="Queries - Mark Site Designations"
        breadCrumbs={[{ name: 'Mark Site Designations' }]}
      />

      <Column lg={16} md={8} sm={4}>
        <Form onSubmit={handleSubmit} className="mark-site-designation-search-form scs__form">
          <h4 className="scs__form__section-title client-search-form__section-title">Please enter a timber mark.</h4>
          {serverError ? (
            <InlineNotification
              kind="error"
              lowContrast
              title="Search failed"
              subtitle={serverError}
              className="mark-site-designation-notification"
            />
          ) : null}

          {hasErrors ? (
            <InlineNotification
              kind="error"
              lowContrast
              title="Fix the errors below"
              subtitle="One or more fields are invalid."
              hideCloseButton
              className="mark-site-designation-notification"
            />
          ) : null}

          <Grid className="scs__form__grid">

            <Column lg={8} md={8} sm={4}>
              <TextInput
                id="timberMark"
                name="timberMark"
                labelText={requiredLabel('Timber Mark', 'mark-site-designation-search__required')}
                value={formData.timberMark}
                onChange={handleInputChange}
                maxLength={20}
                required
                invalid={Boolean(errors.timberMark)}
                invalidText={errors.timberMark}
                disabled={searchQuery.isFetching}
              />
            </Column>
          </Grid>
            <div className="scs__form__divider scs__form__divider--actions" />
            <Column lg={16} md={8} sm={4} className="form-actions">
              <Button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  doSearch();
                }}
                renderIcon={SearchIcon}
                disabled={searchQuery.isFetching}
              >
                Search
              </Button>

              <Button
                type="button"
                kind="secondary"
                onClick={handleReset}
                renderIcon={ResetIcon}
                disabled={searchQuery.isFetching}
              >
                Reset
              </Button>
            </Column>
        </Form>
      </Column>
        <Column lg={16} md={8} sm={4} className="mark-site-designation-search-results">
          <TableResource
            headers={TABLE_HEADERS}
            content={results}
            loading={searchQuery.isLoading}
            error={searchQuery.isError}
            onPageChange={({ page, pageSize }) => {
              setPage(page - 1);
              setPageSize(pageSize);
            }}
          />
        </Column>
        {hasSearched ? (
          <PermissionGate permission={PERMISSIONS.MSD_CREATE}>
            <Button
              type="button"
              kind="primary"
              style={{ marginTop: '1rem' }}
              onClick={() => navigate('/mark-site-designations/create')}
            >
              Create MSD
            </Button>
          </PermissionGate>
        ) : null}
    </Grid>
  );
};

export default MarkSiteDesignationSearchPage;
