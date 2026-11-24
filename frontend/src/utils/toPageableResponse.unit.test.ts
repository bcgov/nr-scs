import { describe, expect, it } from 'vitest';

import { toPageableResponse } from './toPageableResponse';

describe('toPageableResponse', () => {
  it('wraps rows into a single logical page', () => {
    const rows = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Bravo' },
    ];

    const result = toPageableResponse(rows);

    expect(result.content).toBe(rows);
    expect(result.page).toEqual({
      size: 2,
      number: 0,
      totalElements: 2,
      totalPages: 1,
    });
  });

  it('keeps size at least 1 for an empty list (so the skeleton renders)', () => {
    const result = toPageableResponse<{ name: string }>([]);

    expect(result.content).toEqual([]);
    expect(result.page.size).toBe(1);
    expect(result.page.totalElements).toBe(0);
    expect(result.page.totalPages).toBe(1);
  });
});
