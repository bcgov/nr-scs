import {
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  SkipToContent,
} from '@carbon/react';
import { type FC } from 'react';
import { Link } from 'react-router-dom';

import { LayoutHeaderPanel } from '@/components/Layout/LayoutHeaderPanel';
import { LayoutSideNav } from '@/components/Layout/LayoutSideNav';
import ThemeToggle from '@/components/Layout/ThemeToggle';
import { useAuth } from '@/context/auth/useAuth';
import { useLayout } from '@/context/layout/useLayout';

import LayoutHeaderGlobalBar from './LayoutHeaderGlobalBar';

import './index.scss';

export const LayoutHeader: FC = () => {
  const { isSideNavExpanded, toggleSideNav, isLargeViewport } = useLayout();
  const { isLoggedIn } = useAuth();

  const appName = 'Scale Administration and Control System (SCS)';

  return (
    <Header aria-label={appName} className="bc-header" data-testid="bc-header__header">
      <SkipToContent />
      {isLoggedIn && !isLargeViewport && (
        <HeaderMenuButton
          aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
          isActive={isSideNavExpanded}
          onClick={toggleSideNav}
        />
      )}
      <HeaderName as={Link} to={'/welcome'} prefix="">
        {appName}
      </HeaderName>
      <HeaderGlobalBar>
        <LayoutHeaderGlobalBar />
        <HeaderGlobalAction
          aria-label="Theme"
          tooltipAlignment="end"
          className="theme-toggle-action"
        >
          <ThemeToggle />
        </HeaderGlobalAction>
      </HeaderGlobalBar>
      <LayoutHeaderPanel />
      {isLoggedIn && <LayoutSideNav />}
    </Header>
  );
};
