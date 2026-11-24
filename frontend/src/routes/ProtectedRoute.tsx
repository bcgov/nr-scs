import { type FC, type PropsWithChildren, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/context/auth/useAuth';
import { hasWelcomeAccess } from '@/context/auth/authUtils';
import { hasPermission, type PERMISSION_TYPE } from '@/context/auth/permissions';

type ProtectedRouteProps = PropsWithChildren<{
  /** Permission required to view the route; omit for one open to any signed-in user. */
  permission?: PERMISSION_TYPE;
}>;

/**
 * Guards a route on authentication and one permission. Not signed in → landing page; no recognised
 * SCS role, or missing this page's permission → `/unauthorized` (the legacy `notAuthorized` forward).
 * A UX guard; the API enforces independently.
 */
const ProtectedRoute: FC<ProtectedRouteProps> = ({ permission, children }) => {
  const { isLoggedIn, isLoading, user } = useAuth();
  const navigate = useNavigate();

  // A recognised role is what gets a user into the portal at all; the permission decides this page.
  const isAuthorized = isLoggedIn && hasWelcomeAccess(user) && hasPermission(user, permission);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isLoggedIn) {
      navigate('/welcome', { replace: true });
    } else if (!isAuthorized) {
      navigate('/unauthorized', { replace: true });
    }
  }, [isLoading, isLoggedIn, isAuthorized, navigate]);

  if (isLoading) {
    return <div>Loading session...</div>;
  }

  if (!isLoggedIn) {
    return <div>Redirecting to login...</div>;
  }

  if (!isAuthorized) {
    return <div>Redirecting...</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
