package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * Shared accessors for a row in the log-tally / sample-log-tally detail-summary view.
 * Lets {@code compileSpeciesSummary} accept either flavor through one signature.
 */
public interface ProductGradeSummaryDetail {
  Double netVolume();

  Integer pieces();

  String speciesCode();

  String speciesGrade();

  String productCode();

  Integer top();

  Integer butt();

  Double netLength();
}
