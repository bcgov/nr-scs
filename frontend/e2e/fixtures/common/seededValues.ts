/**
 * Values that must match specific rows in the seeded Oracle test database.
 *
 * The repository is public, so it carries only synthetic placeholders here. To run the scenarios
 * that depend on these rows against the seeded database, export the real values as environment
 * variables before running the suite — see `e2e/.env.example` for the names.
 * With the placeholders, those scenarios fail at the first lookup that needs the real row.
 */
const fromEnv = (name: string, placeholder: string): string => {
  const value = process.env[name]?.trim();
  return value ? value : placeholder;
};

/** Synthetic placeholders, as they appear in fixtures and `.feature` files. */
export const SEEDED_PLACEHOLDERS = {
  /** An inspector present in scs_user_info_vw (un-dashed 32-hex IDIR GUID). */
  inspectorGuid: '0000000000000000000000000000E2E1',
  /** Client name of the scaler on risk assessment 723 (UC-QRY-007 search row). */
  riskSearchScalerClientName: 'SAMPLE, SCALER A',
  /** Client name of scaler 019D, the UC-RSK-006 happy-path create subject. */
  riskCompleteScalerClientName: 'SAMPLE, SCALER B',
} as const;

/** The values the suite actually uses: the env override when set, otherwise the placeholder. */
export const SEEDED = {
  inspectorGuid: fromEnv('E2E_INSPECTOR_GUID', SEEDED_PLACEHOLDERS.inspectorGuid),
  riskSearchScalerClientName: fromEnv(
    'E2E_RISK_SEARCH_SCALER_CLIENT_NAME',
    SEEDED_PLACEHOLDERS.riskSearchScalerClientName,
  ),
  riskCompleteScalerClientName: fromEnv(
    'E2E_RISK_COMPLETE_SCALER_CLIENT_NAME',
    SEEDED_PLACEHOLDERS.riskCompleteScalerClientName,
  ),
} as const;

/**
 * Maps a placeholder written in a `.feature` step to its effective value, so Gherkin can stay
 * synthetic. Any other text is returned unchanged.
 */
export const resolveSeeded = (text: string): string => {
  for (const key of Object.keys(SEEDED_PLACEHOLDERS) as (keyof typeof SEEDED_PLACEHOLDERS)[]) {
    if (text === SEEDED_PLACEHOLDERS[key]) {
      return SEEDED[key];
    }
  }
  return text;
};
