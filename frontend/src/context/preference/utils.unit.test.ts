import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { loadUserPreference, saveUserPreference, initialValue } from './utils';

const mockStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    reset: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  mockStorage.reset();
  vi.stubGlobal('localStorage', mockStorage);
});

afterEach(() => {
  vi.restoreAllMocks();
  mockStorage.reset();
  mockStorage.clear();
  vi.stubGlobal('localStorage', mockStorage);
});

describe('loadUserPreference', () => {
  it('returns and persists the initial default preference if nothing is stored', async () => {
    const result = await loadUserPreference();

    expect(result).toEqual(initialValue);
    expect(mockStorage.setItem).toHaveBeenCalledWith('userPreference', JSON.stringify(initialValue));
  });

  it('returns stored preference if available in localStorage', async () => {
    mockStorage.setItem('userPreference', JSON.stringify({ theme: 'white' }));

    const result = await loadUserPreference();

    expect(result).toEqual({ theme: 'white' });
  });

  it('falls back to the default preference when stored data is invalid', async () => {
    mockStorage.setItem('userPreference', JSON.stringify({ theme: 'not-a-theme' }));

    const result = await loadUserPreference();

    expect(result).toEqual(initialValue);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'userPreference',
      JSON.stringify(initialValue),
    );
  });
});

describe('saveUserPreference', () => {
  it('saves merged preference to localStorage', async () => {
    mockStorage.setItem('userPreference', JSON.stringify({ theme: 'white' }));

    const result = await saveUserPreference({ theme: 'g100' });

    expect(result).toEqual({ theme: 'g100' });
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'userPreference',
      JSON.stringify({ theme: 'g100' }),
    );
  });

  it('saves new preference when nothing exists in localStorage', async () => {
    const result = await saveUserPreference({ theme: 'g100' });

    expect(result).toEqual({ theme: 'g100' });
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'userPreference',
      JSON.stringify({ theme: 'g100' }),
    );
  });

  it('normalizes invalid themes back to the default theme', async () => {
    const result = await saveUserPreference({ theme: 'not-a-theme' as never });

    expect(result).toEqual(initialValue);
    expect(mockStorage.setItem).toHaveBeenCalledWith('userPreference', JSON.stringify(initialValue));
  });
});
