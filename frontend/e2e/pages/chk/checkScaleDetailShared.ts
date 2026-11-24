/**
 * Shared DOM knowledge for the DETAIL check-scale outcome fields. Both the Create (step 2 preview) and
 * Edit screens render the same `CheckScaleForm`, so the editable field ids live here once and are
 * reused by both page objects (reuse over duplication — mirrors how summaryCheckScaleShared.ts serves
 * the summary Create/Update pages). The Carbon error-locator is cross-domain and lives in
 * pages/common/carbonHelpers.ts instead.
 */

/** Editable outcome-field label -> stable element id (nr-scs CheckScaleForm). */
export const CHECK_SCALE_OUTCOME_FIELD_IDS: Record<string, string> = {
  'Check Scale Type': '#check-scale-type',
  'Followed Good Practices': '#followed-good-practices',
  'Original within Standard': '#original-within-standard',
  'Original Net Value': '#orig-net',
  'Check Net Value': '#check-net',
  'Check Scaler Comment': '#check-scaler-comment',
};

/** Labels whose control is a Carbon <Select> (native select) — set with selectOption, not fill. */
export const CHECK_SCALE_SELECT_FIELDS = new Set<string>([
  'Check Scale Type',
  'Followed Good Practices',
  'Original within Standard',
]);

/**
 * Read-only field label -> stable element id for the DETAIL check-scale VIEW screen (UC-CHK-003).
 * The view renders `CheckScaleForm mode="view"`, which shows every field read-only (a superset of the
 * editable outcome fields above) plus the HBS-derived header and the scale-comparison grid. Ids are the
 * real `CheckScaleForm` ids (index.tsx). The three scaler-licence fields render as Carbon <Link>s (an
 * `<a id=...>`) when they carry a value — see `checkScaleLicenceLinkHref`.
 */
export const CHECK_SCALE_VIEW_FIELD_IDS: Record<string, string> = {
  'Check Scale Type': '#check-scale-type',
  'Check Scaler Licence #': '#check-scaler-licence',
  'Original Scaler Licence #': '#original-scaler-licence',
  'Second Scaler Licence #': '#second-scaler-licence',
  'Load Arrival #': '#load-arrival',
  'Weigh Slip #': '#weigh-slip',
  'Timber Mark': '#timber-mark',
  'Scale Site #': '#scale-site',
  'Followed Good Practices?': '#followed-good-practices',
  'Original within Standard?': '#original-within-standard',
  'Check Replaces Original?': '#check-replaces-original',
  Population: '#population',
  Stratum: '#stratum',
  Year: '#year',
  'Check Scaler Comment': '#check-scaler-comment',
};

/** The scaler-summary link a view-mode licence field points at (View/CheckScale scalerSummaryHref). */
export const checkScaleLicenceLinkHref = (licenceNo: string): string =>
  `/scalers/view/${encodeURIComponent(licenceNo)}`;
