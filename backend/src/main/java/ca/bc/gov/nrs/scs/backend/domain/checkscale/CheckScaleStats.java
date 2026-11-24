package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.math.BigDecimal;

/**
 * The legacy "Check Scale Statistics" block on the Scaler Check Scales tab: volume and value
 * variance percentages over the last 10 checked scales, the past 12 months, and all records.
 * All fields are null when the scaler has no check scales for the selected filter.
 *
 * <p>Producer: {@code CheckScaleRepository.calculateCheckScaleStats}
 * ({@code scs_calc_check_scale_pkg.calculate_check_scale}).
 * Consumer: {@code CheckScaleService} scaler tab loader.
 */
public record CheckScaleStats(
    BigDecimal last10Volume,
    BigDecimal last10Value,
    BigDecimal past12Volume,
    BigDecimal past12Value,
    BigDecimal allVolume,
    BigDecimal allValue) {

  public static final CheckScaleStats EMPTY = new CheckScaleStats(null, null, null, null, null, null);
}
