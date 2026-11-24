package ca.bc.gov.nrs.scs.backend.exception;

import java.util.List;

/**
 * Thrown when one or more request fields fail server-side validation that bean validation cannot
 * express (e.g. referential existence checks — scaler licence, timber mark, scale site). Carries
 * per-field messages so {@code GlobalApiExceptionHandler} can return them as structured
 * {@code fieldErrors} for inline display, rather than a single banner message.
 */
public class FieldValidationException extends RuntimeException {

  /** One field-scoped validation error. {@code field} is the request field name (e.g. {@code timberMark}). */
  public record FieldErrorDetail(String field, String message) {}

  private final transient List<FieldErrorDetail> fieldErrors;

  public FieldValidationException(List<FieldErrorDetail> fieldErrors) {
    super("Validation failed for one or more fields.");
    this.fieldErrors = List.copyOf(fieldErrors);
  }

  public List<FieldErrorDetail> getFieldErrors() {
    return fieldErrors;
  }
}
