package ca.bc.gov.nrs.scs.backend.service;

import org.springframework.stereotype.Service;

import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteActivityRecord;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteActivitySummary;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteActivityRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteActivityApiMapper;

@Service
public class ScaleSiteActivityService {

  private final ScaleSiteActivityRepository activityRepository;

  public ScaleSiteActivityService(ScaleSiteActivityRepository activityRepository) {
    this.activityRepository = activityRepository;
  }

  public ScaleSiteActivitySummary getActivitySummary(String scaleSiteIdNmbr) {
    return ScaleSiteActivityApiMapper.toModel(loadActivity(scaleSiteIdNmbr));
  }

  /** Loads the activity domain record for a site, raising a 404 when the site has no row. */
  private ScaleSiteActivityRecord loadActivity(String scaleSiteIdNmbr) {
    if (scaleSiteIdNmbr == null || scaleSiteIdNmbr.isBlank()) {
      throw new ResourceNotFoundException("Scale site id is required.");
    }
    String siteId = scaleSiteIdNmbr.trim().toUpperCase();
    ScaleSiteActivityRecord activity = activityRepository.getActivityForSite(siteId);
    SCSUtils.requireFound(activity, "No scale site found with id " + siteId + ".");
    return activity;
  }
}
