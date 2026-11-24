import { describe, expect, it } from 'vitest';

import { dedupeCaseInsensitive } from './dedupeCaseInsensitive';

describe('dedupeCaseInsensitive', () => {
  it('collapses case variants to the first occurrence', () => {
    expect(dedupeCaseInsensitive(['abc', 'ABC', 'Abc'])).toEqual(['abc']);
  });

  it('keeps the first-occurrence order and casing', () => {
    expect(dedupeCaseInsensitive(['b2', 'A1', 'B2', 'a1'])).toEqual(['b2', 'A1']);
  });

  it('leaves already-distinct values untouched', () => {
    expect(dedupeCaseInsensitive(['ABC123', 'DEF456'])).toEqual(['ABC123', 'DEF456']);
  });

  it('returns an empty array for empty input', () => {
    expect(dedupeCaseInsensitive([])).toEqual([]);
  });
});
