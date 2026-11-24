package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

/** Log-tally flavor of {@link CheckScaleCreateCommand}. */
public record LogTallyCreateCommand(
    String ckscType,
    String checkDocNo,
    Integer checkVersion,
    String originalDocNo,
    Integer originalVersion,
    String checkScaleTypeCode,
    YesNo followedGoodPractice,
    YesNo originalWithinStandard,
    String commentTxt,
    Double originalScaleNetValue,
    Double checkScaleNetValue)
    implements CheckScaleCreateCommand {}
