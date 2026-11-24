package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/** Log-tally flavor of {@link CheckScaleValidationCommand}. */
public record LogTallyValidationCommand(
    String checkDocNo,
    Integer checkVersion,
    String originalDocNo,
    Integer originalVersion)
    implements CheckScaleValidationCommand {}
