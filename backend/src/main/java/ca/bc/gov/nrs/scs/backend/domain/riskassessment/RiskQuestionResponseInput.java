package ca.bc.gov.nrs.scs.backend.domain.riskassessment;

/**
 * One question's submitted answer within a {@link RiskAssessmentCreateCommand} or
 * {@link RiskAssessmentUpdateCommand}.
 *
 * <p>Produced by {@code RiskAssessmentApiMapper} from the generated
 * {@code RiskAssessmentResponseInput} row in the API request, with {@code answerId} already
 * unwrapped from its {@code JsonNullable} to a plain {@link Long} ({@code null} = cleared/no
 * selection). Consumed by {@code RiskQuestionnaireService} when it validates domain invariants
 * (every question answered, each answer valid for its question) and reconciles the stored
 * responses.
 */
public record RiskQuestionResponseInput(Long questionId, Long answerId) {}
