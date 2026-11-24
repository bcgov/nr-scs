package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.math.BigDecimal;

/**
 * Shared shape of a raw tally-detail row — implemented by both
 * {@link LogTallyDetail} and {@link SampleLogTallyDetail}. Lets totals
 * accumulation run over either flavor without duplicating the loop.
 */
public interface TallyDetailRow {
  Integer top();

  Integer butt();

  Double length();

  BigDecimal netVolume();
}
