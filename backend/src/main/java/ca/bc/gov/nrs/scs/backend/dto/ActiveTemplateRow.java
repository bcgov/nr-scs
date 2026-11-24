package ca.bc.gov.nrs.scs.backend.dto;

/**
 * An active risk questionnaire template row from
 * {@code scs_risk_questionnr_tmplt_pkg.search_active_recs} (effective/expiry window contains
 * today). Used when binding a NEW assessment to the currently active template for a given type.
 */
public record ActiveTemplateRow(
    Long templateId,
    Long versionNo,
    String riskTemplateType) {}
