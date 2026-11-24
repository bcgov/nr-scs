package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import lombok.With;

/**
 * Service-input shape for the summary check scale header update (legacy
 * {@code SummaryCheckScaleAction.updateSummaryCheckScale}). Mirrors {@link
 * SummaryCheckScaleCreateCommand} minus the SPG rows — the header update never touches SPG roll-up
 * rows (those are managed by the dedicated add/delete endpoints). {@code ckscType} is resolved from
 * the submitted return type so the service can enforce the return-type lock against the stored
 * {@code cksc_type}; {@code partialInd} is {@code "Y"} for LT/SLT (user-supplied for SFP), both
 * resolved by {@code SummaryCheckScaleApiMapper}.
 *
 * <p>Producer: {@code SummaryCheckScaleApiMapper.toUpdateCommand}. Consumer:
 * {@code SummaryCheckScaleService.updateSummaryCheckScale}.
 */
@With
public record SummaryCheckScaleUpdateCommand(
    String ckscType,
    String checkScaleTypeCode,
    YesNo partialInd,
    YesNo followedGoodPractice,
    YesNo originalWithinStandard,
    YesNo checkReplacesOriginal,
    String commentTxt,
    String originalScalerLicenceNo,
    String checkScalerLicenceNo,
    String scaleSiteIdNmbr,
    String timberMark,
    String loadArrivalNumber,
    Integer weighSlipNumber,
    LocalDate originalScaleDate,
    Integer originalScaleReturnNo,
    LocalDate chkScaleDate,
    Integer chkScaleReturnNo) implements SummaryCheckScaleHeader {}
