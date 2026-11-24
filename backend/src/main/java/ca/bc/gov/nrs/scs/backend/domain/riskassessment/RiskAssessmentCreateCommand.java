package ca.bc.gov.nrs.scs.backend.domain.riskassessment;

import java.util.List;

/**
 * Controller→service command for creating a risk assessment (scaler or scale site).
 *
 * <p>Produced by {@code RiskAssessmentApiMapper.toCreateCommand(request)} by structurally mapping
 * the generated {@code RiskAssessmentSaveRequest}: {@code JsonNullable} is unwrapped, the comment
 * is trimmed / blank-coerced-to-null / length-checked, and each response's {@code answerId} is
 * flattened to a plain {@link Long}. Consumed by {@code RiskQuestionnaireService.create(...)},
 * which is left to validate domain invariants only.
 *
 * <p>On create the comment is optional: {@code null} means no comment (the legacy insert stores a
 * null comment).
 */
public record RiskAssessmentCreateCommand(
    String comments, List<RiskQuestionResponseInput> responses) {}
