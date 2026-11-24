import { type FC } from 'react';

import PermissionLink from '@/components/core/PermissionLink';
import { PERMISSIONS } from '@/context/auth/permissions';

interface Props {
  scaleSiteIdNmbr?: string | number | null;
  className?: string;
}

/**
 * A scale-site number linking to that site's record; em dash when blank, plain text without
 * `SCALE_SITE_READ`. Sibling of `ScalerLicenceLink`, and the only route into a site record for a role
 * that lacks `SCALE_SITE_QUERY`.
 */
const ScaleSiteLink: FC<Props> = ({
  scaleSiteIdNmbr,
  className = 'scs__tab-view__table-link',
}) => {
  const normalized = String(scaleSiteIdNmbr ?? '').trim();
  if (normalized.length === 0) {
    return <>—</>;
  }
  return (
    <PermissionLink
      className={className}
      permission={PERMISSIONS.SCALE_SITE_READ}
      to={`/scale-sites/view/${encodeURIComponent(normalized)}`}
    >
      {normalized}
    </PermissionLink>
  );
};

export default ScaleSiteLink;
