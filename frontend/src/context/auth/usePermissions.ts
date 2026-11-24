import { useCallback, useMemo } from 'react';

import { useAuth } from './useAuth';
import {
  hasAnyPermission,
  hasPermission,
  permissionsFor,
  type PERMISSION_TYPE,
} from './permissions';

/**
 * The current user's permissions. Ask "may this user edit a scaler?" rather than "is this user a
 * district scaling manager?", so enabling a role never means revisiting the component.
 */
export const usePermissions = () => {
  const { user } = useAuth();

  const granted = useMemo(() => permissionsFor(user), [user]);

  /** Whether the user holds the permission. `undefined` means "not required" and passes. */
  const can = useCallback(
    (permission: PERMISSION_TYPE | undefined) => hasPermission(user, permission),
    [user],
  );

  /** Whether the user holds at least one of the permissions. An empty list passes. */
  const canAny = useCallback(
    (permissions: readonly PERMISSION_TYPE[]) => hasAnyPermission(user, permissions),
    [user],
  );

  return { can, canAny, permissions: granted };
};
