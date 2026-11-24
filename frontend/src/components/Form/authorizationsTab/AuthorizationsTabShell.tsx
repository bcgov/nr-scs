import { InlineNotification, SkeletonText } from '@carbon/react';
import type { ReactNode } from 'react';

import EmptySection from '@/components/core/EmptySection';
import { StatusFilterSelect } from '@/components/Form/StatusFilterSelect';
import type { StatusFilterValue } from '@/hooks/useStatusFilter';

/** The subset of `useAuthorizationLetterDownload`'s result this shell needs. */
type LetterState = {
  error: string | null;
  busyId: number | null;
  clearError: () => void;
};

type Props = {
  /** The permission-gated Add button, rendered above the body in every state. */
  addAction: ReactNode;
  isPending: boolean;
  isError: boolean;
  /** Shown when the list request fails. */
  errorDescription: string;
  letter: LetterState;
  /** Entity-specific notification class (`view-scaler__notification` and friends). */
  notificationClassName: string;
  statusFilterId: string;
  status: StatusFilterValue;
  onStatusChange: (value: StatusFilterValue) => void;
  /** True when the status filter leaves no rows; shows the empty state instead of the table. */
  isEmpty: boolean;
  emptyDescription: string;
  /** The entity's own authorizations table. */
  children: ReactNode;
};

/**
 * The list shell shared by the Scaler and Scale Site authorization tabs: loading skeleton, load
 * failure, letter-download notifications, the status filter and the empty state. Only the table
 * itself differs between the two, so it comes in as `children`.
 */
const AuthorizationsTabShell = ({
  addAction,
  isPending,
  isError,
  errorDescription,
  letter,
  notificationClassName,
  statusFilterId,
  status,
  onStatusChange,
  isEmpty,
  emptyDescription,
  children,
}: Props) => {
  if (isPending) {
    return (
      <div className="scs__tab-view__panel">
        {addAction}
        <SkeletonText paragraph lineCount={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="scs__tab-view__panel">
        {addAction}
        <EmptySection
          icon="WarningFilled"
          title="Could not load authorizations"
          description={errorDescription}
          whiteLayer
        />
      </div>
    );
  }

  return (
    <div className="scs__tab-view__panel">
      {addAction}

      {letter.error ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Authorization letter unavailable."
          subtitle={letter.error}
          className={notificationClassName}
          onCloseButtonClick={letter.clearError}
        />
      ) : null}

      {letter.busyId !== null ? (
        <InlineNotification
          kind="info"
          lowContrast
          title="Downloading letter"
          subtitle="Please wait while the letter is downloaded."
          className={notificationClassName}
          hideCloseButton
        />
      ) : null}

      <StatusFilterSelect id={statusFilterId} value={status} onChange={onStatusChange} />

      {isEmpty ? (
        <EmptySection
          icon="Information"
          title="No authorizations found"
          description={emptyDescription}
          whiteLayer
        />
      ) : (
        children
      )}
    </div>
  );
};

export default AuthorizationsTabShell;
