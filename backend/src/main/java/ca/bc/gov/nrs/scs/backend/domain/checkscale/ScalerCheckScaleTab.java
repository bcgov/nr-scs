package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.util.List;

/**
 * Aggregate for the Scaler Check Scales tab: the statistics block plus the summary rows,
 * loaded together like the legacy screen (P012). Stats are {@link CheckScaleStats#EMPTY}
 * when there are no rows (legacy renders blank cells).
 *
 * <p>Producer: {@code CheckScaleService.getScalerCheckScaleTab}.
 * Consumer: {@code CheckScaleApiMapper.toScalerTabResult}.
 */
public record ScalerCheckScaleTab(CheckScaleStats stats, List<CheckScaleSummary> checkScales) {}
