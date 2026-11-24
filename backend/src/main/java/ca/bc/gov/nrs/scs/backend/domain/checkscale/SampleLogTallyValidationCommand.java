package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/** Sample-log-tally flavor of {@link CheckScaleValidationCommand}. */
public record SampleLogTallyValidationCommand(
    String checkDocNo,
    Integer checkVersion,
    String originalDocNo,
    Integer originalVersion)
    implements CheckScaleValidationCommand {}
