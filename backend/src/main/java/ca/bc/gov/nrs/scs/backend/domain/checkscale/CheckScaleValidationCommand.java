package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * Service-input shape for the step-1 validate flow. Sealed over two variants — log-tally and
 * sample-log-tally — so the runtime type encodes the flavor instead of a derived flag. Carries
 * the Check and Original DDN / version pair under the same accessor names regardless of flavor.
 *
 * <p>Producer: {@code CheckScaleApiMapper.toValidationCommand} from the generated
 * {@code CheckScaleValidationRequest}. Consumer: {@code CheckScaleService.validate}.
 */
public sealed interface CheckScaleValidationCommand
    permits LogTallyValidationCommand, SampleLogTallyValidationCommand {

  String checkDocNo();

  Integer checkVersion();

  String originalDocNo();

  Integer originalVersion();
}
