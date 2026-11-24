package ca.bc.gov.nrs.scs.backend.domain.inspection;

/**
 * Inspection-question catalog row — the question definition, independent of any
 * particular inspection.
 *
 * <p>Produced by {@code ScaleSiteInspectionRepository.getActiveInspectionQuestions()}
 * from {@code scs_inspection_question_pkg}. Used by the service when rebuilding
 * the applicable-questions set (intersection of inspection-type and scaling-method
 * mappings) for legacy inspections that have no saved response rows.
 *
 * <p>Distinct from {@link InspectionQuestionAndAnswer}, which pairs a question
 * with a specific inspection's answer plus resolved labels.
 */
public record InspectionQuestion(
    Long inspectionQuestionId,
    String questionText) {}
