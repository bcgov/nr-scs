package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskRatingSummary;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRiskRatingRepository;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Loads the read-only risk-assessment summary rows for a scaler's "Risk Rating" tab. The scaler
 * must exist (404 otherwise); the rows themselves come straight from {@code scs_risk_summary_vw}
 * with no further composition.
 */
@Service
public class ScalerRiskRatingService {

  private final ScalerRiskRatingRepository scalerRiskRatingRepository;
  private final ScalerService scalerService;

  public ScalerRiskRatingService(
      ScalerRiskRatingRepository scalerRiskRatingRepository, ScalerService scalerService) {
    this.scalerRiskRatingRepository = scalerRiskRatingRepository;
    this.scalerService = scalerService;
  }

  public List<ScalerRiskRatingSummary> getScalerRiskRatings(String scalerLicenceNo) {
    // Normalise once so the existence guard and the data query match on the same value; the
    // underlying scaler/summary views compare the licence case-sensitively, so a raw (e.g.
    // lower-case) value in one and an upper-cased value in the other would 404 a scaler that exists.
    String normalizedLicenceNo = upperOrNull(scalerLicenceNo);
    assertScalerExists(normalizedLicenceNo);
    return scalerRiskRatingRepository.getScalerRiskRatings(normalizedLicenceNo);
  }

  private void assertScalerExists(String scalerLicenceNo) {
    if (!scalerService.scalerExists(scalerLicenceNo)) {
      throw new ResourceNotFoundException(
          "No scaler found with licence number " + scalerLicenceNo);
    }
  }
}
