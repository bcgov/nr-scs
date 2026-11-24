package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * One validation error, tied to a specific form input.
 *
 * <p>Producer: {@code CheckScaleService} validation rules; cross-field rules
 * (e.g. "Check DDN cannot equal Original DDN") emit one entry per affected
 * field. Consumer: {@code CheckScaleApiMapper} when projecting to the wire
 * {@code FieldError} DTO.
 */
public record ValidationFieldError(ValidationField field, String message) {}
