package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireFound;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireText;

import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSummary;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteMarkSiteDesignationRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteMarkSiteDesignationApiMapper;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ScaleSiteMarkSiteDesignationService {

  private final ScaleSiteMarkSiteDesignationRepository repository;
  private final ScaleSiteRepository scaleSiteRepository;

  public ScaleSiteMarkSiteDesignationService(
      ScaleSiteMarkSiteDesignationRepository repository,
      ScaleSiteRepository scaleSiteRepository) {
    this.repository = repository;
    this.scaleSiteRepository = scaleSiteRepository;
  }

  /**
   * Lists the timber marks designated to a scale site, backing the MSD tab on the scale site view
   * page. Mirrors the legacy {@code ScaleSiteMSDAction} list.
   */
  public List<MarkSiteDesignationSummary> getScaleSiteMarkSiteDesignations(String scaleSiteIdNmbr) {
    requireText(scaleSiteIdNmbr, "Scale site number is required.");
    requireFound(
        scaleSiteRepository.getScaleSite(scaleSiteIdNmbr),
        "No scale site found with number " + scaleSiteIdNmbr);
    return ScaleSiteMarkSiteDesignationApiMapper.toModelList(repository.listByScaleSite(scaleSiteIdNmbr));
  }
}
