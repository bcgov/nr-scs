package ca.bc.gov.nrs.scs.backend.domain.contacts;

import java.time.LocalDate;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

/**
 * Service-input shape for the scale site contact update flow. Carries the user-editable fields as
 * domain types — indicators as {@link YesNo}, dates as {@link LocalDate} — so the service never
 * touches generated-API types or {@code JsonNullable}. The site id and client contact id are
 * supplied from the request path, not the body, so they are not part of this command.
 *
 * <p>Producer: {@code ScaleSiteContactApiMapper.toUpdateCommand} from the generated
 * {@code ScaleSiteContactUpdateRequest}. Consumer: {@code ScaleSiteContactService.updateContact}.
 */
public record ScaleSiteContactUpdateCommand(
    String contactRoleDescription,
    YesNo primaryContactInd,
    YesNo siteInformationAccessInd,
    LocalDate effectiveDate,
    LocalDate expiryDate) {}
