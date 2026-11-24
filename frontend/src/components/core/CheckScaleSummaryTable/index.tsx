import { type FC } from 'react';

import PermissionLink from '@/components/core/PermissionLink';
import {
  CHECK_SCALE_NUMERIC_SORT_KEYS,
  checkScaleTypeLabel,
  checkScaleVarianceColumns,
  licenceColumn,
} from '@/components/core/checkScaleTable/sharedColumns';
import { PERMISSIONS } from '@/context/auth/permissions';
import TableResource from '@/components/Form/TableResource';
import { toPageableContent, useClientTableSort } from '@/components/Form/TableResource/clientTable';
import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { CheckScaleSummaryRow } from '@/services/checkScales.service';

interface Props {
  rows: CheckScaleSummaryRow[];
  /** CHECK_SCALE_TYPE_CODE descriptions keyed by code; falls back to the raw code. */
  checkScaleTypeDescriptions: Map<string, string>;
  /** List URL passed as { backTo } route state on the drilldown so the view returns here. */
  backTo?: string;
}

const checkScaleViewPath = (checkScaleId: number): string =>
  `/check-scales/view/${encodeURIComponent(String(checkScaleId))}`;

/**
 * The legacy "Check Scale Summary" result table, shared by the Scaler and Scale Site
 * Check Scales tabs (both legacy JSPs render identical columns). Client-side header
 * sorting follows the maintenance-pages TableResource pattern; NONE falls back to the
 * backend's legacy ordering (check scale date desc).
 *
 * Columns from `checkScaleTable/sharedColumns` are common with {@link SummaryCheckScaleListTable};
 * the secondary licence pair and the drilldown target are what make this table distinct.
 */
const CheckScaleSummaryTable: FC<Props> = ({ rows, checkScaleTypeDescriptions, backTo }) => {
  const { sortedRows, sortKey, sortDirection, onSortChange } = useClientTableSort(
    rows,
    CHECK_SCALE_NUMERIC_SORT_KEYS,
  );

  const typeLabel = checkScaleTypeLabel(checkScaleTypeDescriptions);

  const headers: TableHeaderType<CheckScaleSummaryRow>[] = [
    {
      key: 'checkScaleId',
      header: 'Check Scale #',
      selected: true,
      sortable: true,
      renderAs: (_value, row) =>
        row?.checkScaleId != null ? (
          <PermissionLink
            className="scs__tab-view__table-link"
            permission={PERMISSIONS.CHECK_SCALE_QUERY}
            to={checkScaleViewPath(row.checkScaleId)}
            state={backTo ? { backTo } : undefined}
          >
            {row.checkScaleId}
          </PermissionLink>
        ) : (
          '—'
        ),
    },
    licenceColumn<CheckScaleSummaryRow>('primOrigLicenceNo', 'Primary Licence #', (row) => row?.primOrigLicenceNo),
    licenceColumn<CheckScaleSummaryRow>('secOrigLicenceNo', 'Secondary Licence #', (row) => row?.secOrigLicenceNo),
    licenceColumn<CheckScaleSummaryRow>('primCheckLicenceNo', 'Primary Check Licence #', (row) => row?.primCheckLicenceNo),
    licenceColumn<CheckScaleSummaryRow>('secCheckLicenceNo', 'Secondary Check Licence #', (row) => row?.secCheckLicenceNo),
    ...checkScaleVarianceColumns<CheckScaleSummaryRow>(typeLabel),
  ];

  const content = toPageableContent(
    sortedRows,
    (row, index) => row.checkScaleId ?? `check-scale-${index}`,
  );

  return (
    <TableResource
      headers={headers}
      content={content}
      loading={false}
      error={false}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      showEmptyTableWhenNoResults
    />
  );
};

export default CheckScaleSummaryTable;
