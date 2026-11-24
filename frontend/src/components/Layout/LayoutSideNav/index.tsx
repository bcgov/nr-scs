import {
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
} from '@carbon/react';
import { type FC, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { hasWelcomeAccess } from '@/context/auth/authUtils';
import { useAuth } from '@/context/auth/useAuth';
import { usePermissions } from '@/context/auth/usePermissions';
import { useLayout } from '@/context/layout/useLayout';
import {
  NAVIGATION_ITEMS,
  filterNavigation,
  isNavGroup,
  type NavGroupItem,
  type NavItem,
  type NavLinkItem,
} from '@/routes/navigation';

import './index.scss';

export const LayoutSideNav: FC = () => {
  const { isSideNavExpanded, isLargeViewport } = useLayout();
  const { user } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();

  // A user with no recognised SCS role gets no navigation at all (legacy SecurityFilter); everyone
  // else sees only the entries their permissions reveal, so no link can lead to /unauthorized.
  const visibleItems = useMemo(
    () => (hasWelcomeAccess(user) ? filterNavigation(NAVIGATION_ITEMS, can) : []),
    [user, can],
  );

  const groupContainsPath = (group: NavGroupItem, path: string): boolean => {
    return group.children.some((child) =>
      isNavGroup(child) ? groupContainsPath(child, path) : child.path === path,
    );
  };

  const renderNavItem = (item: NavLinkItem) => (
    <SideNavLink
      data-testid={`side-nav-link-${item.name}`}
      key={item.name}
      as={Link}
      to={item.path}
      isActive={item.path === location.pathname}
      renderIcon={item.icon}
      title={item.name}
    >
      {item.name}
    </SideNavLink>
  );

  const renderGroup = (group: NavGroupItem, depth = 0) => (
    <SideNavMenu
      data-testid={`side-nav-group-${group.name}`}
      key={group.name}
      title={group.name}
      renderIcon={group.icon}
      className={depth > 0 ? 'nested-group' : undefined}
      defaultExpanded={groupContainsPath(group, location.pathname)}
    >
      {group.children.map((child) =>
        isNavGroup(child) ? (
          renderGroup(child, depth + 1)
        ) : (
          <SideNavMenuItem
            data-testid={`side-nav-menu-item-${child.name}`}
            key={child.name}
            as={Link}
            to={child.path}
            isActive={child.path === location.pathname}
            title={child.name}
          >
            {child.name}
          </SideNavMenuItem>
        ),
      )}
    </SideNavMenu>
  );

  const expanded = isLargeViewport || isSideNavExpanded;

  return (
    <SideNav expanded={expanded} isPersistent={isLargeViewport} isChildOfHeader>
      <SideNavItems>
        {visibleItems.map((item: NavItem) =>
          isNavGroup(item) ? renderGroup(item, 0) : renderNavItem(item),
        )}
      </SideNavItems>
    </SideNav>
  );
};
