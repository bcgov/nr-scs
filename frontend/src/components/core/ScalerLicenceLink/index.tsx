import { type FC } from 'react';

import PermissionLink from '@/components/core/PermissionLink';
import { PERMISSIONS } from '@/context/auth/permissions';

interface Props {
  licenceNo?: string | null;
  className?: string;
}

/**
 * A scaler licence number rendered as a link to that scaler's view page; em dash when blank.
 *
 * Degrades to plain text for a role without `SCALER_READ`. An Industry Scaler *does* hold it, so the
 * licence numbers on their check-scale lists stay clickable — and one they are not entitled to see is
 * refused per record by the data-scoping layer (an access-denied card on the scaler page), which is a
 * separate question from whether the route is reachable at all.
 */
const ScalerLicenceLink: FC<Props> = ({ licenceNo, className = 'scs__tab-view__table-link' }) => {
  const normalized = (licenceNo ?? '').trim();
  if (normalized.length === 0) {
    return <>—</>;
  }
  return (
    <PermissionLink
      className={className}
      permission={PERMISSIONS.SCALER_READ}
      to={`/scalers/view/${encodeURIComponent(normalized)}`}
    >
      {normalized}
    </PermissionLink>
  );
};

export default ScalerLicenceLink;
