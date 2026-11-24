import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSortableTable } from './useSortableTable';

type Row = { id: string; code: string | null };

const rows: Row[] = [
  { id: '1', code: 'BRAVO' },
  { id: '2', code: 'alpha' },
  { id: '3', code: 'Charlie' },
];

describe('useSortableTable', () => {
  it('starts unsorted (original order, NONE)', () => {
    const { result } = renderHook(() => useSortableTable(rows));

    expect(result.current.sortKey).toBeNull();
    expect(result.current.sortDirection).toBe('NONE');
    expect(result.current.sortedRows.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('seeds an initial sort (defaulting to ASC) when given one', () => {
    const { result } = renderHook(() => useSortableTable(rows, { key: 'code' }));

    expect(result.current.sortKey).toBe('code');
    expect(result.current.sortDirection).toBe('ASC');
    // Case-insensitive ascending: alpha, BRAVO, Charlie
    expect(result.current.sortedRows.map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  it('cycles the initially-sorted column DESC -> NONE from ASC', () => {
    const { result } = renderHook(() => useSortableTable(rows, { key: 'code' }));

    act(() => result.current.onSortChange('code'));
    expect(result.current.sortDirection).toBe('DESC');

    act(() => result.current.onSortChange('code'));
    expect(result.current.sortKey).toBeNull();
    expect(result.current.sortDirection).toBe('NONE');
    expect(result.current.sortedRows.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('cycles a column ASC -> DESC -> NONE on repeated clicks', () => {
    const { result } = renderHook(() => useSortableTable(rows));

    act(() => result.current.onSortChange('code'));
    expect(result.current.sortDirection).toBe('ASC');
    // Case-insensitive ascending: alpha, BRAVO, Charlie
    expect(result.current.sortedRows.map((r) => r.id)).toEqual(['2', '1', '3']);

    act(() => result.current.onSortChange('code'));
    expect(result.current.sortDirection).toBe('DESC');
    expect(result.current.sortedRows.map((r) => r.id)).toEqual(['3', '1', '2']);

    act(() => result.current.onSortChange('code'));
    expect(result.current.sortKey).toBeNull();
    expect(result.current.sortDirection).toBe('NONE');
    expect(result.current.sortedRows.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('switching to a new column resets to ASC', () => {
    const { result } = renderHook(() => useSortableTable(rows));

    act(() => result.current.onSortChange('code'));
    act(() => result.current.onSortChange('id'));

    expect(result.current.sortKey).toBe('id');
    expect(result.current.sortDirection).toBe('ASC');
  });

  it('sorts numeric columns numerically, not lexicographically', () => {
    const numeric = [
      { id: 'a', sortOrderNo: 5 },
      { id: 'b', sortOrderNo: 100 },
      { id: 'c', sortOrderNo: 20 },
      { id: 'd', sortOrderNo: 10 },
    ];
    const { result } = renderHook(() => useSortableTable(numeric));

    act(() => result.current.onSortChange('sortOrderNo'));
    expect(result.current.sortedRows.map((r) => r.sortOrderNo)).toEqual([5, 10, 20, 100]);

    act(() => result.current.onSortChange('sortOrderNo'));
    expect(result.current.sortedRows.map((r) => r.sortOrderNo)).toEqual([100, 20, 10, 5]);
  });

  it('sorts fully-numeric string columns numerically too', () => {
    const rowsStr = [
      { id: '1', typeId: '7' },
      { id: '2', typeId: '10' },
      { id: '3', typeId: '2' },
    ];
    const { result } = renderHook(() => useSortableTable(rowsStr));
    act(() => result.current.onSortChange('typeId'));
    expect(result.current.sortedRows.map((r) => r.typeId)).toEqual(['2', '7', '10']);
  });

  it('pushes null/undefined values to the end in both directions', () => {
    const withBlank: Row[] = [
      { id: '1', code: null },
      { id: '2', code: 'alpha' },
      { id: '3', code: 'beta' },
    ];
    const { result } = renderHook(() => useSortableTable(withBlank));

    act(() => result.current.onSortChange('code'));
    expect(result.current.sortedRows.map((r) => r.id)).toEqual(['2', '3', '1']);

    act(() => result.current.onSortChange('code'));
    expect(result.current.sortedRows.map((r) => r.id)).toEqual(['3', '2', '1']);
  });
});
