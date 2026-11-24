import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearStoredActiveClient,
  readStoredActiveClient,
  writeStoredActiveClient,
} from './activeClientStorage';

describe('activeClientStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('round-trips the selection', () => {
    writeStoredActiveClient('00001074');

    expect(readStoredActiveClient()).toBe('00001074');
  });

  it('reads undefined when nothing is stored', () => {
    expect(readStoredActiveClient()).toBeUndefined();
  });

  it('clears the selection', () => {
    writeStoredActiveClient('00001074');
    clearStoredActiveClient();

    expect(readStoredActiveClient()).toBeUndefined();
  });

  /**
   * sessionStorage, not localStorage: the selection must not outlive the tab session it was chosen in.
   * Asserted on the storage itself because it is the whole reason for the choice.
   */
  it('uses sessionStorage, leaving localStorage untouched', () => {
    writeStoredActiveClient('00001074');

    expect(sessionStorage.getItem('scs.activeClient')).toBe('00001074');
    expect(localStorage.getItem('scs.activeClient')).toBeNull();
  });

  /**
   * Storage throws in some privacy modes. The switcher is a convenience, so it degrades to
   * not-persisted rather than taking the page down.
   */
  describe('when storage is unavailable', () => {
    it('reads undefined instead of throwing', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });

      expect(() => readStoredActiveClient()).not.toThrow();
      expect(readStoredActiveClient()).toBeUndefined();
    });

    it('swallows a failed write', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });

      expect(() => writeStoredActiveClient('00001074')).not.toThrow();
    });

    it('swallows a failed clear', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('denied');
      });

      expect(() => clearStoredActiveClient()).not.toThrow();
    });
  });
});
