package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.math.BigDecimal;
import java.time.LocalDate;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

/**
 * One row of the legacy "Check Scale Summary" table shown on the Scaler and Scale Site
 * Check Scales tabs; sourced from the check scale summary views, not the base table.
 * Name preserved from legacy {@code CHECK_SCALE_SUMMARY_VW} — distinct from the future
 * "Summary Check Scale" entity ({@code SCS_SUMMARY_CHECK_SCALE_VW}).
 *
 * <p>Producer: {@code CheckScaleRepository} summary-view searches
 * ({@code scs_check_scale_summary_vw_pkg} / {@code scs_cs_site_summry_vw_pkg}).
 * Consumer: {@code CheckScaleService} tab loaders.
 */
public record CheckScaleSummary(
    Long checkScaleId,
    String scaleSiteIdNmbr,
    String primCheckLicenceNo,
    String secCheckLicenceNo,
    String primOrigLicenceNo,
    String secOrigLicenceNo,
    LocalDate origScaleDate,
    LocalDate checkScaleDate,
    BigDecimal pieceDiff,
    BigDecimal volumeVariance,
    BigDecimal valueVariance,
    YesNo replacedInd,
    String checkScaleTypeCode,
    String recordType,
    YesNo followedGoodPracticeInd,
    YesNo originalWithinStandardInd) {}
