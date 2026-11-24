import { TableHeader } from '@carbon/react';
import type { FC } from 'react';

import type { SortDirectionType } from '@/components/Form/TableResource/types';

import './index.scss';

type SortableTableHeaderProps = {
  /** Visible column label. */
  label: string;
  /** Field key this column sorts by; passed back to `onSort` and compared against `activeSortKey`. */
  sortKeyName: string;
  /** Currently-sorted key (from `useSortableTable`), or null when unsorted. */
  activeSortKey: string | null;
  /** Active sort direction (from `useSortableTable`). */
  sortDirection: SortDirectionType;
  /** Cycle handler (from `useSortableTable`): ASC → DESC → NONE. */
  onSort: (key: string) => void;
  className?: string;
};

/**
 * Click-sortable header cell for the hand-rolled Carbon `<Table>` record-view tabs, mirroring the
 * sort affordance `TableResource` renders for its config-driven tables. Legacy parity: every column
 * in these lists was click-sortable via `sorttable.js`; this drives the same via `useSortableTable`.
 * Wrap it in a `<TableRow>` inside `<TableHead>` alongside the other `<TableHeader>` cells.
 */
const SortableTableHeader: FC<SortableTableHeaderProps> = ({
  label,
  sortKeyName,
  activeSortKey,
  sortDirection,
  onSort,
  className,
}) => {
  const isActive = activeSortKey === sortKeyName && sortDirection !== 'NONE';
  return (
    <TableHeader className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKeyName)}
        className="scs-sortable-header__button"
        title={`Sort by ${label}`}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          font: 'inherit',
          color: 'inherit',
          display: 'inline-flex',
          alignItems: 'baseline',
          position: 'relative',
        }}
      >
        <span>{label}</span>
        {/* Always show a sort cue (legacy parity: every sortable header carried a visible arrow) —
            dimmed neutral when inactive, solid + directional when active. Drawn by a CSS ::after so
            the glyph stays out of the header's text content and accessible name (see index.scss). */}
        <span
          className="scs-sortable-header__indicator"
          data-direction={isActive ? sortDirection : 'NONE'}
          aria-hidden="true"
        />
      </button>
    </TableHeader>
  );
};

export default SortableTableHeader;
