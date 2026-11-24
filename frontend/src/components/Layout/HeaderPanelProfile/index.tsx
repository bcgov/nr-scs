import { Logout } from '@carbon/icons-react';
import { type FC } from 'react';

import Button from '@/components/core/Button';
import { useAuth } from '@/context/auth/useAuth';

import ClientSwitcher from './ClientSwitcher';
import MockRoleClientPicker from './MockRoleClientPicker';
import './index.scss';

/**
 * This component displays user information in the header panel.
 * In this template, it shows static mock data and a logout button.
 */
const HeaderPanelProfile: FC = () => {
  const { logout, user } = useAuth();
  // In a real application, this would clear session state and redirect.
  const handleLogout = () => {
    logout();
  };

  return (
    <div className="header-panel-profile-container">
      <div className="header-panel-profile-content">
        <p className="header-panel-profile-name">{user?.displayName}</p>
        <p className="header-panel-profile-email">{user?.email}</p>
        <ClientSwitcher />
        {/*
          Developer-only mock role/client controls. `import.meta.env.DEV` is a build-time
          literal, so this branch is dead code (tree-shaken) in production builds; the picker
          also renders nothing unless the mock auth provider is active.
        */}
        {import.meta.env.DEV && <MockRoleClientPicker />}
      </div>
      <Button kind="ghost" renderIcon={Logout} iconDescription="Logout" onClick={handleLogout}>
        Log out
      </Button>
    </div>
  );
};

export default HeaderPanelProfile;
