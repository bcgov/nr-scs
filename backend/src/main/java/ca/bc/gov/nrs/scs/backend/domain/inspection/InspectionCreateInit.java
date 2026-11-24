package ca.bc.gov.nrs.scs.backend.domain.inspection;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactOption;
import java.util.List;

/**
 * Seed data for the "Create Inspection" page — the values the form needs before
 * any user input.
 *
 * <p>Produced by {@code ScaleSiteInspectionService.loadInspectionCreateInit(...)}
 * after validating the requested inspection type and scaling-method codes against
 * their LOVs. Consumed by {@code ScaleSiteInspectionApiMapper.toCreateInitResponse(...)}.
 *
 * <p>{@code recipientContacts} are still raw domain contacts; the mapper does the
 * {@code clientContactId}-vs-name projection into the API recipient-option shape.
 * {@code questionShells} are the applicable questions with answer options pre-loaded.
 */
public record InspectionCreateInit(
    String scaleSiteIdNmbr,
    String siteName,
    String siteLocation,
    String siteOwnerName,
    String inspectionTypeCode,
    String inspectionTypeDescription,
    List<String> siteTypeCodes,
    String siteTypeDisplay,
    List<ScaleSiteContactOption> recipientContacts,
    String inspector,
    List<InspectionQuestionAndAnswer> questionShells) {}
