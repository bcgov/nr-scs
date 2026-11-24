package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;

import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Validates the referential (foreign-key) fields a check scale points at — scaler licences, timber
 * mark, scale site — before a write, mirroring the legacy {@code CheckScaleBo.validateSummaryCheckScale}
 * existence checks ({@code ScalerBo.validateScalerExists}, {@code MarkSiteBo.validateTimberMark},
 * {@code ScaleSiteBo.validateScaleSite}). Without this, a bad value reaches the insert/update and the
 * DB raises a raw {@code ORA-02291} FK violation instead of a friendly per-field message.
 *
 * <p>This lives in its own component (rather than inline in {@code SummaryCheckScaleService}) to
 * isolate the cross-domain dependencies: it reaches into three other domains' public service APIs
 * (scaler, scale-site, timber-mark) — each owning its own existence check, as legacy did — so the
 * summary service stays focused on its own aggregate. Returns one {@link FieldErrorDetail} per
 * missing reference (keyed to the request field) so the caller can raise a single
 * {@code FieldValidationException} carrying them all.
 */
@Component
public class CheckScaleReferenceValidator {

  private final ScalerService scalerService;
  private final ScaleSiteService scaleSiteService;
  private final TimberMarkService timberMarkService;

  public CheckScaleReferenceValidator(
      ScalerService scalerService,
      ScaleSiteService scaleSiteService,
      TimberMarkService timberMarkService) {
    this.scalerService = scalerService;
    this.scaleSiteService = scaleSiteService;
    this.timberMarkService = timberMarkService;
  }

  /**
   * Checks each supplied reference for existence. Blank values are skipped (bean validation /
   * cross-field rules own "required"). Returns an empty list when every supplied reference exists.
   */
  public List<FieldErrorDetail> validate(
      String originalScalerLicenceNo,
      String checkScalerLicenceNo,
      String timberMark,
      String scaleSiteIdNmbr) {
    List<FieldErrorDetail> errors = new ArrayList<>();
    if (!isBlank(originalScalerLicenceNo) && !scalerService.scalerExists(originalScalerLicenceNo)) {
      errors.add(new FieldErrorDetail(
          "originalScalerLicenceNo", "A Scaler # could not be found for " + originalScalerLicenceNo + "."));
    }
    if (!isBlank(checkScalerLicenceNo) && !scalerService.scalerExists(checkScalerLicenceNo)) {
      errors.add(new FieldErrorDetail(
          "checkScalerLicenceNo", "A Scaler # could not be found for " + checkScalerLicenceNo + "."));
    }
    if (!isBlank(timberMark) && !timberMarkService.timberMarkExists(timberMark)) {
      errors.add(new FieldErrorDetail(
          "timberMark", "A Timber Mark could not be found for " + timberMark + "."));
    }
    if (!isBlank(scaleSiteIdNmbr) && !scaleSiteService.scaleSiteExists(scaleSiteIdNmbr)) {
      errors.add(new FieldErrorDetail(
          "scaleSiteIdNmbr", "A Scale Site could not be found for " + scaleSiteIdNmbr + "."));
    }
    return errors;
  }
}
