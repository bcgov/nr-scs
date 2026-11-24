import { Content, HeaderContainer, Loading } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';

import { isSystemAdministrator } from '@/context/auth/authUtils';
import { useAuth } from '@/context/auth/useAuth';
import { LayoutProvider } from '@/context/layout/LayoutProvider';
import SystemDisabled from '@/pages/SystemDisabled';
import API from '@/services/APIs';

import { LayoutHeader } from './LayoutHeader';

import type { FC } from 'react';

const Layout: FC = () => {
  const { isLoading, isLoggedIn, user } = useAuth();

  // WebADE-style enable/disable gate: only authenticated NON-administrators can be routed to the
  // disabled interstitial. Administrators always reach the app (e.g. to re-enable it), and the
  // login flow stays available for unauthenticated visitors. This mirrors how the legacy
  // WebADEFilter let privileged users through and forwarded everyone else to scsDisabled.jsp.
  const enforceDisableCheck = isLoggedIn && !isSystemAdministrator(user);

  const { data: systemStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => API.systemStatus.getSystemStatus(),
    enabled: enforceDisableCheck,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <Loading withOverlay />;
  }

  if (enforceDisableCheck) {
    // Wait for the status probe before rendering, so a disabled system never briefly flashes app UI.
    if (isStatusLoading) {
      return <Loading withOverlay />;
    }
    if (systemStatus?.enabled === false) {
      return <SystemDisabled />;
    }
  }

  return (
    <>
      <LayoutProvider>
        {isLoggedIn && <HeaderContainer render={LayoutHeader} />}
        <Content
          className={`app-content${isLoggedIn ? '' : ' app-content--no-sidenav'}`}
        >
          {/* The Outlet component renders the matched child route's element */}
          <Outlet />
        </Content>
      </LayoutProvider>
    </>
  );
};

export default Layout;
