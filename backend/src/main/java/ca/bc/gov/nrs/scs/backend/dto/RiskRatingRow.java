package ca.bc.gov.nrs.scs.backend.dto;

/** A risk-level threshold row from {@code scs_risk_rating_vw}. */
public record RiskRatingRow(
    String riskTypeCode,
    String codeDescription,
    String ratingDescription,
    Integer rangeLowValue,
    Integer rangeHighValue) {}
