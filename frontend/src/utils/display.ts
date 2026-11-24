/**
 * Shared display normalizers for read-only record views (tables, detail panels).
 * Merged from the previously drifted copies in pages/View/Scaler/utils.ts and
 * pages/View/ScaleSite/utils.ts: trims strings (ScaleSite behavior) and stringifies
 * objects (Scaler behavior); empty renders as an em dash.
 */
export function asText(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : '—';
}

export const ynToDisplay = (value?: string | null): string => {
  if (value === 'Y') {
    return 'Yes';
  }
  if (value === 'N') {
    return 'No';
  }
  return '—';
};

/**
 * Formats a phone number for display, mirroring the legacy FormattingScalerAddressVwDto rule:
 * exactly 10 digits render as (XXX) XXX-XXXX; anything else is returned unchanged.
 */
export const formatPhone = (value?: string | null): string | null | undefined => {
  if (value === null || value === undefined) {
    return value;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10) {
    return value;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};
/** Variance percentages render to one decimal place (legacy format="0.0"); em dash when absent. */
export const formatVariance = (value?: number | null): string =>
  value === null || value === undefined ? '—' : value.toFixed(1);
