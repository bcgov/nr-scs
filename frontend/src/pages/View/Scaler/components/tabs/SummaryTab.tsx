import { Table, TableBody, TableCell, TableRow } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { type FC, useState } from 'react';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import WhoDidIt from '@/components/core/WhoDidIt';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { ScalerDetail, ScalerSummary } from '@/services/scalers.service';
import { asText, formatClientLoc, formatLicenceTypes, ynToDisplay } from '@/pages/View/Scaler/utils';

import ScalerEditModal from '../ScalerEditModal';

interface Props {
  summary: ScalerSummary;
}

const SummaryTab: FC<Props> = ({ summary }) => {
  const summaryLicenceTypes = formatLicenceTypes(summary.licenceTypes);
  const [editOpen, setEditOpen] = useState(false);
  const scalerLicenceNo = summary.scalerLicenceNo ?? '';

  // "Who Did It" audit popup (UC-SYS-005) is IDIR-only, so only fetch the full record
  // (which carries the audit fields the summary omits) for IDIR users.
  const { user, userToken } = useAuth();
  const isIdir = user?.idpProvider === 'IDIR';
  const auditQuery = useQuery<ScalerDetail, Error>({
    queryKey: ['scaler-detail-audit', scalerLicenceNo],
    queryFn: async () => {
      const token = await userToken();
      return API.scalers.getScaler(scalerLicenceNo, token);
    },
    enabled: Boolean(scalerLicenceNo) && isIdir,
  });

  return (
    <div className="scs__tab-view__panel">
      <div className="scs__view-tab-actions scs__view-tab-actions--top scs__view-tab-actions--wide">
        <PermissionGate permission={PERMISSIONS.SCALER_UPDATE}>
          <Button kind="primary" type="button" size="sm" onClick={() => setEditOpen(true)}>
            Edit Record
          </Button>
        </PermissionGate>
        <WhoDidIt audit={auditQuery.data} loading={auditQuery.isLoading} />
      </div>

      {editOpen ? (
        <ScalerEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          scalerLicenceNo={scalerLicenceNo}
        />
      ) : null}

      <Table
        size="sm"
        useZebraStyles
        className="scs__tab-view__table scs__tab-view__table--wide"
      >
        <TableBody>
          <TableRow>
            <TableCell className="scs__tab-view__label">Licence #:</TableCell>
            <TableCell>{asText(summary.scalerLicenceNo)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="scs__tab-view__label">Scaler (Client / Loc):</TableCell>
            <TableCell>{asText(formatClientLoc(summary.clientNumber))}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="scs__tab-view__label">Reg / Dist:</TableCell>
            <TableCell>{asText(summary.orgUnitName)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="scs__tab-view__label">Licence Type(s):</TableCell>
            <TableCell>{summaryLicenceTypes || asText(summary.licenceTypes)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="scs__tab-view__label">Effective Date:</TableCell>
            <TableCell>{asText(summary.issuedDate)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="scs__tab-view__label">Expiry Date:</TableCell>
            <TableCell>{asText(summary.expiryDate)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="scs__tab-view__label">Scaler Oath Taken?</TableCell>
            <TableCell>{ynToDisplay(summary.oathTakenInd)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="scs__tab-view__label">Licence Status:</TableCell>
            <TableCell>{asText(summary.licenceStatus)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default SummaryTab;


