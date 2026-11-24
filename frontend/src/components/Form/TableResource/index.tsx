import {
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';

import EmptySection from '@/components/core/EmptySection';
import './index.scss';

import { type TableHeaderType, type PageableResponse, renderCell } from './types';

/**
 * Pagination parameters for page change events.
 * @typedef {Object} PaginationParams
 * @property {number} page - The current page number (zero-based).
 * @property {number} pageSize - The number of items per page.
 */
type PaginationParams = {
  page: number;
  pageSize: number;
};

/**
 * Props for the TableResource component.
 *
 * @template T
 * @property {TableHeaderType<T>[]} headers - Array of column definitions, including custom renderers and selection flags.
 * @property {PageableResponse<T>} content - Paginated data to display in the table.
 * @property {boolean} loading - Whether the table is in a loading state.
 * @property {boolean} error - Whether an error occurred while fetching data.
 * @property {boolean} [displayRange] - If true, shows the item range in the pagination component.
 * @property {(params: PaginationParams) => void} [onPageChange] - Callback for handling page changes.
 */
type TableResourceProps<T> = {
  headers: TableHeaderType<T, keyof T>[];
  content: PageableResponse<T>;
  loading: boolean;
  error: boolean;
  displayRange?: boolean;
  hideHeader?: boolean;
  onPageChange?: (params: PaginationParams) => void;
  // Optional row click handler. If provided, rows will be clickable and invoke this with the row data.
  rowOnClick?: (row: T & { id: string | number }) => void;
  // If true, render an empty table (headers + no rows) instead of the empty "No results" state when there are zero results.
  showEmptyTableWhenNoResults?: boolean;
  // Optional sort props
  sortKey?: string | null;
  sortDirection?: 'ASC' | 'DESC' | 'NONE';
  onSortChange?: (key: string) => void;
};

/**
 * TableResource is a generic, reusable table for displaying paginated data with optional loading, error, and empty states.
 * It supports custom column rendering and integrates with Carbon's DataTable and Pagination components.
 *
 * @template T
 * @param {TableResourceProps<T>} props - The props for the component.
 * @returns {JSX.Element} The rendered TableResource component.
 */
const TableResource = <T,>({
  headers,
  content,
  loading,
  error,
  displayRange,
  hideHeader = false,
  onPageChange,
  rowOnClick,
  showEmptyTableWhenNoResults = false,
  sortKey = null,
  sortDirection = 'NONE',
  onSortChange,
}: TableResourceProps<T>) => {
  const totalResults = content?.page?.totalElements ?? 0;

  if (loading)
    {return (
      <div className="table-resource">
        {totalResults > 0 && <div className="table-resource__total">Result List: {totalResults} records</div>}
        <DataTableSkeleton
          className="default-table-skeleton"
          aria-label="loading table data"
          compact={true}
          headers={headers
            .filter((header) => header.selected)
            .map((header) => header as { header: string })}
          rowCount={content.page?.size ?? 10}
          showToolbar={false}
          showHeader={false}
          zebra={true}
        />
      </div>
    );}

  if (!content || !content.content)
    {return (
      <div className="table-resource">
        <EmptySection
          className="initial-empty-section"
          pictogram="Summit"
          title={error ? 'Something went wrong!' : 'Nothing to show yet!'}
          description={
            error
              ? 'Error occured while searching for results.'
              : 'Enter at least one criteria to start the search. The list will display here.'
          }
        />
      </div>
    );}

  if (content?.page?.totalElements === 0 && !showEmptyTableWhenNoResults) {
    return (
      <div className="table-resource">
        <EmptySection
          className="table-empty-section"
          pictogram="UserSearch"
          title="No results"
          description="Consider adjusting your search term(s) and try again."
        />
      </div>
    );
  }

  const itemRangeText = (min: number, max: number, total: number) =>
    `${min}-${max} of ${total} items`;

  const noItemRangeText = () => '';

  return (
    <div className="table-resource">
      <div className="table-resource__total">Result List: {totalResults} records</div>
      <Table size="sm" useZebraStyles>
        {hideHeader ? null : (
          <TableHead>
            <TableRow>
              {headers
                .filter((header) => header.selected)
                .map((header) => {
                  const keyStr = String(header.key);
                  const isSortable = Boolean(header.sortable && typeof onSortChange === 'function');
                  const isActive = sortKey === keyStr;
                  return (
                    <TableHeader key={`header-${keyStr}`} className={`table-resource__header-${keyStr}`}>
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => onSortChange?.(keyStr)}
                          className="table-resource__header-button"
                          title={`Sort by ${header.header}`}
                          style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', font: 'inherit', display: 'inline-flex', alignItems: 'baseline', position: 'relative' }}
                        >
                          <span>{header.header}</span>
                          {/* Always show a sort cue on sortable columns (legacy parity: every sortable
                              header carried a visible arrow) — dimmed neutral when inactive, solid +
                              directional when this is the active sort column. The glyph is drawn by a
                              CSS ::after so it stays out of the header's text content and accessible
                              name (see index.scss). */}
                          <span
                            className="table-resource__sort-indicator"
                            data-direction={isActive ? sortDirection : 'NONE'}
                            aria-hidden="true"
                          />
                        </button>
                      ) : (
                        <span>{header.header}</span>
                      )}
                    </TableHeader>
                  );
                })}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {content.content.map((row) => (
            <TableRow
              key={row.id}
              onClick={rowOnClick ? () => rowOnClick(row) : undefined}
              className={rowOnClick ? 'table-resource__row--clickable' : undefined}
              tabIndex={rowOnClick ? 0 : undefined}
              onKeyDown={
                rowOnClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        rowOnClick(row);
                      }
                    }
                  : undefined
              }
            >
              {headers
                .filter((header) => header.selected)
                .map((header) => (
                  <TableCell key={`cell-${row.id}-${String(header.key)}`} className={`table-resource__cell-${String(header.key)}`}>
                    <div className={`table-resource__cell-content table-resource__cell-content--${String(header.key)}`}>
                      {renderCell(row, header)}
                    </div>
                  </TableCell>
                ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {onPageChange && (
        <Pagination
          page={content.page.number + 1}
          pageSize={content.page.size}
          pageSizes={[10, 25, 50]}
          totalItems={content.page.totalElements}
          onChange={onPageChange}
          itemRangeText={displayRange ? itemRangeText : noItemRangeText}
        />
      )}
    </div>
  );
};

export default TableResource;
