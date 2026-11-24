package ca.bc.gov.nrs.scs.backend.service.mapper;

import java.util.List;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSoftwareRecord;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSoftwareSummary;

/** Projects scale-site software domain summaries onto the generated API model for the tab response. */
public final class ScaleSiteSoftwareApiMapper {

  private ScaleSiteSoftwareApiMapper() {}

  public static ScaleSiteSoftwareSummary toModel(ScaleSiteSoftwareRecord domain) {
    if (domain == null) return null;
    ScaleSiteSoftwareSummary model = new ScaleSiteSoftwareSummary();
    model.setScalingProgram(domain.scalingProgram());
    model.setVersion(domain.version());
    model.setRevision(domain.revision());
    model.setReturnType(domain.returnType());
    model.setReturnCount(domain.returnCount());
    model.setLastUsedDate(domain.lastUsedDate());
    return model;
  }

  public static List<ScaleSiteSoftwareSummary> toModelList(
      List<ScaleSiteSoftwareRecord> domains) {
    if (domains == null) return List.of();
    return domains.stream().map(ScaleSiteSoftwareApiMapper::toModel).toList();
  }
}
