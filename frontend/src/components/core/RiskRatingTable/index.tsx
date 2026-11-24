import { type FC, useMemo } from "react";
import PermissionLink from '@/components/core/PermissionLink';
import { type PERMISSION_TYPE } from '@/context/auth/permissions';

import TableResource from "@/components/Form/TableResource";
import {
  toPageableContent,
  useClientTableSort,
  type ClientTableDefaultSort,
} from "@/components/Form/TableResource/clientTable";
import { asText } from "@/utils/display";
import {
  classifyRiskLevel,
  riskLevelPillClass,
  riskLevelRank,
  type RiskLevelTier,
} from "@/utils/queryUtils";

import type { TableHeaderType } from "@/components/Form/TableResource/types";
import type { RiskRatingSummary } from "@/services/riskAssessment.types";

/**
 * The risk-assessment summary row shown on the read-only "Risk Rating" tabs. Aliases the shared
 * {@link RiskRatingSummary} that both the scaler and scale site services return, so this one
 * component backs both tabs.
 */
export type RiskRatingRow = RiskRatingSummary;

/**
 * A {@link RiskRatingRow} augmented with the sort keys the shared hook needs. These are precomputed
 * once per row (see {@link RiskRatingTable}) so a column's colour, displayed text and sort order all
 * derive from a single source rather than diverging:
 * <ul>
 *   <li>{@code levelRank} — risk severity (low → medium → high) so the Level column sorts by risk
 *       rather than alphabetically; unrecognized levels get {@link UNKNOWN_LEVEL_RANK} so DESC is a
 *       true reverse of ASC instead of pinning them to the bottom of both.
 *   <li>{@code rangeSort} — orders by low then high so the Range column sorts by the exact
 *       {@code low-high} value shown in the cell, not by the low bound alone.
 * </ul>
 */
type SortableRiskRatingRow = RiskRatingRow & {
  levelTier?: RiskLevelTier;
  levelRank: number;
  rangeSort: number | null;
};

// Rank given to a level outside the known H/M/L tiers. A finite sentinel (rather than null, which the
// shared hook sorts last in BOTH directions) keeps the Level sort symmetric — unknown tiers sort as
// the lowest severity in ASC and the highest position in DESC.
const UNKNOWN_LEVEL_RANK = 0;

// Multiplier that packs (rangeLowValue, rangeHighValue) into one sortable number: low dominates, high
// breaks ties. Comfortably larger than any real range bound, so the ordering matches "low-high".
const RANGE_SORT_SCALE = 1_000_000;

// Columns compared numerically by the shared sort hook; the rest compare as case-insensitive text.
// Module-level so the hook's memo isn't invalidated each render.
const NUMERIC_SORT_KEYS = new Set<keyof SortableRiskRatingRow>([
  "riskQuestionnaireId",
  "riskRating",
  "levelRank",
  "rangeSort",
  "versionNo",
]);

// The tab opens newest assessment first. The backend view returns the summaries ascending by
// assessment id (p_primary_sort = 2), so the descending default is applied client-side here.
// Module-level so the hook's state initializer sees a stable value.
const DEFAULT_SORT: ClientTableDefaultSort<SortableRiskRatingRow> = {
  key: "riskQuestionnaireId",
  direction: "DESC",
};

// The classification source (pill colour + severity rank) prefers the code; the display text prefers
// the human-readable description. Colour and rank always agree because they read the same value.
const levelClassificationSource = (
  row: RiskRatingRow,
): string | null | undefined => row.riskTypeCode ?? row.codeDescription;

const levelText = (row: RiskRatingRow): string =>
  asText(row.codeDescription ?? row.riskTypeCode);

// The API returns an ISO date-time whose wall-clock is the stored value (the backend does not shift
// the timezone-naive DATE); show the calendar date + time to the second, matching the legacy screen.
const formatCreated = (value?: string | null): string => {
  if (!value) {
    return "—";
  }
  const trimmed = value.slice(0, 19).replace("T", " ");
  return trimmed.length > 0 ? trimmed : "—";
};

const formatRange = (row: RiskRatingRow): string =>
  row.rangeLowValue != null && row.rangeHighValue != null
    ? `${row.rangeLowValue}-${row.rangeHighValue}`
    : "—";

