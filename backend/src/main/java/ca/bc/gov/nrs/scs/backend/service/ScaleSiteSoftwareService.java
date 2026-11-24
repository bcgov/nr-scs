package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireFound;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireText;

import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSoftwareSummary;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteSoftwareRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteSoftwareApiMapper;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ScaleSiteSoftwareService {

  private final ScaleSiteSoftwareRepository repository;
  private final ScaleSiteRepository scaleSiteRepository;

  public ScaleSiteSoftwareService(
      ScaleSiteSoftwareRepository repository,
      ScaleSiteRepository scaleSiteRepository) {
    this.repository = repository;
    this.scaleSiteRepository = scaleSiteRepository;
  }

  /**
   * Lists the scaling software used to submit returns at a scale site, backing the Software tab on
   * the scale site view page. Mirrors the legacy {@code ScaleSiteDelegate.loadScaleSiteSoftwareList}.
   */
  public List<ScaleSiteSoftwareSummary> getScaleSiteSoftware(String scaleSiteIdNmbr) {
    requireText(scaleSiteIdNmbr, "Scale site number is required.");
    requireFound(
        scaleSiteRepository.getScaleSite(scaleSiteIdNmbr),
        "No scale site found with number " + scaleSiteIdNmbr);
    return ScaleSiteSoftwareApiMapper.toModelList(repository.listByScaleSite(scaleSiteIdNmbr));
  }
}
