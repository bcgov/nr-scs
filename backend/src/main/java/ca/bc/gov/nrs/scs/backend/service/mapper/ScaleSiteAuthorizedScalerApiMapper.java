package ca.bc.gov.nrs.scs.backend.service.mapper;

import java.util.List;

import ca.bc.gov.nrs.scs.backend.model.AuthorizedScalerSummary;

/** Projects authorized-scaler domain summaries onto the generated API model for the tab response. */
public final class ScaleSiteAuthorizedScalerApiMapper {

  private ScaleSiteAuthorizedScalerApiMapper() {}

  public static AuthorizedScalerSummary toModel(
      ca.bc.gov.nrs.scs.backend.domain.scalesite.AuthorizedScalerSummary domain) {
    if (domain == null) return null;
    AuthorizedScalerSummary model = new AuthorizedScalerSummary();
    model.setScalerAuthorizationId(domain.scalerAuthorizationId());
    model.setScalerLicenceNo(domain.scalerLicenceNo());
    model.setClientName(domain.clientName());
    model.setStatus(domain.status());
    model.setScalerAppointmentTypes(domain.scalerAppointmentTypes());
    model.setAuthorizationEffectiveDate(domain.authorizationEffectiveDate());
    model.setAuthorizationExpiryDate(domain.authorizationExpiryDate());
    model.setDistrictWideInd(domain.districtWideInd());
    return model;
  }

  public static List<AuthorizedScalerSummary> toModelList(
      List<ca.bc.gov.nrs.scs.backend.domain.scalesite.AuthorizedScalerSummary> domains) {
    if (domains == null) return List.of();
    return domains.stream().map(ScaleSiteAuthorizedScalerApiMapper::toModel).toList();
  }
}
