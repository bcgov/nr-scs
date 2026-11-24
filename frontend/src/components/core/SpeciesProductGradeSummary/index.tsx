import React, { useMemo } from 'react';
import { DataTable, type DataTableRenderProps, Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '@carbon/react';
import { TrashCan } from '@carbon/icons-react';

import Button from '@/components/core/Button';

export interface SpeciesSummaryRow {
  id: string;
  species?: string | null;
  speciesGrade?: string | null;
  productCode?: string | null;
  orgPieces?: number | string | null;
  orgNetVolume?: number | string | null;
  orgNetValue?: number | string | null;
  chkPieces?: number | string | null;
  chkNetVolume?: number | string | null;
  chkNetValue?: number | string | null;
}

/** Pre-summed totals row for the summary variant (the six numeric columns), already formatted. */
export interface SpeciesSummaryTotals {
  orgPieces?: number | string | null;
  orgNetVolume?: number | string | null;
  orgNetValue?: number | string | null;
  chkPieces?: number | string | null;
  chkNetVolume?: number | string | null;
  chkNetValue?: number | string | null;
}

export interface SpeciesProductGradeSummaryProps {
  rows?: SpeciesSummaryRow[];
  isSortable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /**
   * When provided, renders a per-row delete action column. Receives the row {@code id}; the caller
   * owns the mapping from id back to the composite key it needs to delete. Omit for the read-only
   * usages (detail view/edit).
   */
  onDelete?: (id: string) => void;
  /**
   * When false, the delete buttons render disabled — e.g. the last remaining SPG row cannot be
   * deleted (legacy rule). Ignored unless {@code onDelete} is set.
   */
  canDelete?: boolean;
  /**
   * When true, includes the Original/Check Net Value columns and uses the legacy summary-check-scale
   * column order (Species, Product, Grade). The detail check-scale screens omit net value (legacy
   * parity), so this defaults off.
   */
  showNetValue?: boolean;
  /**
   * Optional bold totals row (legacy updateSummaryCheckScale.jsp). Designed for the summary variant
   * ({@code showNetValue}); pass pre-summed, formatted values.
   */
  totals?: SpeciesSummaryTotals;
}

/** A rendered cell's value: any of the row's data columns. */
type SummaryCellValue = SpeciesSummaryRow[Exclude<keyof SpeciesSummaryRow, 'id'>];

// Detail check-scale order (Species, Grade, Product), no net value — legacy createCheckScale2/view.
const detailHeaders = [
  { key: 'species', header: 'Species' },
  { key: 'speciesGrade', header: 'Species Grade' },
  { key: 'productCode', header: 'Product Code' },
  { key: 'orgPieces', header: 'Original Pieces' },
  { key: 'orgNetVolume', header: 'Original Net Volume' },
  { key: 'chkPieces', header: 'Check Scale Pieces' },
  { key: 'chkNetVolume', header: 'Check Scale Net Volume' },
];

// Summary check-scale order (Species, Product, Grade) with net value — legacy updateSummaryCheckScale.
const summaryHeaders = [
  { key: 'species', header: 'Species' },
  { key: 'productCode', header: 'Product' },
  { key: 'speciesGrade', header: 'Grade' },
  { key: 'orgPieces', header: 'Original Pieces' },
  { key: 'orgNetVolume', header: 'Original Net Volume' },
  { key: 'orgNetValue', header: 'Original Net Value' },
  { key: 'chkPieces', header: 'Check Scale Pieces' },
  { key: 'chkNetVolume', header: 'Check Scale Net Volume' },
  { key: 'chkNetValue', header: 'Check Scale Net Value' },
];

const SpeciesProductGradeSummary: React.FC<SpeciesProductGradeSummaryProps> = ({
  rows = [],
  isSortable = true,
  size = 'md',
  onDelete,
  canDelete = true,
  showNetValue = false,
  totals,
}) => {
  const normalizedRows = useMemo(() => {
    return (rows || []).map((r, i) => ({ ...r, id: r.id ?? `row-${i}` }));
  }, [rows]);

  const showActions = Boolean(onDelete);
  const headers = showNetValue ? summaryHeaders : detailHeaders;

  return (
    <DataTable rows={normalizedRows} headers={headers} isSortable={isSortable} size={size}>
      {({ rows, headers, getHeaderProps, getRowProps, getTableProps }: DataTableRenderProps<SpeciesSummaryRow, SummaryCellValue[]>) => (
        <Table {...getTableProps()}>
          <TableHead>
            <TableRow>
              {headers.map((header) => (
                <TableHeader {...getHeaderProps({ header })} key={header.key}>
                  {header.header}
                </TableHeader>
              ))}
              {showActions ? <TableHeader aria-label="Row actions" /> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow {...getRowProps({ row })} key={row.id}>
                {row.cells.map((cell) => (
                  <TableCell key={cell.id}>{cell.value}</TableCell>
                ))}
                {showActions ? (
                  <TableCell>
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      renderIcon={TrashCan}
                      iconDescription="Delete row"
                      tooltipPosition="left"
                      disabled={!canDelete}
                      onClick={() => onDelete?.(row.id)}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {totals ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <strong>Totals:</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.orgPieces}</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.orgNetVolume}</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.orgNetValue}</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.chkPieces}</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.chkNetVolume}</strong>
                </TableCell>
                <TableCell>
                  <strong>{totals.chkNetValue}</strong>
                </TableCell>
                {showActions ? <TableCell /> : null}
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      )}
    </DataTable>
  );
};

export default SpeciesProductGradeSummary;
