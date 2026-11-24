package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

/**
 * Service-input shape for the step-2 create flow. Sealed over two variants — log-tally and
 * sample-log-tally — so the runtime type encodes the flavor. Carries the four DDN / version refs
 * carried over from step 1 plus the six fields the user supplies on screen P076.
 *
 * <p>{@code ckscType} is constant {@code "HBCS"} for this endpoint — the mapper hardcodes it
 * (legacy {@code CheckScaleAssembler.createBoFromForm}).
 *
 * <p>Producer: {@code CheckScaleApiMapper.toCreateCommand} from the generated
 * {@code CheckScaleCreateRequest}. Consumer: {@code CheckScaleService.createCheckScale}.
 */
public sealed interface CheckScaleCreateCommand
    permits LogTallyCreateCommand, SampleLogTallyCreateCommand {

  String ckscType();

  String checkDocNo();

  Integer checkVersion();

  String originalDocNo();

  Integer originalVersion();

  String checkScaleTypeCode();

  YesNo followedGoodPractice();

  YesNo originalWithinStandard();

  String commentTxt();

  Double originalScaleNetValue();

  Double checkScaleNetValue();
}
