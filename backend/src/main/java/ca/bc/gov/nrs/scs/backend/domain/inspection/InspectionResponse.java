package ca.bc.gov.nrs.scs.backend.domain.inspection;

import java.time.LocalDate;

/**
 * A persisted answer to an inspection question — the row shape from
 * {@code scs_inspection_response_pkg}.
 *
 * <p>Used in both directions:
 * <ul>
 *   <li>Read: produced by {@code ScaleSiteInspectionRepository.getInspectionResponses(inspectionId)};
 *       consumed by the service's loader to build {@link InspectionQuestionAndAnswer}.</li>
 *   <li>Write: passed to {@code ScaleSiteInspectionRepository.insertInspectionResponse(inspectionId, row)}
 *       by the service's {@code normalizeResponses(...)} after deriving wire-format
 *       indicators from the domain {@link InspectionQuestionResponseInput}.</li>
 * </ul>
 *
 * <p>Indicator fields are plain {@code String "Y"/"N"} here — this is the bind
 * shape for the package. The semantic {@code YesNo} enum lives on
 * {@link InspectionQuestionResponseInput} (write input) and
 * {@link InspectionQuestionAndAnswer} (read view).
 */
public record InspectionResponse(
    Long inspectionQuestionId,
    String inspectionAnswerCode,
    String commentsText,
    String followUpActionText,
    LocalDate followUpDueDate,
    String followUpCompletedInd) {}
