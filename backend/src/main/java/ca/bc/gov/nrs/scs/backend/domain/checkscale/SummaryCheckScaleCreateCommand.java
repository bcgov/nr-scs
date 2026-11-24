package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.util.List;
import lombok.With;

/**
 * Service-input shape for the single-step summary check scale create (legacy
 * {@code SummaryCheckScaleAction.create}). Unlike the detail (HBCS) flow there is no tally-document
 * lookup — the user supplies the header fields and SPG rows directly. {@code ckscType} is one of
 * {@code LTSCS} / {@code SLTSCS} / {@code SFPSCS} and {@code partialInd} is {@code "Y"} for LT/SLT
 * (user-supplied for SFP), both resolved by {@code SummaryCheckScaleApiMapper}.
 *
 * <p>Producer: {@code SummaryCheckScaleApiMapper.toCreateCommand}. Consumer:
 * {@code SummaryCheckScaleService.createSummaryCheckScale}.
 */
@With
public record SummaryCheckScaleCreateCommand(
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
    Integer chkScaleReturnNo,
    List<SummaryCheckScaleSpgRowCommand> spgRows) implements SummaryCheckScaleHeader {}
