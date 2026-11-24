/** Max input length for a NUMBER(8,2) net value: 6 integer digits + '.' + 2 decimals. */
export const NET_VALUE_MAX_LENGTH = 9;

/**
 * Validates a net-value field against the legacy NUMBER(8,2) rule (OAValidator): the value must be
 * numeric with at most 6 digits before the decimal point and 2 after. Returns a message to display
 * on the field, or undefined when valid. Empty is reported as required.
 */
export const validateNetValue = (label: string, value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Required.';
  }
  if (Number.isNaN(Number(trimmed))) {
    return `${label} must be a number.`;
  }

  const [intPart, decPart = ''] = trimmed.replace(/^[+-]/, '').split('.');
  if (intPart.length > 6 || decPart.length > 2) {
    return `${label} is too long. Please shorten to 6 digits before the decimal place, and 2 after.`;
  }
  return undefined;
};
