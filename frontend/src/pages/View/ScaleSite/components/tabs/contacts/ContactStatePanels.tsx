import { InlineNotification, SkeletonText } from '@carbon/react';
import type { FC } from 'react';

import Button from '@/components/core/Button';

// Shared loading / error panels for the single-contact view and edit screens, so the
// "Scale Site Contact" panel chrome and the could-not-load error UI live in one place.

interface LoadingProps {
  title?: string;
  lineCount?: number;
}

export const ContactLoadingPanel: FC<LoadingProps> = ({ title = 'Scale Site Contact', lineCount = 4 }) => (
  <div className="scs__tab-view__panel">
    <section className="view-scale-site__section">
      <h4 className="view-scale-site__section-title">{title}</h4>
      <SkeletonText paragraph lineCount={lineCount} />
    </section>
  </div>
);

interface ErrorProps {
  subtitle: string;
  onClose: () => void;
  title?: string;
}

export const ContactLoadError: FC<ErrorProps> = ({ subtitle, onClose, title = 'Scale Site Contact' }) => (
  <div className="scs__tab-view__panel">
    <section className="view-scale-site__section">
      <h4 className="view-scale-site__section-title">{title}</h4>
      <InlineNotification
        kind="error"
        lowContrast
        title="Could not load contact."
        subtitle={subtitle}
        className="scs__notification"
      />
      <div className="form-actions">
        <Button kind="secondary" type="button" onClick={onClose}>Back</Button>
      </div>
    </section>
  </div>
);
