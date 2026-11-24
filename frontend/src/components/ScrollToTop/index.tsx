import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import type { FC } from 'react';

/**
 * Resets the document scroll to the top on every route change. Renders nothing.
 *
 * The app mounts `BrowserRouter` + `<Routes>` rather than a data router, so React Router's own
 * `<ScrollRestoration>` is not available to us. A client-side navigation only swaps the element
 * under `<Outlet />`; the document keeps its scroll offset. That is why a user scrolled partway
 * down one record page arrived partway down the next one (e.g. Mark Site Designation → Summary
 * Check Scale) instead of at its heading.
 *
 * Keyed on `pathname` alone, deliberately:
 * - `?tab=` (see `useTabRouting`) and the search screens' query params change only the search
 *   string while the user stays on the same page — scrolling them back to the top would fight the
 *   user rather than help.
 * - A `#hash` target is left alone so anchor deep links still land on the element they name.
 *
 * POP (browser back/forward) is treated like any other navigation: the previous page's offset is
 * not restored. Restoring it would need us to record a scroll position per history entry and
 * replay it after the destination's data has rendered, which is a larger change than the fix asked
 * for — and landing at the top is at least consistent.
 */
const ScrollToTop: FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      return;
    }
    // `instant` so the jump is invisible; the default would honour any smooth-scroll styling and
    // animate the whole page length on every navigation.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
