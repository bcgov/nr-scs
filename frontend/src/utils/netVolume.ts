/**
 * Formats a check-scale net volume for display with at least one and at most three decimal places.
 *
 * Legacy renders these volumes at full stored precision — NUMBER(_,3), so up to three decimals:
 * `updateSummaryCheckScale.jsp` uses DecimalFormat `format="0.0##"`, and `viewCheckScale.jsp` /
 * `createCheckScale2.jsp` / `updateCheckScale.jsp` print the value raw, because their `format="0"` /
 * `format="0.0"` is inert — `CheckScaleBo.origNetVolume` and `SpeciesProductGradeBo.orgNetVolume`
 * hold the value as a String and Struts' `bean:write` only applies a format to a Number or Date.
 * So one decimal place is not the legacy format anywhere; `0.0##` is the one the legacy code states
 * explicitly, and it is what we use for every net-volume display.
 *
 * Returns '' for a blank or non-numeric value.
 */
export const formatNetVolume = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return '';
  }
  // No grouping separator: DecimalFormat "0.0##" has none, and these render inside inputs.
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 3,
    useGrouping: false,
  }).format(numeric);
};
