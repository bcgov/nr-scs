package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;

import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import ca.bc.gov.nrs.scs.backend.model.report.DesignatedMarksExceptionReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.MarkSiteDesignationReportRequest;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * The referential checks legacy ran on the two mark/site report forms before generating them: every
 * timber mark or scale site the user typed must exist.
 *
 * <p>Legacy ran these on the SERVER, in the Struts form's {@code validate()}, so a request could not skip
 * them; the new screens also pre-check in the browser, but that alone is not parity (see the paired-date
 * note on {@code ReportService.validateMarkSiteDesignationReportRequest}). Rules, field keys and wording
 * are legacy's:
 * <ul>
 *   <li>Mark Site Designation — {@code MarkSiteDesignationReportBo.validateSitesAndMarks}: each value must
 *       be a scale site OR a timber mark ({@code errors.timbermark.site.exist}).</li>
 *   <li>Designated Marks Exception — {@code DesignatedMarksExceptionReportForm.validate}: each mark must be
 *       a timber mark ({@code errors.timbermark.exist}) and each site a scale site
 *       ({@code errors.site.exist}).</li>
 * </ul>
 * "Timber mark exists" means a {@code HAULING_AUTHORITY} row ({@link TimberMarkService#timberMarkExists});
 * "scale site exists" is an exact site-number lookup ({@link ScaleSiteService#scaleSiteExists}), as
 * {@code ReportValidator.doesSiteExist} was. Kept out of {@code ReportService} — like
 * {@link CheckScaleReferenceValidator} — so the report service does not take on two other domains'
 * services. Returns one {@link FieldErrorDetail} per bad value, keyed to the request field, so the caller
 * raises a single {@code FieldValidationException} carrying them all (legacy accumulated into
 * {@code ActionErrors} the same way).
 */
@Component
public class ReportReferenceValidator {

  private static final int SLOTS = 6;

  private final ScaleSiteService scaleSiteService;
  private final TimberMarkService timberMarkService;

  public ReportReferenceValidator(
      ScaleSiteService scaleSiteService, TimberMarkService timberMarkService) {
    this.scaleSiteService = scaleSiteService;
    this.timberMarkService = timberMarkService;
  }

  /** Mark Site Designation: each {@code siteMarkN} must be a scale site or a timber mark. */
  public List<FieldErrorDetail> validate(MarkSiteDesignationReportRequest request) {
    String[] values = {
      request.getSiteMark1(), request.getSiteMark2(), request.getSiteMark3(),
      request.getSiteMark4(), request.getSiteMark5(), request.getSiteMark6(),
    };
    List<FieldErrorDetail> errors = new ArrayList<>();
    for (int i = 0; i < SLOTS; i++) {
      String value = trimmed(values[i]);
      if (value != null
          && !scaleSiteService.scaleSiteExists(value)
          && !timberMarkService.timberMarkExists(value)) {
        errors.add(new FieldErrorDetail(
            "siteMark" + (i + 1), "A Site nor Timbermark for " + value + " exist in the system."));
      }
    }
    return errors;
  }

  /** Designated Marks Exception: each {@code markN} must be a timber mark, each {@code siteN} a scale site. */
  public List<FieldErrorDetail> validate(DesignatedMarksExceptionReportRequest request) {
    String[] marks = {
      request.getMark1(), request.getMark2(), request.getMark3(),
      request.getMark4(), request.getMark5(), request.getMark6(),
    };
    String[] sites = {
      request.getSite1(), request.getSite2(), request.getSite3(),
      request.getSite4(), request.getSite5(), request.getSite6(),
    };
    List<FieldErrorDetail> errors = new ArrayList<>();
    for (int i = 0; i < SLOTS; i++) {
      String mark = trimmed(marks[i]);
      if (mark != null && !timberMarkService.timberMarkExists(mark)) {
        errors.add(new FieldErrorDetail(
            "mark" + (i + 1), "A Timbermark for " + mark + " does not exist in the system."));
      }
      String site = trimmed(sites[i]);
      if (site != null && !scaleSiteService.scaleSiteExists(site)) {
        errors.add(new FieldErrorDetail(
            "site" + (i + 1), "A Scale Site for " + site + " does not exist in the system."));
      }
    }
    return errors;
  }

  private static String trimmed(String value) {
    return isBlank(value) ? null : value.trim();
  }
}
