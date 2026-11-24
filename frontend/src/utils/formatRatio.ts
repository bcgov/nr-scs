/**
 * Formats a value against its total the way the legacy screens do — `4 / 10`, or just the value
 * when there is no total. A missing value renders as an empty string.
 *
 * @param value - The left-hand value (rating, response count, client number).
 * @param total - The right-hand total; omitted from the output when null or undefined.
 * @returns {string} The formatted pair, trimmed.
 */
export const formatRatio = (value: unknown, total: unknown): string => {
  const suffix = total != null ? ` / ${total}` : '';

  return `${value ?? ''}${suffix}`.trim();
};
