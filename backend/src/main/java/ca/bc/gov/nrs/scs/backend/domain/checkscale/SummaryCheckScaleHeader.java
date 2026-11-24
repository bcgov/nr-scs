package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;

/**
 * The header fields the summary check scale create and update commands share, so {@link
 * CheckScaleParams} can bind both through one shape ({@code CheckScaleParams.summaryHeaderParams}).
 * Sealed over the two variants: the runtime type still distinguishes create from update, and the
 * create command alone carries the SPG rows.
 */
public sealed interface SummaryCheckScaleHeader
    permits SummaryCheckScaleCreateCommand, SummaryCheckScaleUpdateCommand {

  String ckscType();

  String checkScaleTypeCode();

  YesNo partialInd();

  YesNo followedGoodPractice();

  YesNo originalWithinStandard();

  YesNo checkReplacesOriginal();

  String commentTxt();

  String originalScalerLicenceNo();

  String checkScalerLicenceNo();

  String scaleSiteIdNmbr();

  String timberMark();

  String loadArrivalNumber();

  Integer weighSlipNumber();

  LocalDate originalScaleDate();

  Integer originalScaleReturnNo();

  LocalDate chkScaleDate();

  Integer chkScaleReturnNo();
}
