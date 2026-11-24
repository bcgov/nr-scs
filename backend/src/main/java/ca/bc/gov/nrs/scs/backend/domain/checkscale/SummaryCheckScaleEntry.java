package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.math.BigDecimal;
import java.time.LocalDate;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

/**
 * One row of the legacy "Summary Check Scales" list shown on the Scaler Summary Check Scales
 * tab (legacy screen P132, {@code summaryCheckScaleList.jsp}); sourced from the summary check
 * scale view, not the base table. Carries the {@code ckscType} (Summary Type) column, which
 * distinguishes it from {@link CheckScaleSummary} (the detail Check Scales tab row).
 *
 * <p>Producer: {@code CheckScaleRepository} summary-view search
 * ({@code scs_summary_check_scal_vw_pkg}). Consumer: {@code SummaryCheckScaleService} tab loader.
 */
public record SummaryCheckScaleEntry(
    Long checkScaleId,
    String ckscType,
    String primCheckLicenceNo,
    String primOrigLicenceNo,
    LocalDate origScaleDate,
    LocalDate checkScaleDate,
    BigDecimal pieceDiff,
    BigDecimal volumeVariance,
    BigDecimal valueVariance,
    YesNo replacedInd,
    String checkScaleTypeCode,
    YesNo followedGoodPracticeInd,
    YesNo originalWithinStandardInd) {}
