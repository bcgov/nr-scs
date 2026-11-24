package ca.bc.gov.nrs.scs.backend.domain.inspection;

/**
 * One selectable answer for an inspection question — code plus its display label.
 *
 * <p>Built by the service loader from {@code scs_inspection_valid_rspns_pkg}
 * codes joined to the answer-code LOV, attached to each
 * {@link InspectionQuestionAndAnswer}, and projected by the mapper to the API's
 * {@code ScaleSiteInspectionAnswerOption}. Populated on the edit path only.
 */
public record InspectionAnswerOption(
    String code,
    String description) {}
