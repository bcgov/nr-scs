package ca.bc.gov.nrs.scs.backend.dto;

/** A saved answer selection for one question. */
public record ResponseRow(Long responseId, Long questionId, Long answerId) {}
