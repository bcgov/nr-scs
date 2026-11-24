import type { SpeciesSummaryRow, SpeciesSummaryTotals } from '@/components/core/SpeciesProductGradeSummary';
import type { CheckScaleApiModel } from '@/services/checkScales.service';
import type { StaticLov } from '@/services/lov.service';
import { formatNetVolume } from '@/utils/netVolume';

import type { CheckScaleFormValues } from './index';

export const asString = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

export const ynToDisplay = (value?: string | null): 'Yes' | 'No' | '' => {
  if (value === 'Y') {
    return 'Yes';
  }
  if (value === 'N') {
    return 'No';
  }
  return '';
};

export const toNumberOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') {
    return null;
  }
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

export const formatDecimal = (value: number | null | undefined, places: number): string =>
  value === null || value === undefined ? '' : value.toFixed(places);

/**
 * Maps a loaded check scale into the shared {@link CheckScaleFormValues}. Net value is displayed at
 * {@code netValueDecimals} places — 0 on the read-only view (legacy format="0"), 2 on the editable
 * form so the stored NUMBER(8,2) precision survives a save. Tops/butts default to 0 and length to
 * 0.0 (legacy format="0"/"0.0"); net volume stays blank when absent and otherwise keeps its stored
 * precision — see {@link formatNetVolume}.
 */
export const buildFormValues = (
  apiModel: CheckScaleApiModel,
  netValueDecimals: number,
): CheckScaleFormValues => {
  const isSample = Boolean(apiModel.chkSampleLogTallyDocNo);
  return {
    returnType: isSample ? 'Sample Log Tally' : 'Log Tally',
    checkDdn: asString(isSample ? apiModel.chkSampleLogTallyDocNo : apiModel.chkLogTallyDocNo),
    checkDdv: asString(isSample ? apiModel.chkSampleLogTallyVer : apiModel.chkLogTallyVer),
    originalDdn: asString(isSample ? apiModel.orgSampleLogTallyDocNo : apiModel.orgLogTallyDocNo),
    originalDdv: asString(isSample ? apiModel.orgSampleLogTallyVer : apiModel.orgLogTallyVer),

    checkScaleType: asString(apiModel.checkScaleTypeCode),
    followedGoodPractices: ynToDisplay(apiModel.followedGoodPracticeInd),
    originalWithinStandard: ynToDisplay(apiModel.originalWithinStandardInd),
    comment: asString(apiModel.chkScalerCommentTxt),
    originalNetValue: formatDecimal(toNumberOrNull(apiModel.originalScaleNetValue), netValueDecimals),
    checkNetValue: formatDecimal(toNumberOrNull(apiModel.checkScaleNetValue), netValueDecimals),

    checkScalerLicence: asString(apiModel.checkScalerLicenceNo),
    originalScalerLicence: asString(apiModel.originalScalerLicenceNo),
    secondScalerLicence: asString(apiModel.secondScalerLicenceNo),
    loadArrival: asString(apiModel.loadArrivalNumber),
    weighSlip: asString(apiModel.weighSlipNumber),
    timberMark: asString(apiModel.timberMark),
    scaleSite: asString(apiModel.scaleSiteIdNmbr),
    checkReplacesOriginal: ynToDisplay(apiModel.checkReplacesOriginalInd),
    population: asString(apiModel.population),
    stratum: asString(apiModel.stratum),
    year: asString(apiModel.samplingYear),

    originalScaleDate: asString(apiModel.originalScaleDate),
    checkScaleDate: asString(apiModel.chkScaleDate),
    originalScaleReturn: asString(apiModel.originalScaleReturnNo),
    checkScaleReturn: asString(apiModel.chkScaleReturnNo),
    originalTops: asString(apiModel.originalScaleTotalTops ?? 0),
    checkTops: asString(apiModel.chkScaleTotalTops ?? 0),
    originalButts: asString(apiModel.originalScaleTotalButts ?? 0),
    checkButts: asString(apiModel.chkScaleTotalButts ?? 0),
    originalLength: formatDecimal(toNumberOrNull(apiModel.originalScaleTotalLength) ?? 0, 1),
    checkLength: formatDecimal(toNumberOrNull(apiModel.chkScaleTotalLength) ?? 0, 1),
    originalNetVolume: formatNetVolume(toNumberOrNull(apiModel.originalScaleTotalVolume)),
    checkNetVolume: formatNetVolume(toNumberOrNull(apiModel.chkScaleTotalVolume)),
  };
};

/**
 * Maps the species summary into rows for {@link SpeciesProductGradeSummary}, resolving codes to
 * descriptions and formatting net volumes at their stored precision ({@link formatNetVolume}).
 */
export const buildSpeciesRows = (
  speciesSummary: CheckScaleApiModel['speciesSummary'],
  speciesLov: StaticLov[],
  gradeLov: StaticLov[],
  productLov: StaticLov[],
): SpeciesSummaryRow[] => {
  const describeCode = (lov: StaticLov[], code: string | null | undefined): string | null => {
    if (!code) {
      return null;
    }
    return lov.find((o) => o.code === code)?.description ?? code;
  };
  return (speciesSummary ?? []).map((row, index) => ({
    id: `${row.speciesCode ?? 'UNK'}-${row.speciesGrade ?? 'UNK'}-${row.productCode ?? 'UNK'}-${index}`,
    species: describeCode(speciesLov, row.speciesCode),
    speciesGrade: describeCode(gradeLov, row.speciesGrade),
    productCode: describeCode(productLov, row.productCode),
    orgPieces: row.orgPieces ?? null,
    orgNetVolume: row.orgNetVolume == null ? null : formatNetVolume(row.orgNetVolume),
    orgNetValue: row.orgNetValue == null ? null : Number(row.orgNetValue).toFixed(2),
    chkPieces: row.chkPieces ?? null,
    chkNetVolume: row.chkNetVolume == null ? null : formatNetVolume(row.chkNetVolume),
    chkNetValue: row.chkNetValue == null ? null : Number(row.chkNetValue).toFixed(2),
  }));
};

/**
 * Sums the SPG rows into the formatted totals row shown on the summary check scale (legacy
 * updateSummaryCheckScale.jsp). Pieces are integer sums; volumes keep their stored precision and
 * values show 2 decimals, matching {@link buildSpeciesRows}.
 */
export const buildSpeciesTotals = (
  speciesSummary: CheckScaleApiModel['speciesSummary'],
): SpeciesSummaryTotals => {
  const rows = speciesSummary ?? [];
  const sum = (pick: (row: (typeof rows)[number]) => number | null | undefined): number =>
    rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);

  return {
    orgPieces: sum((row) => row.orgPieces),
    orgNetVolume: formatNetVolume(sum((row) => row.orgNetVolume)),
    orgNetValue: sum((row) => row.orgNetValue).toFixed(2),
    chkPieces: sum((row) => row.chkPieces),
    chkNetVolume: formatNetVolume(sum((row) => row.chkNetVolume)),
    chkNetValue: sum((row) => row.chkNetValue).toFixed(2),
  };
};
