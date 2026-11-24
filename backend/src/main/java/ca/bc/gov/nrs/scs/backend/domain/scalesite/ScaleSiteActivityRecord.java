package ca.bc.gov.nrs.scs.backend.domain.scalesite;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Read-only activity summary for a scale site, sourced from SCS_SCALE_SITE_ACTIVITY_VW.
 *
 * <p>The sample/volume figures cover the last 12 months; {@code lastScaleDate} is the date of the
 * most recent issued return (primary or sample scale) for the site. Any field may be null for a
 * site with no qualifying activity.
 */
public record ScaleSiteActivityRecord(
    String scaleSiteIdNmbr,
    LocalDate lastScaleDate,
    Long numberOfSamples,
    BigDecimal sampleVolume,
    BigDecimal scaledVolume) {}
