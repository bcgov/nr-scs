package ca.bc.gov.nrs.scs.backend.domain.inspection;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;

/**
 * One question's submitted answer within an {@link InspectionCreateCommand} or
 * {@link InspectionUpdateCommand}.
 *
 * <p>Produced by the mapper from the generated {@code ScaleSiteInspectionQuestionResponseInput}
 * row in the API request. Consumed by the service's validation
 * ({@code validateQuestionResponses}, {@code validateFollowUpFields}) and by
 * {@code normalizeResponses(...)} when building {@link InspectionResponse} bind
 * shapes for the repository.
 *
 * <p>Distinct from {@link InspectionResponse} in two ways: indicators are typed
 * as {@link YesNo} (not plain strings), and {@code followUpRequired} is an explicit
 * user-supplied value (versus {@code InspectionResponse}, where the loader derives
 * it from whether action/due-date fields are present).
 */
public record InspectionQuestionResponseInput(
    Long inspectionQuestionId,
    String inspectionAnswerCode,
    String commentsText,
    YesNo followUpRequired,
    String followUpActionText,
    LocalDate followUpDueDate,
    YesNo followUpCompleted) {}
