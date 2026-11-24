import { useEffect, useState } from 'react';

import { LayoutContext } from './LayoutContext';

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const getIsLargeViewport = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(min-width: 66rem)').matches;
  };

  const [isLargeViewport, setIsLargeViewport] = useState(getIsLargeViewport);
  const [isSideNavExpanded, setSideNavExpanded] = useState(getIsLargeViewport);
  const [isHeaderPanelOpen, setHeaderPanelOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQueryList = window.matchMedia('(min-width: 66rem)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsLargeViewport(event.matches);
      setSideNavExpanded(event.matches);
    };

    setIsLargeViewport(mediaQueryList.matches);
    setSideNavExpanded(mediaQueryList.matches);

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
      return () => mediaQueryList.removeEventListener('change', handleChange);
    }

    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, []);

  return (
    <LayoutContext.Provider
      value={{
        isLargeViewport,
        isSideNavExpanded,
        toggleSideNav: () => {
          if (isLargeViewport) {
            return;
          }
          setSideNavExpanded((prev) => !prev);
        },
        isHeaderPanelOpen,
        toggleHeaderPanel: () => setHeaderPanelOpen((prev) => !prev),
        closeHeaderPanel: () => setHeaderPanelOpen(false),
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
