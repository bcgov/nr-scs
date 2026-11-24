package ca.bc.gov.nrs.scs.backend.dto;

/** One section/question/answer row from {@code scs_risk_tmplt_qa_vw}. */
public record TemplateQaRow(
    Long sectionId,
    String sectionDescription,
    Integer sectionOrder,
    Long questionId,
    String questionText,
    Integer questionOrder,
    Long answerId,
    String answerText,
    Integer weight,
    Integer answerOrder) {}
