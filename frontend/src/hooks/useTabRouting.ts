import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Tab routing for record-view pages with tabs. Keeps the active tab mirrored in a `?tab=`
 * URL param so the selection survives refresh / browser back-forward and is deep-linkable.
 *
 * `slugs` is indexed by tab position and must match the tab order the page renders; index 0
 * (the default tab) is represented as no param. Every tab having a slug is what prevents the
 * URL and the active-tab state from disagreeing on a normal click.
 *
 * Pass a module-level (stable) array so the sync effect doesn't re-run every render.
 */
export function useTabRouting(slugs: string[]): {
  activeTabIndex: number;
  onTabChange: (selectedIndex: number) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTabIndex, setActiveTabIndex] = useState(() =>
    resolveTabIndex(slugs, searchParams.get('tab')),
  );

  useEffect(() => {
    const nextTabIndex = resolveTabIndex(slugs, searchParams.get('tab'));
    setActiveTabIndex((current) => (current === nextTabIndex ? current : nextTabIndex));
  }, [searchParams, slugs]);

  const onTabChange = (selectedIndex: number) => {
    setActiveTabIndex(selectedIndex);

    const nextSearchParams = new URLSearchParams(searchParams);
    if (selectedIndex === 0) {
      nextSearchParams.delete('tab');
    } else {
      nextSearchParams.set('tab', slugs[selectedIndex]);
    }

    setSearchParams(nextSearchParams, { replace: true });
  };

  return { activeTabIndex, onTabChange };
}

function resolveTabIndex(slugs: string[], tab: string | null): number {
  if (!tab) {
    return 0;
  }
  const index = slugs.indexOf(tab);
  return index >= 0 ? index : 0;
}
