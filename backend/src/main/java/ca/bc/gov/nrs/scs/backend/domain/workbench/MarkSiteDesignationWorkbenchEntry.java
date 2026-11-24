package ca.bc.gov.nrs.scs.backend.domain.workbench;

import java.time.LocalDate;

/** A single row returned by the mark-site workbench grid before mapping to the API model. */
public record MarkSiteDesignationWorkbenchEntry(
    Long haulingMarkAuthorizationId,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    String timberMark,
    Long regionId,
    Long districtId) {
}
