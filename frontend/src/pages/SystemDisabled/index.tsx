import { Column } from '@carbon/react';
import { type FC, useEffect } from 'react';

import EmptySection from '@/components/core/EmptySection';

import './index.scss';

/**
 * The "SCS temporarily disabled" interstitial, shown to authenticated non-administrator users
 * when the system is disabled (scs.app.enabled=false). It is the modern equivalent of the legacy
 * WebADE scsDisabled.jsp page: a standalone screen with no menu, navigation, or form controls.
 * It is rendered by the Layout guard in place of the normal app shell, so no header/side-nav mounts.
 */
const SystemDisabled: FC = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'SCS has been Temporarily Disabled';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <Column lg={16} md={8} sm={4} className="system-disabled-column__body">
      <EmptySection
        icon="WarningFilled"
        title="SCS has been temporarily disabled."
        description="The system is currently unavailable. Please try again later."
        className="system-disabled__section"
      />
    </Column>
  );
};

export default SystemDisabled;
