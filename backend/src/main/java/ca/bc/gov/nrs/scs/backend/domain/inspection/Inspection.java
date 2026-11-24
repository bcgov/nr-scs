package ca.bc.gov.nrs.scs.backend.domain.inspection;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.util.List;

/**
 * Fully loaded scale-site inspection — the aggregate that backs both the detail
 * and edit projections.
 *
 * <p>Produced by {@code ScaleSiteInspectionService.loadInspection(id, AnswerOptionLoad)}
 * by composing repository reads (base row, scaling-method codes, response rows,
 * scale-site + owner lookups) with LOV-resolved labels. Consumed by
 * {@code ScaleSiteInspectionApiMapper.toDetailResponse(...)} and
 * {@code toEditResponse(...)}.
 *
 * <p>Holds plain domain types only — {@link YesNo} for indicators, plain
 * {@code String}/{@code LocalDate} for everything else. No {@code JsonNullable}.
 */
public record Inspection(
    Long inspectionId,
    String inspectionTypeCode,
    String inspectionTypeDescription,
    LocalDate inspectionDate,
    String inspector,
    String scaleSiteIdNmbr,
    String siteName,
    String siteLocation,
    String siteOwnerName,
    String siteTypeDisplay,
    Long previousInspectionId,
    String recipient,
    YesNo siteOperatorPresent,
    String comments,
    List<InspectionQuestionAndAnswer> questionResponses) {}
