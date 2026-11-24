import { Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TextArea } from '@carbon/react';
import { type FC, useState } from 'react';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import WhoDidIt from '@/components/core/WhoDidIt';
import type { StaticLov } from '@/services/lov.service';
import type { ScaleSiteSummary } from '@/services/scaleSites.service';

import { asText, buildScaleSiteSiteTypeDisplayRows, formatCoordinate, formatOwnerClientDisplay } from '../../utils';
import ScaleSiteEditModal from '../ScaleSiteEditModal';

interface Props {
  summary: ScaleSiteSummary;
  priorityLovs: StaticLov[];
  scaleMethodTypeLovs: StaticLov[];
}

const SummaryTab: FC<Props> = ({ summary, priorityLovs, scaleMethodTypeLovs }) => {
  const [editOpen, setEditOpen] = useState(false);

  const siteTypeRows = buildScaleSiteSiteTypeDisplayRows(
    summary.siteTypes,
    priorityLovs,
    scaleMethodTypeLovs,
  );

  const detailRows = [
    { key: 'scaleSiteIdNmbr', label: 'Scale Site #', value: asText(summary.scaleSiteIdNmbr) },
    { key: 'siteName', label: 'Scale Site Name', value: asText(summary.siteName) },
    {
      key: 'ownerClient',
      label: 'Site Owner (Client / Loc)',
      value: formatOwnerClientDisplay(summary.ownerClientNumber, summary.ownerClientLocnCode),
    },
    { key: 'regDist', label: 'Reg / Dist', value: asText(summary.regDistDisplay) },
    { key: 'timberBrand', label: 'Timber Brand', value: asText(summary.timberBrand) },
    {
      key: 'latitude',
      label: 'Latitude',
      value: formatCoordinate(
        summary.latitudeDegrees,
        summary.latitudeMinutes,
        summary.latitudeSeconds,
      ),
    },
    {
      key: 'longitude',
      label: 'Longitude',
      value: formatCoordinate(
        summary.longitudeDegrees,
        summary.longitudeMinutes,
        summary.longitudeSeconds,
      ),
    },
  ];

  const siteLocationValue = summary.siteLocation?.trim() ?? '';

  return (
    <div className="scs__tab-view__panel">
      <div className="scs__view-tab-actions scs__view-tab-actions--top scs__view-tab-actions--wide">
        <PermissionGate permission={PERMISSIONS.SCALE_SITE_UPDATE}>
          <Button kind="primary" type="button" size="sm" onClick={() => setEditOpen(true)}>
            Edit Record
          </Button>
        </PermissionGate>
        <WhoDidIt audit={summary} />
      </div>

      <h4 className="view-scale-site__section-title">Site Type</h4>
      <Table
        size="sm"
        useZebraStyles
        className="scs__tab-view__table scs__tab-view__table--wide"
        aria-label="Scale site summary details"
      >
        <TableBody>
          {detailRows.map((detailRow) => (
            <TableRow key={detailRow.key}>
              <TableCell className="scs__tab-view__label">{detailRow.label}:</TableCell>
              <TableCell>{detailRow.value}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="scs__tab-view__label">Description of Site Location:</TableCell>
            <TableCell>
              <Layer>
                <TextArea
                  id="site-location-description"
                  className="view-scale-site__site-location"
                  labelText="Description of Site Location"
                  hideLabel
                  readOnly
                  rows={5}
                  value={siteLocationValue}
                />
              </Layer>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>


      <section className="view-scale-site__section">
        <Table
          size="sm"
          useZebraStyles
          className="scs__tab-view__table scs__tab-view__table--compact"
          aria-label="Scale site types"
          style={{ marginBottom: 0 }}
        >
          <TableHead>
            <TableRow>
              <TableHeader>Priority</TableHeader>
              <TableHeader>Site Type</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {siteTypeRows.map((siteTypeRow) => (
              <TableRow key={siteTypeRow.slot}>
                <TableCell>{siteTypeRow.priorityDescription}</TableCell>
                <TableCell>{siteTypeRow.scaleMethodTypeDescription}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {editOpen ? (
        <ScaleSiteEditModal open={editOpen} onClose={() => setEditOpen(false)} summary={summary} />
      ) : null}
    </div>
  );
};

export default SummaryTab;

