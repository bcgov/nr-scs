import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Amplify } from 'aws-amplify';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/index.scss';
import { getAmplifyConfig } from '@/amplify-initializer';
import App from '@/App.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClientConfig } from '@/config/react-query/config';
import { ActiveClientProvider } from '@/context/activeClient/ActiveClientProvider';
import { AuthProvider } from '@/context/auth/AuthProvider';
import NotificationProvider from '@/context/notification/NotificationProvider';
import PageTitleProvider from '@/context/pageTitle/PageTitleProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider.tsx';
import ThemeProvider from '@/context/theme/ThemeProvider.tsx';
import updateSW from '@/registerServiceWorker';
import { validateEnv } from '@/utils/validateEnv';

validateEnv();

Amplify.configure(getAmplifyConfig());

const queryClient = new QueryClient(queryClientConfig);

updateSW();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PreferenceProvider>
        <ThemeProvider>
          <NotificationProvider>
            <PageTitleProvider>
              <AuthProvider>
                <ActiveClientProvider>
                  <ErrorBoundary>
                    <App />
                  </ErrorBoundary>
                </ActiveClientProvider>
              </AuthProvider>
            </PageTitleProvider>
          </NotificationProvider>
        </ThemeProvider>
      </PreferenceProvider>
    </QueryClientProvider>
  </StrictMode>,
);
