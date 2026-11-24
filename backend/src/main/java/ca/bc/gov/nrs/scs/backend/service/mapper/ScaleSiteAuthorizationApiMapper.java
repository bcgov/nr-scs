package ca.bc.gov.nrs.scs.backend.service.mapper;

import java.util.List;

import ca.bc.gov.nrs.scs.backend.domain.authorization.ScaleSiteAuthorizationListEntry;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationDetail;
import org.openapitools.jackson.nullable.JsonNullable;

/** Projects scale-site-authorization domain records onto the generated API models. */
public final class ScaleSiteAuthorizationApiMapper {

  private ScaleSiteAuthorizationApiMapper() {}

  public static ScaleSiteAuthorizationDetail toDetail(ScaleSiteAuthorizationListEntry domain) {
    if (domain == null) return null;
    ScaleSiteAuthorizationDetail model = new ScaleSiteAuthorizationDetail();
    model.setScaleSiteAuthorizationId(domain.scaleSiteAuthorizationId());
    model.setScaleSiteIdNmbr(domain.scaleSiteIdNmbr());
    model.setLetterArcsFileNumber(domain.letterArcsFileNumber());
    model.setAuthorizationEffectiveDate(domain.authorizationEffectiveDate());
    model.setAuthorizationExpiryDate(domain.authorizationExpiryDate());
    model.setExpiryNotificationInd(domain.expiryNotificationInd());
    model.setExpectedScaleVolume(domain.expectedScaleVolume());
    model.setCancellationDate(domain.cancellationDate());
    model.setCancellationReasonTxt(domain.cancellationReasonTxt());
    model.setStatus(domain.status());
    model.setLetterExists(domain.letterExists());
    model.setEntryTimestamp(JsonNullable.of(domain.entryTimestamp()));
    model.setEntryUserid(JsonNullable.of(domain.entryUserid()));
    model.setUpdateTimestamp(JsonNullable.of(domain.updateTimestamp()));
    model.setUpdateUserid(JsonNullable.of(domain.updateUserid()));
    model.setRevisionCount(JsonNullable.of(domain.revisionCount()));
    // conditions intentionally left as the model default (empty list); the list view does not load them.
    return model;
  }

  public static List<ScaleSiteAuthorizationDetail> toDetails(List<ScaleSiteAuthorizationListEntry> domains) {
    if (domains == null) return List.of();
    return domains.stream().map(ScaleSiteAuthorizationApiMapper::toDetail).toList();
  }
}
