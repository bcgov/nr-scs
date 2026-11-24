import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchScaleSites = vi.fn();

vi.mock('@/services/APIs', () => ({
  default: { scaleSites: { searchScaleSites: (...args: unknown[]) => searchScaleSites(...args) } },
}));

import { useSelectedScaleSites } from './useSelectedScaleSites';

const userToken = vi.fn().mockResolvedValue('test-token');

const setup = () => renderHook(() => useSelectedScaleSites(userToken));

beforeEach(() => {
  searchScaleSites.mockReset();
  userToken.mockClear();
});

describe('useSelectedScaleSites', () => {
  it('starts empty', () => {
    const { result } = setup();

    expect(result.current.scaleSites).toEqual([]);
    expect(result.current.scaleSitesError).toBeNull();
    expect(result.current.scaleSiteModalOpen).toBe(false);
  });

  it('adds a site that the lookup finds, and clears the input', async () => {
    searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-1', siteName: 'Site One' }]);
    const { result } = setup();

    act(() => result.current.setScaleSiteInput('ss-1'));
    await act(async () => {
      await result.current.onAddScaleSite();
    });

    // The typed value is upper-cased before the lookup.
    expect(searchScaleSites).toHaveBeenCalledWith({ scaleSiteIdNmbr: 'SS-1' }, 'test-token');
    expect(result.current.scaleSites).toEqual([{ scaleSiteIdNmbr: 'SS-1', siteName: 'Site One' }]);
    expect(result.current.scaleSiteInput).toBe('');
  });

  it('trims the typed value', async () => {
    searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-1' }]);
    const { result } = setup();

    act(() => result.current.setScaleSiteInput('  ss-1  '));
    await act(async () => {
      await result.current.onAddScaleSite();
    });

    expect(searchScaleSites).toHaveBeenCalledWith({ scaleSiteIdNmbr: 'SS-1' }, 'test-token');
  });

  it('does nothing at all for an empty input', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.onAddScaleSite();
    });

    expect(searchScaleSites).not.toHaveBeenCalled();
    expect(result.current.scaleSites).toEqual([]);
  });

  it('reports a site the lookup does not find, and keeps the input for correction', async () => {
    searchScaleSites.mockResolvedValue([]);
    const { result } = setup();

    act(() => result.current.setScaleSiteInput('SS-404'));
    await act(async () => {
      await result.current.onAddScaleSite();
    });

    expect(result.current.scaleSitesError).toBe('Scale site SS-404 was not found.');
    expect(result.current.scaleSites).toEqual([]);
    expect(result.current.scaleSiteInput).toBe('SS-404');
  });

  it('reports a lookup failure through the extracted API message', async () => {
    searchScaleSites.mockRejectedValue({ response: { data: { message: 'Service down.' } } });
    const { result } = setup();

    act(() => result.current.setScaleSiteInput('SS-1'));
    await act(async () => {
      await result.current.onAddScaleSite();
    });

    expect(result.current.scaleSitesError).toBe('Service down.');
  });

  it('falls back to a generic message when the failure carries none', async () => {
    searchScaleSites.mockRejectedValue({});
    const { result } = setup();

    act(() => result.current.setScaleSiteInput('SS-1'));
    await act(async () => {
      await result.current.onAddScaleSite();
    });

    expect(result.current.scaleSitesError).toBe('Could not add scale site.');
  });

  it('clears a previous error on the next successful add', async () => {
    searchScaleSites.mockResolvedValueOnce([]).mockResolvedValueOnce([{ scaleSiteIdNmbr: 'SS-1' }]);
    const { result } = setup();

    act(() => result.current.setScaleSiteInput('SS-404'));
    await act(async () => {
      await result.current.onAddScaleSite();
    });
    await waitFor(() => expect(result.current.scaleSitesError).not.toBeNull());

    act(() => result.current.setScaleSiteInput('SS-1'));
    await act(async () => {
      await result.current.onAddScaleSite();
    });

    expect(result.current.scaleSitesError).toBeNull();
  });

  it('does not add the same site twice', async () => {
    searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-1', siteName: 'Site One' }]);
    const { result } = setup();

    for (const value of ['SS-1', 'SS-1']) {
      act(() => result.current.setScaleSiteInput(value));
      await act(async () => {
        await result.current.onAddScaleSite();
      });
    }

    expect(result.current.scaleSites).toHaveLength(1);
  });

  it('falls back to the typed number when the match carries none of its own', async () => {
    searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-1', siteName: null }]);
    const { result } = setup();

    act(() => result.current.setScaleSiteInput('SS-1'));
    await act(async () => {
      await result.current.onAddScaleSite();
    });

    expect(result.current.scaleSites[0].scaleSiteIdNmbr).toBe('SS-1');
  });

  describe('handleScaleSiteSelect', () => {
    it('adds the chosen site and closes the modal', () => {
      const { result } = setup();

      act(() => result.current.setScaleSiteModalOpen(true));
      act(() => result.current.handleScaleSiteSelect({ scaleSiteIdNmbr: 'SS-2', siteName: 'Two' }));

      expect(result.current.scaleSites).toEqual([{ scaleSiteIdNmbr: 'SS-2', siteName: 'Two' }]);
      expect(result.current.scaleSiteModalOpen).toBe(false);
    });

    it('ignores a selection with no site number, leaving the modal open', () => {
      const { result } = setup();

      act(() => result.current.setScaleSiteModalOpen(true));
      act(() => result.current.handleScaleSiteSelect({ scaleSiteIdNmbr: null }));

      expect(result.current.scaleSites).toEqual([]);
      expect(result.current.scaleSiteModalOpen).toBe(true);
    });

    it('does not add a duplicate, but still closes the modal', () => {
      const { result } = setup();

      act(() => result.current.handleScaleSiteSelect({ scaleSiteIdNmbr: 'SS-2' }));
      act(() => result.current.setScaleSiteModalOpen(true));
      act(() => result.current.handleScaleSiteSelect({ scaleSiteIdNmbr: 'SS-2' }));

      expect(result.current.scaleSites).toHaveLength(1);
      expect(result.current.scaleSiteModalOpen).toBe(false);
    });
  });

  describe('onRemoveScaleSite', () => {
    it('removes the named site and leaves the others', () => {
      const { result } = setup();

      act(() => {
        result.current.setScaleSites([
          { scaleSiteIdNmbr: 'SS-1' },
          { scaleSiteIdNmbr: 'SS-2' },
        ]);
      });
      act(() => result.current.onRemoveScaleSite('SS-1'));

      expect(result.current.scaleSites).toEqual([{ scaleSiteIdNmbr: 'SS-2' }]);
    });

    it('is a no-op for a site that is not in the list', () => {
      const { result } = setup();

      act(() => result.current.setScaleSites([{ scaleSiteIdNmbr: 'SS-1' }]));
      act(() => result.current.onRemoveScaleSite('SS-9'));

      expect(result.current.scaleSites).toHaveLength(1);
    });
  });

  it('lets a page seed the list, as the edit screen does from the loaded record', () => {
    const { result } = setup();

    act(() => result.current.setScaleSites([{ scaleSiteIdNmbr: 'SS-7', siteName: 'Seven' }]));

    expect(result.current.scaleSites).toEqual([{ scaleSiteIdNmbr: 'SS-7', siteName: 'Seven' }]);
  });
});
