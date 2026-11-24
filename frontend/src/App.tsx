import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Layout from '@/components/Layout';
import ScrollToTop from '@/components/ScrollToTop';
import { APP_ROUTES } from '@/routes/routePaths';
import { getAppBasePath } from '@/utils/appBasePath';

const App: FC = () => {
  return (
    <>
      {/*
        BrowserRouter should wrap the entire application that uses routing.
        It's placed here to keep main.tsx focused on providers.
      */}
      <BrowserRouter basename={getAppBasePath()}>
        {/* Each navigation starts at the top of the new page, not where the last one was left. */}
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            {APP_ROUTES.map((route) => (
              <Route
                key={route.id}
                path={route.path}
                element={route.element}
                errorElement={route.errorElement}
              />
            ))}
          </Route>
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </>
  );
};

export default App;
