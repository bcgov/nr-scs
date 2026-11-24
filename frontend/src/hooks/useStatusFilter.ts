import { useMemo, useState } from 'react';

/** Legacy authorization-list status filter values (All / Active / Cancelled / Expired). */
export const STATUS_FILTER_OPTIONS = ['All', 'Active', 'Cancelled', 'Expired'] as const;
export type StatusFilterValue = (typeof STATUS_FILTER_OPTIONS)[number];

/**
 * Tracks the selected status and returns the rows filtered by it ("All" applies no filter).
 * Pairs with the `StatusFilterSelect` control; each tab supplies its own row type.
 */
export function useStatusFilter<T extends { status?: string | null }>(rows: T[]) {
  const [status, setStatus] = useState<StatusFilterValue>('All');
  const filtered = useMemo(
    () => (status === 'All' ? rows : rows.filter((row) => row.status === status)),
    [rows, status],
  );
  return { status, setStatus, filtered };
}
