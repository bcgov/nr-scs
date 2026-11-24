export { asText, formatPhone, ynToDisplay } from '@/utils/display';

export function formatLicenceTypes(
  licenceTypes?: { code?: string | null; description?: string | null }[] | null,
): string {
  if (!licenceTypes || licenceTypes.length === 0) {
    return '';
  }
  return licenceTypes
    .map((licenceType) => (licenceType ? (licenceType.description ?? licenceType.code ?? '') : ''))
    .map((textValue) => (textValue || '').toString().trim())
    .filter((nonEmptyText): nonEmptyText is string => nonEmptyText.length > 0)
    .join(', ');
}

export function formatClientLoc(clientNumber?: string | null): string | undefined {
  if (!clientNumber) {
    return undefined;
  }
  return `${clientNumber} / 00`;
}

