package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskRatingSummary;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRiskRatingRepository;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Loads the read-only risk-assessment summary rows for a scale site's "Risk Rating" tab. The scale
 * site must exist (404 otherwise); the rows themselves come straight from {@code scs_risk_summary_vw}
 * with no further composition.
 */
@Service
public class ScaleSiteRiskRatingService {

  private final ScaleSiteRiskRatingRepository scaleSiteRiskRatingRepository;
  private final ScaleSiteService scaleSiteService;

  public ScaleSiteRiskRatingService(
      ScaleSiteRiskRatingRepository scaleSiteRiskRatingRepository,
      ScaleSiteService scaleSiteService) {
    this.scaleSiteRiskRatingRepository = scaleSiteRiskRatingRepository;
    this.scaleSiteService = scaleSiteService;
  }

  public List<ScaleSiteRiskRatingSummary> getScaleSiteRiskRatings(String scaleSiteIdNmbr) {
    // Normalise once so the existence guard and the data query key off the SAME value: the guard
    // folds case, so a raw (e.g. lower-case) value here would pass it and then match no rows — 200 []
    // for a scale site that has assessments.
    String normalizedScaleSiteIdNmbr = upperOrNull(scaleSiteIdNmbr);
    assertScaleSiteExists(normalizedScaleSiteIdNmbr);
    return scaleSiteRiskRatingRepository.getScaleSiteRiskRatings(normalizedScaleSiteIdNmbr);
  }

  private void assertScaleSiteExists(String scaleSiteIdNmbr) {
    if (!scaleSiteService.scaleSiteExists(scaleSiteIdNmbr)) {
      throw new ResourceNotFoundException(
          "No scale site found with number " + scaleSiteIdNmbr);
    }
  }
}
