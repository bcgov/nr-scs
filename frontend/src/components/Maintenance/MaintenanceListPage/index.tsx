import { Column, Grid, InlineNotification } from '@carbon/react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import type { BreadCrumbType } from '@/components/core/PageTitle/types';
import TableResource from '@/components/Form/TableResource';
import type {
  PageableResponse,
  SortDirectionType,
  TableHeaderType,
} from '@/components/Form/TableResource/types';
import PermissionGate from '@/components/PermissionGate';
import type { PERMISSION_TYPE } from '@/context/auth/permissions';

type MaintenanceListPageProps<T> = {
  /** Page heading. */
  title: string;
  breadCrumbs: BreadCrumbType[];
  /** Load-error message for the list (null when there is no error). */
  error?: string | null;
  /** Heading shown above the error message. */
  errorTitle?: string;
  /**
   * Optional page-level banner rendered above the panel — for transient
   * notifications (e.g. a save/delete failure) that should not put the table
   * itself into its error state the way `error` does.
   */
  bannerNotification?: ReactNode;

  headers: TableHeaderType<T, keyof T>[];
  /**
   * The full result set for the list (one page holding every row). The shell
   * paginates it client-side and drives the pager.
   */
  content: PageableResponse<T>;
  loading: boolean;

  sortKey: string | null;
  sortDirection: SortDirectionType;
  onSortChange: (key: string) => void;

  /** Primary "add appointment type" button. */
  addLabel: string;
  onAdd: () => void;
  /**
   * Permission gating the Add button. Optional and **opt-in**: without it the button is
   * unconditional, which is correct while only `SCS_SYS_ADMIN` can open the page (§J is `-` for every
   * other column). Pass it once a role reaches the page holding the read but not the create — see
   * `Maintenance/Questions`, the first such page.
   */
  addPermission?: PERMISSION_TYPE;

  /** Optional filter controls rendered above the table (e.g. a Select). */
  filter?: ReactNode;
  /**
   * Identity of the active filter/result set. When it changes, pagination
   * resets to the first page — needed because two filters can return the same
   * row count, which a count-only reset would miss.
   */
  resetPageKey?: string | number;

  /** Modals (form modal, confirm-delete) rendered after the panel, inside the page Grid. */
  children?: ReactNode;
};

/**
 * Presentational shell for an Administration → Maintenance list page.
 *
 * Renders the shared layout every maintenance page repeated by hand: the page
 * `Grid`, `PageTitle` with breadcrumbs, a load-error notification, and the
 * `.scs__panel` holding an optional filter slot, the sortable `TableResource`,
 * and the primary "add" button. The caller passes the full result set in
 * `content`; the shell paginates it client-side and drives the Carbon pager.
 */
const MaintenanceListPage = <T,>({
  title,
  breadCrumbs,
  error = null,
  errorTitle,
  bannerNotification,
  headers,
  content,
  loading,
  sortKey,
  sortDirection,
  onSortChange,
  addLabel,
  onAdd,
  addPermission,
  filter,
  resetPageKey,
  children,
}: MaintenanceListPageProps<T>) => {
  const allRows = content.content;
  const totalElements = allRows.length;

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Reset to the first page when the row count changes (create/delete) or the
  // active filter changes (`resetPageKey`) — the latter covers two filters that
  // happen to return the same count, which a count-only reset would miss.
  // Re-sorting keeps both stable, so the current page is preserved across sorts.
  useEffect(() => {
    setPageNumber(0);
  }, [totalElements, resetPageKey]);

  const pagedContent = useMemo<PageableResponse<T>>(() => {
    const start = pageNumber * pageSize;
    return {
      content: allRows.slice(start, start + pageSize),
      page: {
        size: pageSize,
        number: pageNumber,
        totalElements,
        totalPages: Math.max(1, Math.ceil(totalElements / pageSize)),
      },
    };
  }, [allRows, pageNumber, pageSize, totalElements]);

  const addButtonControl = (
    <Button kind="primary" className="scs__list-add-btn action-btn" onClick={onAdd}>
      {addLabel}
    </Button>
  );
  /**
   * Gated only when a permission is supplied. `PermissionGate` reads the auth context, so rendering it
   * unconditionally would impose a provider on every caller — including the eight maintenance pages
   * that have not opted in, and their tests. Opt-in all the way down, dependencies included.
   */
  const addButton = addPermission ? (
    <PermissionGate permission={addPermission}>{addButtonControl}</PermissionGate>
  ) : (
    addButtonControl
  );

  return (
    <Grid className="scs__page">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title={title} breadCrumbs={breadCrumbs} />
      </Column>

      {error && (
        <Column lg={16} md={8} sm={4}>
          <InlineNotification
            kind="error"
            lowContrast
            title={errorTitle ?? 'Unable to load records'}
            subtitle={error}
          />
        </Column>
      )}

      {bannerNotification ? <Column lg={16} md={8} sm={4}>{bannerNotification}</Column> : null}

      <Column lg={16} md={8} sm={4}>
        <div className="scs__form">
          <div className="scs__panel">
            {filter ? <div className="scs__list-filter">{filter}</div> : null}

            <div className="scs__list-table">
              <TableResource
                headers={headers}
                content={pagedContent}
                loading={loading}
                error={Boolean(error)}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={onSortChange}
                onPageChange={({ page, pageSize: nextSize }) => {
                  setPageNumber(page - 1);
                  setPageSize(nextSize);
                }}
              />
            </div>

            {addButton}
          </div>
        </div>
      </Column>

      {children}
    </Grid>
  );
};

export default MaintenanceListPage;
