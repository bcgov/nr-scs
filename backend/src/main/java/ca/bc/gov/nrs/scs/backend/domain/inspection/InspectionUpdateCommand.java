package ca.bc.gov.nrs.scs.backend.domain.inspection;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.util.List;

/**
 * Controller→service command for updating an inspection.
 *
 * <p>Produced by {@code ScaleSiteInspectionApiMapper.toUpdateCommand(inspectionId, request)}.
 * Consumed by {@code ScaleSiteInspectionService.updateScaleSiteInspection(command)}.
 *
 * <p>Distinct from {@link InspectionUpdateParams}: this is the rich service-input
 * shape (includes question responses); {@code InspectionUpdateParams} is the slim
 * JDBC bind shape used by the row-update proc.
 */
public record InspectionUpdateCommand(
    Long inspectionId,
    LocalDate inspectionDate,
    String inspector,
    YesNo siteOperatorPresent,
    String comments,
    List<InspectionQuestionResponseInput> questionResponses) {}
