import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

import useOfflineMode from './index';

describe('useOfflineMode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return online status initially', () => {
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.isOnline).toBe(true);
  });

  it('should stay online when offline support is disabled and an offline event fires', () => {
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('should stay online when offline support is disabled and an online event fires', () => {
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });
});
