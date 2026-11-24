package ca.bc.gov.nrs.scs.backend.domain.inspection;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.util.List;

/**
 * Controller→service command for creating an inspection.
 *
 * <p>Produced by {@code ScaleSiteInspectionApiMapper.toCreateCommand(scaleSiteIdNmbr, request)}
 * by structurally mapping the generated {@code ScaleSiteInspectionCreateRequest}
 * (unwrapping {@code JsonNullable}, converting generated enums to {@link YesNo}).
 * Consumed by {@code ScaleSiteInspectionService.createScaleSiteInspection(command)}.
 *
 * <p>Distinct from {@link InspectionCreateParams}: this is the rich service-input
 * shape (includes site-type codes and question responses); {@code InspectionCreateParams}
 * is the slimmer JDBC bind shape derived from it for the create-base proc.
 */
public record InspectionCreateCommand(
    String scaleSiteIdNmbr,
    String inspectionTypeCode,
    List<String> siteTypeCodes,
    LocalDate inspectionDate,
    YesNo siteOperatorPresent,
    String comments,
    String inspector,
    Long previousInspectionId,
    String recipient,
    List<InspectionQuestionResponseInput> questionResponses) {}
