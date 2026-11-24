import { type FC, type PropsWithChildren, type ReactNode } from 'react';

import { type PERMISSION_TYPE } from '@/context/auth/permissions';
import { usePermissions } from '@/context/auth/usePermissions';

type PermissionGateProps = PropsWithChildren<{
  permission?: PERMISSION_TYPE;
  /** Render when the user holds any of these. Ignored if `permission` is given. */
  anyOf?: readonly PERMISSION_TYPE[];
  fallback?: ReactNode;
}>;

/**
 * Renders its children only when the user holds the permission; nothing otherwise. For in-page
 * controls (buttons, row actions). Routes use `ProtectedRoute`, links use `PermissionLink`.
 */
const PermissionGate: FC<PermissionGateProps> = ({
  permission,
  anyOf,
  fallback = null,
  children,
}) => {
  const { can, canAny } = usePermissions();

  const allowed = permission ? can(permission) : canAny(anyOf ?? []);

  return <>{allowed ? children : fallback}</>;
};

export default PermissionGate;
