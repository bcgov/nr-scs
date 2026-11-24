import {
  InlineNotification,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { type FC } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { ScaleSiteActivitySummary } from '@/services/scaleSiteActivity.service';

import { asText } from '../../utils';

interface Props {
  isActive: boolean;
  scaleSiteIdNmbr: string;
}

const ActivityTab: FC<Props> = ({ isActive, scaleSiteIdNmbr }) => {
  const { userToken } = useAuth();

  const activityQuery = useQuery<ScaleSiteActivitySummary>({
    queryKey: ['scale-site-activity', scaleSiteIdNmbr],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleSiteActivity.getScaleSiteActivitySummary(scaleSiteIdNmbr, token);
    },
    enabled: isActive && Boolean(scaleSiteIdNmbr),
    staleTime: 5 * 60 * 1000,
  });

  const activity = activityQuery.data;
  const loadError = activityQuery.error?.message ?? null;

  return (
    <div className="scs__tab-view__panel">
      <section className="view-scale-site__section">
        <h4 className="view-scale-site__section-title">Summary</h4>

        {loadError ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Activity summary unavailable."
            subtitle={loadError}
            className="scs__notification"
          />
        ) : activityQuery.isLoading ? (
          <SkeletonText paragraph lineCount={4} />
        ) : (
          <Table
            size="sm"
            useZebraStyles
            className="scs__tab-view__table scs__tab-view__table--wide"
            aria-label="Scale site activity summary"
          >
            <TableBody>
              <TableRow>
                <TableCell className="scs__tab-view__label">Date of Last Return:</TableCell>
                <TableCell>{asText(activity?.lastScaleDate)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="scs__tab-view__label">Number of Samples (last 12 months):</TableCell>
                <TableCell>{asText(activity?.numberOfSamples)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="scs__tab-view__label">Sample Volume (last 12 months):</TableCell>
                <TableCell>{asText(activity?.sampleVolume)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="scs__tab-view__label">Scaled Volume (last 12 months):</TableCell>
                <TableCell>{asText(activity?.scaledVolume)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
};

export default ActivityTab;
