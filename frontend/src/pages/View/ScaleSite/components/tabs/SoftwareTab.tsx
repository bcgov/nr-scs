import {
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { type FC } from 'react';

import EmptySection from '@/components/core/EmptySection';
import { useLazyTabQuery } from '@/hooks/useLazyTabQuery';
import API from '@/services/APIs';
import { asText } from '@/utils/display';
import type { ScaleSiteSoftwareSummary } from '@/services/scaleSiteSoftware.service';

interface Props {
  isActive: boolean;
  scaleSiteIdNmbr: string;
}

const SoftwareTab: FC<Props> = ({ isActive, scaleSiteIdNmbr }) => {
  const normalizedScaleSiteIdNmbr = scaleSiteIdNmbr.trim();

  const softwareQuery = useLazyTabQuery<ScaleSiteSoftwareSummary>(
    ['scale-site-software', normalizedScaleSiteIdNmbr],
    (token) => API.scaleSiteSoftware.getScaleSiteSoftware(normalizedScaleSiteIdNmbr, token),
    isActive && normalizedScaleSiteIdNmbr.length > 0,
  );

  const software: ScaleSiteSoftwareSummary[] = softwareQuery.rows;

  if (normalizedScaleSiteIdNmbr.length === 0) {
    return (
      <div className="scs__tab-view__panel">
        <EmptySection
          icon="Information"
          title="No software found"
          description="No scale site number is available for this record."
          whiteLayer
        />
      </div>
    );
  }

  if (softwareQuery.isPending) {
    return (
      <div className="scs__tab-view__panel">
        <SkeletonText paragraph lineCount={6} />
      </div>
    );
  }

  if (softwareQuery.isError) {
    return (
      <div className="scs__tab-view__panel">
        <EmptySection
          icon="WarningFilled"
          title="Could not load software"
          description={
            softwareQuery.error?.message ??
            'The software for this scale site could not be retrieved.'
          }
          whiteLayer
        />
      </div>
    );
  }

  return (
    <div className="scs__tab-view__panel">
      {software.length === 0 ? (
        <EmptySection
          icon="Information"
          title="No software found"
          description="This scale site does not have any software history."
          whiteLayer
        />
      ) : (
        <Table size="sm" useZebraStyles className="scs__tab-view__table" aria-label="Scale site software">
          <TableHead>
            <TableRow>
              <TableHeader>Scaling Program</TableHeader>
              <TableHeader>Version</TableHeader>
              <TableHeader>Revision</TableHeader>
              <TableHeader>Return Type</TableHeader>
              <TableHeader>Return Count</TableHeader>
              <TableHeader>Last Used Date</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {software.map((row, index) => (
              <TableRow key={`${row.scalingProgram ?? 'software'}-${row.version ?? ''}-${index}`}>
                <TableCell>{asText(row.scalingProgram)}</TableCell>
                <TableCell>{asText(row.version)}</TableCell>
                <TableCell>{asText(row.revision)}</TableCell>
                <TableCell>{asText(row.returnType)}</TableCell>
                <TableCell>{asText(row.returnCount)}</TableCell>
                <TableCell>{asText(row.lastUsedDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default SoftwareTab;
