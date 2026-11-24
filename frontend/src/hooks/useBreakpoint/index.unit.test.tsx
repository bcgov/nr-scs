import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useBreakpoint from './index';

const setWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
};

const originalWidth = window.innerWidth;

afterEach(() => {
  setWidth(originalWidth);
  vi.restoreAllMocks();
});

describe('useBreakpoint', () => {
  it.each([
    [1584, 'max'],
    [1600, 'max'],
    [1312, 'xlg'],
    [1583, 'xlg'],
    [1056, 'lg'],
    [1311, 'lg'],
    [672, 'md'],
    [1055, 'md'],
    [671, 'sm'],
    [320, 'sm'],
  ])('reports %s px as the %s breakpoint', (width, expected) => {
    setWidth(width as number);

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe(expected);
  });

  it('picks up a resize', () => {
    setWidth(400);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('sm');

    act(() => {
      setWidth(1400);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe('xlg');
  });

  it('detaches its resize listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useBreakpoint());
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('stops updating after unmount, so a late resize cannot set state', () => {
    setWidth(400);
    const { result, unmount } = renderHook(() => useBreakpoint());
    unmount();

    act(() => {
      setWidth(1600);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe('sm');
  });
});
