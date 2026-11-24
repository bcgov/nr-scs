import { useState, useEffect, type ReactNode, useCallback } from 'react';

import { env } from '@/env';

import { PageTitleContext } from './PageTitleContext';

const APP_NAME = env.VITE_APP_NAME || 'SCS';

export const PageTitleProvider = ({ children }: { children: ReactNode }) => {
  const [pageTitle, setPageTitleState] = useState(document.title);

  // The browser tab label always shows the app name, matching the legacy app, whose entry layout
  // (jsp/layout/index.jsp) hard-codes the title. Pages call setPageTitle on mount.
  const setPageTitle = useCallback(() => {
    setPageTitleState(APP_NAME);
  }, []);

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  return (
    <PageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
};

export default PageTitleProvider;
