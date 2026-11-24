package ca.bc.gov.nrs.scs.backend.domain.scalesite;

import java.time.LocalDate;

/**
 * A scaling software product/version used to submit returns at a scale site, backing the legacy
 * Software tab. Read-only; sourced from {@code scs_site_software_vw_pkg.search_recs}.
 */
public record ScaleSiteSoftwareRecord(
    String scalingProgram,
    String version,
    String revision,
    String returnType,
    Long returnCount,
    LocalDate lastUsedDate) {}
