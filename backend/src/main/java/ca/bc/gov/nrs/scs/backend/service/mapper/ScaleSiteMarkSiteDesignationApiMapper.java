package ca.bc.gov.nrs.scs.backend.service.mapper;

import java.util.List;

import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSummary;

/** Projects scale-site MSD domain summaries onto the generated API model for the tab response. */
public final class ScaleSiteMarkSiteDesignationApiMapper {

  private ScaleSiteMarkSiteDesignationApiMapper() {}

  public static MarkSiteDesignationSummary toModel(
      ca.bc.gov.nrs.scs.backend.domain.scalesite.MarkSiteDesignationSummary domain) {
    if (domain == null) return null;
    MarkSiteDesignationSummary model = new MarkSiteDesignationSummary();
    model.setTimberMark(domain.timberMark());
    model.setScaleSiteIdNmbr(domain.scaleSiteIdNmbr());
    model.setOwnerCliNumber(domain.ownerCliNumber());
    return model;
  }

  public static List<MarkSiteDesignationSummary> toModelList(
      List<ca.bc.gov.nrs.scs.backend.domain.scalesite.MarkSiteDesignationSummary> domains) {
    if (domains == null) return List.of();
    return domains.stream().map(ScaleSiteMarkSiteDesignationApiMapper::toModel).toList();
  }
}
