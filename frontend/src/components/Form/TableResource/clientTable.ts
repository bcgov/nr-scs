import { useMemo, useState } from 'react';

import type { PageableResponse, SortDirectionType } from './types';

/**
 * The column a table sorts by before the user touches a header. Supplying one replaces the
 * "unsorted" resting state, so the direction is always a real one ('ASC' or 'DESC').
 */
export interface ClientTableDefaultSort<T> {
  key: keyof T & string;
  direction: Exclude<SortDirectionType, 'NONE'>;
}

/**
 * Client-side header sorting for the record-view list tables. Cycles a column ASC → DESC → NONE;
 * NONE preserves the backend's incoming order. Columns in `numericKeys` compare numerically, the
 * rest as case-insensitive text, with nulls sorted last. Pass a stable (module-level) `numericKeys`
 * Set so the memo isn't invalidated each render.
 *
 * Pass `defaultSort` for a table that must open already sorted (e.g. the risk-assessment tabs, newest
 * assessment id first). It also removes the NONE step from the cycle: with a default sort the table has
 * no unsorted resting state to return to, so the sorted column just toggles ASC ↔ DESC and a different
 * column starts at ASC. Without one the three-state cycle is unchanged.
 */
export function useClientTableSort<T>(
  rows: T[],
  numericKeys: Set<keyof T>,
  defaultSort?: ClientTableDefaultSort<T>,
) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirectionType>(
    defaultSort?.direction ?? 'NONE',
  );

  const onSortChange = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection('ASC');
      return;
    }
    if (defaultSort) {
      // No unsorted state to cycle back to (the default sort IS the resting order), so clicking the
      // sorted column flips it rather than dropping to an order the user can't tell apart.
      setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
      return;
    }
    if (sortDirection === 'ASC') {
      setSortDirection('DESC');
      return;
    }
    setSortDirection('NONE');
    setSortKey(null);
  };

  const sortedRows = useMemo(() => {
    const out = [...rows];
    if (!sortKey || sortDirection === 'NONE') {
      return out;
    }

    const key = sortKey as keyof T;
    const direction = sortDirection === 'ASC' ? 1 : -1;
    out.sort((a, b) => {
      const valueA = a[key];
      const valueB = b[key];
      if (valueA == null && valueB == null) {
        return 0;
      }
      if (valueA == null) {
        return 1;
      }
      if (valueB == null) {
        return -1;
      }
      if (numericKeys.has(key)) {
        return (Number(valueA) - Number(valueB)) * direction;
      }
      const textA = String(valueA).toUpperCase();
      const textB = String(valueB).toUpperCase();
      if (textA < textB) {
        return -direction;
      }
      if (textA > textB) {
        return direction;
      }
      return 0;
    });
    return out;
  }, [rows, sortKey, sortDirection, numericKeys]);

  return { sortedRows, sortKey, sortDirection, onSortChange };
}

/** Wraps already-sorted rows in the single-page {@link PageableResponse} shape TableResource expects. */
export function toPageableContent<T>(
  rows: T[],
  getId: (row: T, index: number) => string | number,
): PageableResponse<T> {
  return {
    content: rows.map((row, index) => ({ ...row, id: getId(row, index) })),
    page: {
      size: rows.length,
      number: 0,
      totalElements: rows.length,
      totalPages: 1,
    },
  } as PageableResponse<T>;
}
