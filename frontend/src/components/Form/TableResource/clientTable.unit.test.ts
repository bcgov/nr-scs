import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { toPageableContent, useClientTableSort } from './clientTable';

type Row = { name: string | null; qty: number | string | null };

const rows: Row[] = [
  { name: 'bravo', qty: '10' },
  { name: null, qty: 2 },
  { name: 'Alpha', qty: null },
  { name: 'charlie', qty: 9 },
];
const NUMERIC = new Set<keyof Row>(['qty']);

const names = (r: Row[]) => r.map((x) => x.name);

describe('useClientTableSort', () => {
  it('keeps the incoming order until a column is chosen', () => {
    const { result } = renderHook(() => useClientTableSort(rows, NUMERIC));

    expect(result.current.sortKey).toBeNull();
    expect(result.current.sortDirection).toBe('NONE');
    expect(names(result.current.sortedRows)).toEqual(['bravo', null, 'Alpha', 'charlie']);
  });

  it('sorts text case-insensitively with nulls last, then flips, then resets', () => {
    const { result } = renderHook(() => useClientTableSort(rows, NUMERIC));

    act(() => result.current.onSortChange('name'));
    expect(result.current.sortDirection).toBe('ASC');
    expect(names(result.current.sortedRows)).toEqual(['Alpha', 'bravo', 'charlie', null]);

    act(() => result.current.onSortChange('name'));
    expect(result.current.sortDirection).toBe('DESC');
    expect(names(result.current.sortedRows)).toEqual(['charlie', 'bravo', 'Alpha', null]);

    act(() => result.current.onSortChange('name'));
    expect(result.current.sortDirection).toBe('NONE');
    expect(result.current.sortKey).toBeNull();
    expect(names(result.current.sortedRows)).toEqual(['bravo', null, 'Alpha', 'charlie']);
  });

  it('compares numeric columns as numbers', () => {
    const { result } = renderHook(() => useClientTableSort(rows, NUMERIC));

    act(() => result.current.onSortChange('qty'));
    expect(result.current.sortedRows.map((x) => x.qty)).toEqual([2, 9, '10', null]);

    act(() => result.current.onSortChange('qty'));
    expect(result.current.sortedRows.map((x) => x.qty)).toEqual(['10', 9, 2, null]);
  });

  it('starts ascending again when a different column is chosen', () => {
    const { result } = renderHook(() => useClientTableSort(rows, NUMERIC));

    act(() => result.current.onSortChange('name'));
    act(() => result.current.onSortChange('name'));
    expect(result.current.sortDirection).toBe('DESC');

    act(() => result.current.onSortChange('qty'));
    expect(result.current.sortKey).toBe('qty');
    expect(result.current.sortDirection).toBe('ASC');
  });

  it('opens on the default sort when one is supplied', () => {
    const { result } = renderHook(() =>
      useClientTableSort(rows, NUMERIC, { key: 'qty', direction: 'DESC' }),
    );

    expect(result.current.sortKey).toBe('qty');
    expect(result.current.sortDirection).toBe('DESC');
    expect(result.current.sortedRows.map((x) => x.qty)).toEqual(['10', 9, 2, null]);
  });

  it('toggles instead of unsorting when a default sort is supplied', () => {
    const { result } = renderHook(() =>
      useClientTableSort(rows, NUMERIC, { key: 'qty', direction: 'DESC' }),
    );

    act(() => result.current.onSortChange('qty'));
    expect(result.current.sortDirection).toBe('ASC');

    // Without a default sort this third state would be NONE; with one there is no unsorted resting
    // order to fall back to, so it flips back instead of clearing the sort.
    act(() => result.current.onSortChange('qty'));
    expect(result.current.sortKey).toBe('qty');
    expect(result.current.sortDirection).toBe('DESC');
  });

  it('still starts another column at ASC when a default sort is supplied', () => {
    const { result } = renderHook(() =>
      useClientTableSort(rows, NUMERIC, { key: 'qty', direction: 'DESC' }),
    );

    act(() => result.current.onSortChange('name'));
    expect(result.current.sortKey).toBe('name');
    expect(result.current.sortDirection).toBe('ASC');
    expect(names(result.current.sortedRows)).toEqual(['Alpha', 'bravo', 'charlie', null]);
  });

  it('treats equal keys as ties', () => {
    const tied: Row[] = [{ name: 'same', qty: 1 }, { name: 'SAME', qty: 1 }];
    const { result } = renderHook(() => useClientTableSort(tied, NUMERIC));

    act(() => result.current.onSortChange('name'));
    expect(names(result.current.sortedRows)).toEqual(['same', 'SAME']);
  });
});

describe('toPageableContent', () => {
  it('wraps the rows as a single page', () => {
    const page = toPageableContent(rows, (_row, index) => `r${index}`);

    expect(page.content).toHaveLength(rows.length);
    expect(page.page.totalElements).toBe(rows.length);
    expect(page.page.totalPages).toBe(1);
    expect(page.page.number).toBe(0);
  });

  it('copes with no rows', () => {
    const page = toPageableContent([] as Row[], () => 'x');

    expect(page.content).toEqual([]);
    expect(page.page.totalElements).toBe(0);
  });
});
