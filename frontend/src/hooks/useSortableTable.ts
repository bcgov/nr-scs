import { useMemo, useState } from 'react';

import type { SortDirectionType } from '@/components/Form/TableResource/types';

export type UseSortableTableResult<T> = {
  /** Rows sorted by the active column/direction (input order when direction is NONE). */
  sortedRows: T[];
  sortKey: string | null;
  sortDirection: SortDirectionType;
  /** Feed straight into `TableResource`'s `onSortChange`. */
  onSortChange: (key: string) => void;
};

export type UseSortableTableOptions = {
  /** Column key the list is sorted by on first render. */
  key: string;
  /** Direction for that initial sort (defaults to ASC). */
  direction?: Exclude<SortDirectionType, 'NONE'>;
};

/**
 * Client-side, tri-state column sort for a `TableResource`-backed list.
 *
 * Clicking a column cycles ASC → DESC → NONE (NONE clears the sort and restores
 * the original row order). Comparison is null-safe; columns whose cells are all
 * numbers (or fully-numeric strings) sort numerically, everything else sorts
 * case-insensitively as strings (ISO `YYYY-MM-DD` dates order correctly that way).
 *
 * Suited to lists whose full result set is held in memory (e.g. the maintenance
 * pages), where sorting the whole array locally is equivalent to server-side sort.
 *
 * Pass `initialSort` to seed the sort on first render (e.g. Maintain Templates
 * defaults to alphabetical by name, matching legacy). Clicking that same column
 * still cycles ASC → DESC → NONE from there.
 */
export const useSortableTable = <T,>(
  rows: T[],
  initialSort?: UseSortableTableOptions,
): UseSortableTableResult<T> => {
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirectionType>(
    initialSort ? initialSort.direction ?? 'ASC' : 'NONE',
  );

  const onSortChange = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection('ASC');
      return;
    }
    if (sortDirection === 'ASC') {
      setSortDirection('DESC');
      return;
    }
    if (sortDirection === 'DESC') {
      setSortKey(null);
      setSortDirection('NONE');
      return;
    }
    setSortDirection('ASC');
  };

  const sortedRows = useMemo(() => {
    if (!sortKey || sortDirection === 'NONE') {
      return rows;
    }

    const factor = sortDirection === 'ASC' ? 1 : -1;
    // A cell counts as numeric only if it's a real number or a non-blank fully
    // numeric string — so blanks and codes like "WT" or dates fall to string sort.
    const isNumeric = (v: unknown) =>
      typeof v === 'number'
        ? !Number.isNaN(v)
        : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v));

    return [...rows].sort((a, b) => {
      const rawA = (a as Record<string, unknown>)[sortKey];
      const rawB = (b as Record<string, unknown>)[sortKey];

      const aMissing = rawA === null || rawA === undefined;
      const bMissing = rawB === null || rawB === undefined;
      if (aMissing && bMissing) {
        return 0;
      }
      // Push blanks to the end regardless of direction.
      if (aMissing) {
        return 1;
      }
      if (bMissing) {
        return -1;
      }

      if (isNumeric(rawA) && isNumeric(rawB)) {
        const numA = Number(rawA);
        const numB = Number(rawB);
        if (numA < numB) {
          return -1 * factor;
        }
        if (numA > numB) {
          return 1 * factor;
        }
        return 0;
      }

      const valueA = String(rawA).toUpperCase();
      const valueB = String(rawB).toUpperCase();
      if (valueA < valueB) {
        return -1 * factor;
      }
      if (valueA > valueB) {
        return 1 * factor;
      }
      return 0;
    });
  }, [rows, sortKey, sortDirection]);

  return { sortedRows, sortKey, sortDirection, onSortChange };
};
