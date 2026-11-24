package ca.bc.gov.nrs.scs.backend.domain.marksitedesignation;

public record MarkSiteDesignationTimberMarkHolder(
    String timberMark,
    String markHolderClient,
    String markHolderLoc,
    String markHolderName,
    String markStatus) {}