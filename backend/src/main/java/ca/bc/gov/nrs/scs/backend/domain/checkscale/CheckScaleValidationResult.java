package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.util.List;

/**
 * Outcome of step-1 validation. When valid, carries the enriched preview
 * payload used to render step 2; when invalid, carries the field-keyed
 * error list. Per-species roll-up data lives inside
 * {@code checkScale.speciesSummary()}.
 *
 * <p>Producer: {@code CheckScaleService.validate}.
 * Consumer: {@code CheckScaleApiMapper.toValidationResponse} when projecting
 * to the wire {@code CheckScaleValidationResponse}.
 */
public record CheckScaleValidationResult(
    boolean ok,
    List<ValidationFieldError> errors,
    CheckScale checkScale) {}