interface Props {
  rows: RiskRatingRow[];
  /** Builds the href for an assessment id (scaler vs scale site view route). */
  assessmentViewPath: (riskQuestionnaireId: number) => string;
  /** Permission that route requires; injected with the path since both risk subjects share this table. */
  viewPermission: PERMISSION_TYPE;
}

/**
 * Read-only, client-sortable table of risk-assessment summaries with coloured risk-level chips.
 * Built on the shared {@link TableResource} + {@link useClientTableSort} pattern (like the Check
 * Scales tabs). It opens sorted by {@link DEFAULT_SORT} — Assessment ID descending, newest first —
 * and a header click sorts that column ASC then toggles ASC ↔ DESC (there is no unsorted state to
 * cycle back to once a default sort is set). The Level column sorts by the derived severity rank
 * rather than the chip text.
 */
const RiskRatingTable: FC<Props> = ({ rows, assessmentViewPath, viewPermission }) => {
  // Precompute the derived sort keys so display, colour and sort all read from one source per column.
  const sortableRows = useMemo<SortableRiskRatingRow[]>(
    () =>
      rows.map((row) => {
        // Classify the level once per row; both the pill colour and the sort rank derive from it.
        const levelTier = classifyRiskLevel(levelClassificationSource(row));
        return {
          ...row,
          levelTier,
          levelRank: riskLevelRank(levelTier) ?? UNKNOWN_LEVEL_RANK,
          // Gate on both bounds, exactly as formatRange does, so a row that displays "—" sorts with
          // the other blank rows instead of interleaving among valued ranges by its low bound alone.
          rangeSort:
            row.rangeLowValue != null && row.rangeHighValue != null
              ? row.rangeLowValue * RANGE_SORT_SCALE + row.rangeHighValue
              : null,
        };
      }),
    [rows],
  );

  const { sortedRows, sortKey, sortDirection, onSortChange } =
    useClientTableSort(sortableRows, NUMERIC_SORT_KEYS, DEFAULT_SORT);

  const headers: TableHeaderType<SortableRiskRatingRow>[] = [
    {
      key: "riskQuestionnaireId",
      header: "Assessment ID",
      selected: true,
      sortable: true,
      renderAs: (_value, row) =>
        row?.riskQuestionnaireId != null ? (
          <PermissionLink
            className="scs__tab-view__table-link"
            permission={viewPermission}
            to={assessmentViewPath(row.riskQuestionnaireId)}
          >
            {asText(row.riskQuestionnaireId)}
          </PermissionLink>
        ) : (
          asText(row?.riskQuestionnaireId)
        ),
    },
    {
      key: "entryTimestamp",
      header: "Date Created",
      selected: true,
      sortable: true,
      renderAs: (_value, row) => formatCreated(row?.entryTimestamp),
    },
    {
      key: "riskRating",
      header: "Rating",
      selected: true,
      sortable: true,
      renderAs: (_value, row) => asText(row?.riskRating),
    },
    {
      key: "levelRank",
      header: "Level",
      selected: true,
      sortable: true,
      renderAs: (_value, row) => {
        if (!row) {
          return "—";
        }
        const pillClass = riskLevelPillClass(row.levelTier);
        const level = levelText(row);
        return pillClass && level !== "—" ? (
          <span className={pillClass}>{level}</span>
        ) : (
          level
        );
      },
    },
    {
      key: "rangeSort",
      header: "Range",
      selected: true,
      sortable: true,
      renderAs: (_value, row) => (row ? formatRange(row) : "—"),
    },
    {
      key: "ratingDescription",
      header: "Outcome",
      selected: true,
      sortable: true,
      renderAs: (_value, row) => asText(row?.ratingDescription),
    },
    {
      key: "versionNo",
      header: "Template Version",
      selected: true,
      sortable: true,
      renderAs: (_value, row) => asText(row?.versionNo),
    },
  ];

  const content = toPageableContent(
    sortedRows,
    (row, index) => row.riskQuestionnaireId ?? `risk-${index}`,
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

export default RiskRatingTable;
