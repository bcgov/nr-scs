/**
 * Shared DOM knowledge for the Summary Check Scale screens. Both the Create and Update pages render
 * the SAME form components (SummaryCheckScaleForm + SpgRowFields), so the stable element ids live
 * here once and are reused by both page objects (reuse over duplication). The mock-auth login/nav
 * dance and date-field helper are cross-domain and live in pages/common/authNav.ts instead.
 */

/** Visible field label -> stable element id (nr-scs SummaryCheckScaleForm / SpgRowFields). */
export const SUMMARY_CHECK_SCALE_FIELD_IDS: Record<string, string> = {
  // Header
  'Check Scale Type': '#check-scale-type',
  'Check Scaler Licence': '#check-scaler-licence',
  'Original Scaler Licence': '#original-scaler-licence',
  'Load Arrival Number': '#load-arrival-number',
  'Weigh Slip Number': '#weigh-slip-number',
  'Timber Mark': '#timber-mark',
  'Scale Site Number': '#scale-site-number',
  'Followed Good Practices': '#followed-good-practices',
  'Original within Standard': '#original-within-standard',
  'Check Replaces Original': '#check-replaces-original',
  'Partial Load': '#partial-load',
  'Original Date of Scale': '#original-date-of-scale',
  'Check Date of Scale': '#check-date-of-scale',
  'Original Scale Return': '#original-scale-return',
  'Check Scale Return': '#check-scale-return',
  'Check Scaler Comment': '#check-scaler-comment',
  // SPG row
  Species: '#species',
  Product: '#product',
  Grade: '#grade',
  'Original Pieces': '#original-pieces',
  'Check Scale Pieces': '#check-pieces',
  'Original Net Volume': '#original-net-volume',
  'Check Scale Net Volume': '#check-net-volume',
  'Original Net Value': '#original-net-value',
  'Check Scale Net Value': '#check-net-value',
};

/** Ids of the six SPG numeric fields, in form order. */
export const SPG_NUMERIC_IDS = [
  '#original-pieces',
  '#check-pieces',
  '#original-net-volume',
  '#check-net-volume',
  '#original-net-value',
  '#check-net-value',
] as const;

/** Labels whose control is a Carbon <Select> (native select) — set with selectOption, not fill. */
export const SELECT_FIELD_LABELS = new Set<string>([
  'Check Scale Type',
  'Followed Good Practices',
  'Original within Standard',
  'Check Replaces Original',
  'Partial Load',
  'Species',
  'Product',
  'Grade',
]);

/** Labels backed by the Carbon DatePicker (flatpickr, dateFormat Y-m-d, allowInput, no maxDate). */
export const DATE_FIELD_LABELS = new Set<string>(['Original Date of Scale', 'Check Date of Scale']);

/** Resolve a field id by visible label; throws on an unknown label (a test-authoring bug). */
export function fieldId(label: string): string {
  const id = SUMMARY_CHECK_SCALE_FIELD_IDS[label];
  if (!id) throw new Error(`Unknown Summary Check Scale field: "${label}". Add it to SUMMARY_CHECK_SCALE_FIELD_IDS.`);
  return id;
}

// setDateField note: no maxDate is set on the summary check-scale date fields, so future dates ARE
// enterable — the client validator flags them ("Scale dates cannot be in the future."). The helper
// itself lives in pages/common/authNav.ts (cross-domain).
