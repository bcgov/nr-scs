package ca.bc.gov.nrs.scs.backend.domain.riskassessment;

import java.util.List;
import java.util.Optional;

/**
 * Controller→service command for updating a risk assessment (scaler or scale site).
 *
 * <p>Produced by {@code RiskAssessmentApiMapper.toUpdateCommand(request)} and consumed by
 * {@code RiskQuestionnaireService.save(...)}, which is left to validate domain invariants only.
 *
 * <p>The comment follows a "present = set, absent = leave unchanged" rule, carried here as an
 * {@link Optional}: {@link Optional#empty()} means the request omitted the field (leave the stored
 * comment untouched), while a present value is the already-normalized comment to write — including
 * an empty string, which clears the comment. This keeps {@code JsonNullable} confined to the
 * mapper while preserving the distinction the service needs.
 */
public record RiskAssessmentUpdateCommand(
    Optional<String> comments, List<RiskQuestionResponseInput> responses) {}
