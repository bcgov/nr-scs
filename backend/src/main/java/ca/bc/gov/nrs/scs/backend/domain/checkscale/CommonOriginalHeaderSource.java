package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.time.LocalDate;

/**
 * Shared "original side" header accessors — implemented by both
 * {@link LogTallyHeader} and {@link SampleLogTallyHeader}.
 */
public interface CommonOriginalHeaderSource {
  String primaryLicenseNumber();

  String secondaryLicenseNumber();

  LocalDate scaleDate();

  Integer returnNumber();
}
