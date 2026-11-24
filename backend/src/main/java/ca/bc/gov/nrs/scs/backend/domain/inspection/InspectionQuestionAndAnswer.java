package ca.bc.gov.nrs.scs.backend.domain.inspection;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.util.List;

/**
 * Fully resolved Q&amp;A row — one entry in the question-list of a loaded
 * {@link Inspection} or {@link InspectionCreateInit}.
 *
 * <p>Produced by the service loader from a raw {@link InspectionResponse} (or a
 * shell built from {@link InspectionQuestion} when no responses exist), with
 * question text, answer descriptions, and valid answer options pre-resolved.
 * Consumed by {@code ScaleSiteInspectionApiMapper.toDetailQuestionResponse(...)}
 * and {@code toEditQuestionResponse(...)}.
 *
 * <p>{@code answerOptions} is non-empty only on the edit path (the detail page
 * doesn't render dropdowns). Indicators use {@link YesNo}; the mapper handles
 * conversion to API strings or generated enums.
 */
public record InspectionQuestionAndAnswer(
    Long inspectionQuestionId,
    String questionText,
    String inspectionAnswerCode,
    String inspectionAnswerDescription,
    List<InspectionAnswerOption> answerOptions,
    String commentsText,
    YesNo followUpRequired,
    String followUpActionText,
    LocalDate followUpDueDate,
    YesNo followUpCompleted) {}
