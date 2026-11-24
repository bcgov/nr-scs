package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * Shared shape of a pre-aggregated tally-detail-summary row — implemented
 * by both {@link LogTallyDetailSummary} and {@link SampleLogTallyDetailSummary}.
 * Distinct from {@link TallyDetailRow}: summary rows carry already-aggregated
 * {@code pieces} and a {@code netLength} (rather than per-row {@code length}),
 * and {@code netVolume} is a {@code Double} rather than {@code BigDecimal}.
 */
public interface TallyDetailSummaryRow {
  Integer top();

  Integer butt();

  Double netLength();

  Double netVolume();

  Integer pieces();
}
