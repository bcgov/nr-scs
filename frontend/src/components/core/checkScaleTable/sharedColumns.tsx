import ScalerLicenceLink from '@/components/core/ScalerLicenceLink';
import type { TableHeaderType } from '@/components/Form/TableResource/types';
import { asText, formatVariance, ynToDisplay } from '@/utils/display';

/**
 * The fields both check-scale result tables render identically. `CheckScaleSummaryRow` (detail
 * tab) and `SummaryCheckScaleRow` (summary list) each extend this with their own extra columns —
 * secondary licences on one, Summary Type on the other — so the shared columns are built once here.
 */
export interface CheckScaleVarianceRow {
  checkScaleId?: number | null;
  primCheckLicenceNo?: string | null;
  primOrigLicenceNo?: string | null;
  origScaleDate?: string | null;
  checkScaleDate?: string | null;
  pieceDiff?: number | null;
  volumeVariance?: number | null;
  valueVariance?: number | null;
  replacedInd?: string | null;
  checkScaleTypeCode?: string | null;
  followedGoodPracticeInd?: string | null;
  originalWithinStandardInd?: string | null;
}

/** Columns sorted numerically rather than as text; the rest fall back to case-insensitive text. */
export const CHECK_SCALE_NUMERIC_SORT_KEYS = new Set<keyof CheckScaleVarianceRow>([
  'checkScaleId',
  'pieceDiff',
  'volumeVariance',
  'valueVariance',
]);

/** Resolves a CHECK_SCALE_TYPE_CODE to its description, falling back to the raw code. */
export const checkScaleTypeLabel =
  (descriptions: Map<string, string>) =>
  (code?: string | null): string => {
    const normalized = (code ?? '').trim();
    if (normalized.length === 0) {
      return '—';
    }

    return descriptions.get(normalized) ?? normalized;
  };

/** A licence-number column rendered as a link to the scaler record. */
export const licenceColumn = <T extends CheckScaleVarianceRow>(
  key: keyof T & string,
  header: string,
  pick: (row?: T) => string | null | undefined,
): TableHeaderType<T> => ({
  key,
  header,
  selected: true,
  sortable: true,
  renderAs: (_value, row) => <ScalerLicenceLink licenceNo={pick(row)} />,
});

/**
 * The date / variance / indicator columns shared verbatim by both tables, in their legacy order.
 * Callers splice their own columns around these.
 */
export const checkScaleVarianceColumns = <T extends CheckScaleVarianceRow>(
  typeLabel: (code?: string | null) => string,
): TableHeaderType<T>[] => [
  {
    key: 'origScaleDate' as keyof T & string,
    header: 'Original Scale Date',
    selected: true,
    sortable: true,
    renderAs: (_value, row) => asText(row?.origScaleDate),
  },
  {
    key: 'checkScaleDate' as keyof T & string,
    header: 'Check Scale Date',
    selected: true,
    sortable: true,
    renderAs: (_value, row) => asText(row?.checkScaleDate),
  },
  {
    key: 'pieceDiff' as keyof T & string,
    header: 'Piece Diff.',
    selected: true,
    sortable: true,
    renderAs: (_value, row) => asText(row?.pieceDiff),
  },
  {
    key: 'volumeVariance' as keyof T & string,
    header: 'Volume Variance %',
    selected: true,
    sortable: true,
    renderAs: (_value, row) => formatVariance(row?.volumeVariance),
  },
  {
    key: 'valueVariance' as keyof T & string,
    header: 'Value Variance %',
    selected: true,
    sortable: true,
    renderAs: (_value, row) => formatVariance(row?.valueVariance),
  },
  {
    key: 'replacedInd' as keyof T & string,
    header: 'Replaced?',
    selected: true,
    sortable: true,
    renderAs: (_value, row) => ynToDisplay(row?.replacedInd),
  },
  {
    key: 'checkScaleTypeCode' as keyof T & string,
    header: 'Check Scale Type',
    selected: true,
    sortable: true,
    renderAs: (_value, row) => typeLabel(row?.checkScaleTypeCode),
  },
  {
    key: 'followedGoodPracticeInd' as keyof T & string,
    header: 'Good Practices?',
    selected: true,
    sortable: true,
    renderAs: (_value, row) => ynToDisplay(row?.followedGoodPracticeInd),
  },
  {
    key: 'originalWithinStandardInd' as keyof T & string,
    header: 'Within Standard?',
    selected: true,
    sortable: true,
    renderAs: (_value, row) => ynToDisplay(row?.originalWithinStandardInd),
  },
];
