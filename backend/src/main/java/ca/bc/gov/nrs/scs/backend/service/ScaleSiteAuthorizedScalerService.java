package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireFound;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireText;

import ca.bc.gov.nrs.scs.backend.model.AuthorizedScalerSummary;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteAuthorizedScalerRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteAuthorizedScalerApiMapper;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ScaleSiteAuthorizedScalerService {

  private final ScaleSiteAuthorizedScalerRepository repository;
  private final ScaleSiteRepository scaleSiteRepository;

  public ScaleSiteAuthorizedScalerService(
      ScaleSiteAuthorizedScalerRepository repository,
      ScaleSiteRepository scaleSiteRepository) {
    this.repository = repository;
    this.scaleSiteRepository = scaleSiteRepository;
  }

  /**
   * Lists every scaler authorized at a scale site, backing the Authorized Scalers tab on the scale
   * site view page. Mirrors the legacy {@code ScaleSiteScalersAction} list.
   */
  public List<AuthorizedScalerSummary> getScaleSiteAuthorizedScalers(String scaleSiteIdNmbr) {
    requireText(scaleSiteIdNmbr, "Scale site number is required.");
    requireFound(
        scaleSiteRepository.getScaleSite(scaleSiteIdNmbr),
        "No scale site found with number " + scaleSiteIdNmbr);
    return ScaleSiteAuthorizedScalerApiMapper.toModelList(repository.listByScaleSite(scaleSiteIdNmbr));
  }
}
