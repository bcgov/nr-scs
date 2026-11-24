import { type FC, type ReactNode } from 'react';
import { Link as RouterLink, useInRouterContext } from 'react-router-dom';

import { type PERMISSION_TYPE } from '@/context/auth/permissions';
import { usePermissions } from '@/context/auth/usePermissions';

type PermissionLinkProps = {
  to: string;
  /** Permission the destination route requires. */
  permission: PERMISSION_TYPE;
  /** Anchor only; the plain-text form carries no class so it inherits the surrounding colour. */
  className?: string;
  /** Kept on both forms — some of these values are a `<label htmlFor>` target. */
  id?: string;
  title?: string;
  state?: unknown;
  children: ReactNode;
};

/**
 * A route link that degrades to plain text when the user cannot reach its destination — keeping the
 * value (still data they may see) without a dead link. Use `PermissionGate` instead where the whole
 * control should disappear.
 *
 * A UX affordance only; `ProtectedRoute` and the API enforce independently.
 */
const PermissionLink: FC<PermissionLinkProps> = ({
  to,
  permission,
  className,
  id,
  title,
  state,
  children,
}) => {
  const { can } = usePermissions();
  // Some of these tables render outside a router (print/preview paths).
  const hasRouter = useInRouterContext();

  if (!can(permission)) {
    return <span id={id}>{children}</span>;
  }

  if (!hasRouter) {
    return (
      <a className={className} href={to} id={id} title={title}>
        {children}
      </a>
    );
  }

  return (
    <RouterLink className={className} id={id} state={state} title={title} to={to}>
      {children}
    </RouterLink>
  );
};

export default PermissionLink;
