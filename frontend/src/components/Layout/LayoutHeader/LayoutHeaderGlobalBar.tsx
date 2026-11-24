import { UserAvatar } from '@carbon/icons-react';
import { HeaderGlobalAction } from '@carbon/react';
import { type FC } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { useLayout } from '@/context/layout/useLayout';

import './LayoutHeaderGlobalBar.scss';

const LayoutHeaderGlobalBar: FC = () => {
  const { toggleHeaderPanel, isHeaderPanelOpen } = useLayout();
  const { isLoggedIn } = useAuth();

  return (
    <>
      {isLoggedIn && (
        <HeaderGlobalAction
          aria-label="User settings"
          tooltipAlignment="end"
          onClick={toggleHeaderPanel}
          isActive={isHeaderPanelOpen}
          className="profile-action-button"
        >
          <UserAvatar size={20} />
        </HeaderGlobalAction>
      )}
    </>
  );
};

export default LayoutHeaderGlobalBar;

