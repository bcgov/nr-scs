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
import type { SummaryCheckScaleRow } from '@/services/summaryCheckScales.service';
import { asText } from '@/utils/display';

interface Props {
  rows: SummaryCheckScaleRow[];
  /** CHECK_SCALE_TYPE_CODE descriptions keyed by code; falls back to the raw code. */
  checkScaleTypeDescriptions: Map<string, string>;
  /**
   * Route state attached to the Check Scale # drilldown so the summary update page's
   * context-sensitive Back button appears and returns to the originating tab.
   */
  drilldownState: { backTo: string; scalerName: string };
}

const summaryUpdatePath = (checkScaleId: number): string =>
  `/summary-check-scales/${encodeURIComponent(String(checkScaleId))}/edit`;

/**
 * The legacy "Summary Check Scales" result table (P132, summaryCheckScaleList.jsp), rendered on the
 * Scaler Summary Check Scales tab. Sibling of {@link CheckScaleSummaryTable}: it shows the Summary
 * Type column and no secondary licence columns, and the Check Scale # links to the summary update
 * screen (carrying route state so its Back returns here). The sort keys, licence-link column and
 * the date/variance/indicator block are shared from `checkScaleTable/sharedColumns`.
 */
const SummaryCheckScaleListTable: FC<Props> = ({
  rows,
  checkScaleTypeDescriptions,
  drilldownState,
}) => {
  const { sortedRows, sortKey, sortDirection, onSortChange } = useClientTableSort(
    rows,
    CHECK_SCALE_NUMERIC_SORT_KEYS,
  );

  const typeLabel = checkScaleTypeLabel(checkScaleTypeDescriptions);

  const headers: TableHeaderType<SummaryCheckScaleRow>[] = [
    {
      key: 'checkScaleId',
      header: 'Check Scale #',
      selected: true,
      sortable: true,
      renderAs: (_value, row) =>
        row?.checkScaleId != null ? (
          <PermissionLink
            permission={PERMISSIONS.SUMMARY_CHECK_SCALE_UPDATE}
            className="scs__tab-view__table-link"
            to={summaryUpdatePath(row.checkScaleId)}
            state={drilldownState}
          >
            {row.checkScaleId}
          </PermissionLink>
        ) : (
          '—'
        ),
    },
    licenceColumn<SummaryCheckScaleRow>('primOrigLicenceNo', 'Primary Licence #', (row) => row?.primOrigLicenceNo),
    licenceColumn<SummaryCheckScaleRow>('primCheckLicenceNo', 'Primary Check Licence #', (row) => row?.primCheckLicenceNo),
    {
      key: 'ckscType',
      header: 'Summary Type',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => asText(row?.ckscType),
    },
    ...checkScaleVarianceColumns<SummaryCheckScaleRow>(typeLabel),
  ];

  const content = toPageableContent(
    sortedRows,
    (row, index) => row.checkScaleId ?? `summary-check-scale-${index}`,
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

export default SummaryCheckScaleListTable;
