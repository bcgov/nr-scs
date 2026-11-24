import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStatusFilter } from './useStatusFilter';

type Row = { id: number; status: string | null };

const rows: Row[] = [
  { id: 1, status: 'Active' },
  { id: 2, status: 'Expired' },
  { id: 3, status: 'Active' },
  { id: 4, status: 'Cancelled' },
  { id: 5, status: null },
];

describe('useStatusFilter', () => {
  it('defaults to "All" and returns every row unfiltered', () => {
    const { result } = renderHook(() => useStatusFilter(rows));

    expect(result.current.status).toBe('All');
    expect(result.current.filtered).toBe(rows); // same reference — no filtering applied
  });

  it('filters to only rows matching the selected status', () => {
    const { result } = renderHook(() => useStatusFilter(rows));

    act(() => result.current.setStatus('Active'));
    expect(result.current.filtered.map((r) => r.id)).toEqual([1, 3]);

    act(() => result.current.setStatus('Cancelled'));
    expect(result.current.filtered.map((r) => r.id)).toEqual([4]);

    act(() => result.current.setStatus('Expired'));
    expect(result.current.filtered.map((r) => r.id)).toEqual([2]);
  });

  it('excludes null-status rows when a specific status is selected', () => {
    const { result } = renderHook(() => useStatusFilter(rows));

    act(() => result.current.setStatus('Active'));
    expect(result.current.filtered.some((r) => r.status === null)).toBe(false);
  });
});
