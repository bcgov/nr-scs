import { describe, expect, it } from 'vitest';

import { toPagedResponse } from './toPagedResponse';

const rows = Array.from({ length: 25 }, (_, index) => ({ id: String(index) }));

describe('toPagedResponse', () => {
  it('returns the requested slice with paging metadata', () => {
    const result = toPagedResponse(rows, 1, 10);

    expect(result.content).toHaveLength(10);
    expect(result.content[0]).toEqual({ id: '10' });
    expect(result.page).toEqual({ size: 10, number: 1, totalElements: 25, totalPages: 3 });
  });

  it('clamps a page beyond the end of the result set', () => {
    const result = toPagedResponse(rows, 99, 10);

    expect(result.page.number).toBe(2);
    expect(result.content).toHaveLength(5);
  });

  it('reports a single empty page for an empty result set', () => {
    const result = toPagedResponse([], 3, 10);

    expect(result.content).toEqual([]);
    expect(result.page).toEqual({ size: 10, number: 0, totalElements: 0, totalPages: 1 });
  });
});

describe('toPagedResponse with a page size below one', () => {
  it('treats it as one row per page rather than dividing by zero', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    const page = toPagedResponse(rows, 1, 0);

    expect(page.page.size).toBe(1);
    expect(page.page.totalPages).toBe(3);
    expect(page.page.number).toBe(1);
    expect(page.content).toEqual([{ id: 'b' }]);
  });
});
