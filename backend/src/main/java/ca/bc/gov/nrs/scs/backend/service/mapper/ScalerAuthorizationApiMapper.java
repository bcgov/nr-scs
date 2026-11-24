package ca.bc.gov.nrs.scs.backend.service.mapper;

import java.util.ArrayList;
import java.util.List;

import ca.bc.gov.nrs.scs.backend.domain.authorization.ScalerAuthorizationListEntry;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationListItem;

/** Projects scaler-authorization domain records onto the generated API models. */
public final class ScalerAuthorizationApiMapper {

  private ScalerAuthorizationApiMapper() {}

  public static ScalerAuthorizationListItem toListItem(ScalerAuthorizationListEntry domain) {
    if (domain == null) return null;
    ScalerAuthorizationListItem model = new ScalerAuthorizationListItem();
    model.setScalerAuthorizationId(domain.scalerAuthorizationId());
    model.setAuthorizationEffectiveDate(domain.authorizationEffectiveDate());
    model.setAuthorizationExpiryDate(domain.authorizationExpiryDate());
    model.setDistrictWideInd(domain.districtWideInd());
    model.setOrgUnitNo(domain.orgUnitNo());
    model.setAuthorizedSites(
        domain.authorizedSites() == null ? new ArrayList<>() : new ArrayList<>(domain.authorizedSites()));
    model.setStatus(domain.status());
    model.setLetterExists(domain.letterExists());
    return model;
  }

  public static List<ScalerAuthorizationListItem> toListItems(List<ScalerAuthorizationListEntry> domains) {
    if (domains == null) return List.of();
    return domains.stream().map(ScalerAuthorizationApiMapper::toListItem).toList();
  }
}
