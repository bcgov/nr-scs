package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * Form-input identifier used to associate a {@link ValidationFieldError}
 * with a specific UI field. Values mirror — and must stay in sync with —
 * the {@code FieldError.field} enum on the generated API DTO.
 *
 * <p>Producer: {@code CheckScaleService} validation rules.
 * Consumer: {@code CheckScaleApiMapper} when projecting a domain
 * {@link CheckScaleValidationResult} to the wire response.
 */
public enum ValidationField {
  RETURN_TYPE,
  CHECK_SCALE_DDN,
  CHECK_SCALE_DDV,
  ORIGINAL_SCALE_DDN,
  ORIGINAL_SCALE_DDV
}
