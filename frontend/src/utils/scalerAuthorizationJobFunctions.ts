import type { StaticLov } from '@/services/lov.service';

/**
 * Job Function codes the Scaler Authorization screens are allowed to offer.
 *
 * Mirrors the legacy app, whose update screen rendered exactly three hard-coded
 * checkboxes — Piece (P), Weigh (W) and SFP (S). The SCALE_METHOD_TYPE_CODE LOV
 * also contains "Cruise Based" (C), which the legacy screen never offered, so it
 * is excluded here by using the same positive allowlist rather than the full LOV.
 */
export const SCALER_AUTHORIZATION_JOB_FUNCTION_CODES = ['P', 'W', 'S'] as const;

/**
 * Restrict a SCALE_METHOD_TYPE_CODE LOV to the Job Functions the Scaler
 * Authorization screens support, dropping "Cruise Based" (and any other codes
 * not offered by the legacy screen).
 */
export const filterScalerAuthorizationJobFunctions = (options: StaticLov[]): StaticLov[] => {
  const allowed = SCALER_AUTHORIZATION_JOB_FUNCTION_CODES as readonly string[];
  return options.filter((option) =>
    allowed.includes(String(option.code ?? '').trim().toUpperCase()),
  );
};
