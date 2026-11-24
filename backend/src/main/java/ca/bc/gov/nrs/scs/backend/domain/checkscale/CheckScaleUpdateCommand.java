package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

/**
 * Service-input shape for the check-scale edit flow (legacy P077 update). Carries the id of the
 * record being edited plus the six user-editable fields. The DDN / version refs are immutable and
 * recovered server-side from the stored row, so they are not part of this command.
 *
 * <p>Producer: {@code CheckScaleApiMapper.toUpdateCommand} from the generated
 * {@code CheckScaleUpdateRequest}. Consumer: {@code CheckScaleService.updateCheckScale}.
 */
public record CheckScaleUpdateCommand(
    Long checkScaleId,
    String checkScaleTypeCode,
    YesNo followedGoodPractice,
    YesNo originalWithinStandard,
    String commentTxt,
    Double originalScaleNetValue,
    Double checkScaleNetValue) {}
