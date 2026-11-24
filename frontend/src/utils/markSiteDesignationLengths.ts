/**
 * Column-length rules for the Mark Site Designation free-text fields, shared by the create and edit
 * screens so both raise the same field-level message.
 *
 * Legacy enforced these in `HaulingMarkAuthorizationValidator.checkFieldLengths()` and rendered them
 * through the `errors.maxlength` resource ("{field} can not be greater than {n} characters."),
 * highlighting the offending field. The new screens had no length rule at all: an over-length value
 * went to the API and came back as a generic banner naming no field (UC-MSD-002 ERR-019..ERR-022).
 *
 * Deliberately NOT a `maxLength` on the textarea — a hard cap silently truncates a paste, which is
 * the same "no idea what happened" outcome from the other direction. The same choice was made for
 * the maintenance screens (e.g. Authorization Clauses' 200-char clause).
 */
export type MarkSiteDesignationTextField =
  | 'geographicLocation'
  | 'timberDescription'
  | 'transportationDateDesc'
  | 'otherRequirements';

export const MARK_SITE_DESIGNATION_TEXT_LIMITS: ReadonlyArray<{
  key: MarkSiteDesignationTextField;
  label: string;
  max: number;
}> = [
  { key: 'geographicLocation', label: 'Geographic Location', max: 40 },
  { key: 'timberDescription', label: 'Timber Description', max: 40 },
  { key: 'transportationDateDesc', label: 'Transportation Date Desc', max: 200 },
  { key: 'otherRequirements', label: 'Other Requirements', max: 4000 },
];

export type MarkSiteDesignationTextValues = Record<MarkSiteDesignationTextField, string>;

/**
 * Returns one `errors.maxlength` message per over-length field, keyed to match the form state so the
 * offending textarea can be marked invalid.
 *
 * Lengths are measured on the trimmed value because that is what the payload sends (and therefore
 * what the column has to hold) — a value that only exceeds the limit with surrounding whitespace is
 * not a real overflow.
 */
export const validateMarkSiteDesignationTextLengths = (
  values: MarkSiteDesignationTextValues,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const { key, label, max } of MARK_SITE_DESIGNATION_TEXT_LIMITS) {
    if (values[key].trim().length > max) {
      errors[key] = `${label} can not be greater than ${max} characters.`;
    }
  }
  return errors;
};
