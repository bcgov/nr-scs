package ca.bc.gov.nrs.scs.backend.domain.contacts;

import java.time.LocalDate;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

/**
 * Service-input shape for the scale site contact create flow. Carries the domain-typed fields the
 * user supplies on screen — indicators as {@link YesNo}, dates as {@link LocalDate}, and the client
 * contact id as a {@code Long} — so the service never touches generated-API types or
 * {@code JsonNullable}.
 *
 * <p>Producer: {@code ScaleSiteContactApiMapper.toCreateCommand} from the generated
 * {@code ScaleSiteContactCreateRequest}. Consumer: {@code ScaleSiteContactService.createContact}.
 */
public record ScaleSiteContactCreateCommand(
    Long clientContactId,
    String contactRoleDescription,
    YesNo primaryContactInd,
    YesNo siteInformationAccessInd,
    LocalDate effectiveDate,
    LocalDate expiryDate) {}
