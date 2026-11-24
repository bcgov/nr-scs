package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.time.LocalDate;

/**
 * Shared "check side" header accessors — implemented by both {@link LogTallyHeader}
 * and {@link SampleLogTallyHeader} so service code can extract the common fields
 * via one helper regardless of flavor.
 */
public interface CommonCheckHeaderSource {
  String primaryLicenseNumber();

  String loadArrivalNumber();

  String timberMark();

  String scaleSiteIdNmbr();

  String checkReplacesOriginalInd();

  LocalDate scaleDate();

  Integer returnNumber();
}
