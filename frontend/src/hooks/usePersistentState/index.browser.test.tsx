import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import usePersistentState, { clearPersistentState, clearAllPersistentState } from './index';

describe('usePersistentState', () => {
  it('returns the initial value on first use', () => {
    const { result } = renderHook(() => usePersistentState('first', 'a'));
    expect(result.current[0]).toBe('a');
  });

  it('restores the last value when the component remounts', () => {
    const key = 'restore-test';
    clearPersistentState(key);

    const first = renderHook(() => usePersistentState(key, 'a'));
    act(() => first.result.current[1]('b'));
    expect(first.result.current[0]).toBe('b');
    first.unmount();

    // Remount with the same key but a different initial value: the cached value wins.
    const second = renderHook(() => usePersistentState(key, 'a'));
    expect(second.result.current[0]).toBe('b');
  });

  it('persists object state such as form filters across remounts', () => {
    const key = 'filters-test';
    clearPersistentState(key);

    const first = renderHook(() => usePersistentState(key, { q: '', sort: 1 }));
    act(() => first.result.current[1]({ q: 'oak', sort: 8 }));
    first.unmount();

    const second = renderHook(() => usePersistentState(key, { q: '', sort: 1 }));
    expect(second.result.current[0]).toEqual({ q: 'oak', sort: 8 });
  });

  it('clearPersistentState drops a single key so its next mount uses the initial value', () => {
    const key = 'clear-one-test';

    const first = renderHook(() => usePersistentState(key, 'a'));
    act(() => first.result.current[1]('b'));
    first.unmount();

    clearPersistentState(key);

    const second = renderHook(() => usePersistentState(key, 'a'));
    expect(second.result.current[0]).toBe('a');
  });

  it('clearAllPersistentState resets every key on next mount (e.g. on logout)', () => {
    const first = renderHook(() => usePersistentState('logout-a', 'x'));
    act(() => first.result.current[1]('y'));
    first.unmount();

    clearAllPersistentState();
    const second = renderHook(() => usePersistentState('logout-a', 'x'));
    expect(second.result.current[0]).toBe('x');
  });

  it('when enabled=false, neither restores from nor writes to the store (acts like useState)', () => {
    const key = 'disabled-test';
    clearPersistentState(key);

    // A disabled mount must not write its value to the store...
    const disabled = renderHook(() => usePersistentState(key, 'a', false));
    act(() => disabled.result.current[1]('b'));
    expect(disabled.result.current[0]).toBe('b');
    disabled.unmount();

    // ...so an enabled remount falls back to the initial value, not 'b'.
    const enabled = renderHook(() => usePersistentState(key, 'a', true));
    expect(enabled.result.current[0]).toBe('a');
    enabled.unmount();
  });

  it('when enabled=false, ignores an existing cached value on init', () => {
    const key = 'disabled-ignores-cache';
    clearPersistentState(key);

    // Seed the store via an enabled mount.
    const seed = renderHook(() => usePersistentState(key, 'a'));
    act(() => seed.result.current[1]('cached'));
    seed.unmount();

    // A disabled mount must ignore the cached value and use its own initial value.
    const disabled = renderHook(() => usePersistentState(key, 'fresh', false));
    expect(disabled.result.current[0]).toBe('fresh');
  });
});
