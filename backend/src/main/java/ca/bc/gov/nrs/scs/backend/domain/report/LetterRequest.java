package ca.bc.gov.nrs.scs.backend.domain.report;

public record LetterRequest(
    String regDist,
    String ccField,
    String showSignatureBlockInd,
    Long scaleSignatoryBlockId,
    Object outputFormat,
    String emailRecipient,
    Boolean preview) {}
