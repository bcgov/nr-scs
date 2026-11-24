import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useTabRouting } from './useTabRouting';

const SLUGS = ['summary', 'address', 'authorizations', 'risk-rating'];

const wrapperFor = (initial: string) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  );

/** Exposes the search string alongside the hook so URL sync can be asserted. */
const useRoutingWithSearch = (slugs: string[]) => ({
  ...useTabRouting(slugs),
  search: useLocation().search,
});

describe('useTabRouting', () => {
  it('defaults to the first tab when there is no tab param', () => {
    const { result } = renderHook(() => useTabRouting(SLUGS), {
      wrapper: wrapperFor('/scalers/view/1'),
    });

    expect(result.current.activeTabIndex).toBe(0);
  });

  it('opens the tab named by the param — the deep-link case', () => {
    const { result } = renderHook(() => useTabRouting(SLUGS), {
      wrapper: wrapperFor('/scalers/view/1?tab=authorizations'),
    });

    expect(result.current.activeTabIndex).toBe(2);
  });

  it('falls back to the first tab for an unknown slug rather than rendering nothing', () => {
    const { result } = renderHook(() => useTabRouting(SLUGS), {
      wrapper: wrapperFor('/scalers/view/1?tab=nonsense'),
    });

    expect(result.current.activeTabIndex).toBe(0);
  });

  it('writes the slug to the URL when a non-default tab is selected', () => {
    const { result } = renderHook(() => useRoutingWithSearch(SLUGS), {
      wrapper: wrapperFor('/scalers/view/1'),
    });

    act(() => result.current.onTabChange(3));

    expect(result.current.activeTabIndex).toBe(3);
    expect(result.current.search).toBe('?tab=risk-rating');
  });

  it('drops the param entirely when returning to the default tab', () => {
    const { result } = renderHook(() => useRoutingWithSearch(SLUGS), {
      wrapper: wrapperFor('/scalers/view/1?tab=address'),
    });

    act(() => result.current.onTabChange(0));

    expect(result.current.activeTabIndex).toBe(0);
    expect(result.current.search).toBe('');
  });

  it('preserves other query params when switching tabs', () => {
    const { result } = renderHook(() => useRoutingWithSearch(SLUGS), {
      wrapper: wrapperFor('/scalers/view/1?highlight=7'),
    });

    act(() => result.current.onTabChange(1));

    expect(result.current.search).toContain('highlight=7');
    expect(result.current.search).toContain('tab=address');
  });

  it('tracks a param change made outside the hook, such as browser back', () => {
    const { result } = renderHook(() => useRoutingWithSearch(SLUGS), {
      wrapper: wrapperFor('/scalers/view/1?tab=address'),
    });
    expect(result.current.activeTabIndex).toBe(1);

    act(() => result.current.onTabChange(2));
    expect(result.current.activeTabIndex).toBe(2);
    expect(result.current.search).toBe('?tab=authorizations');
  });
});
