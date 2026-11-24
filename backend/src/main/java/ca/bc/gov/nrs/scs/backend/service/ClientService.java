package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.model.Client;
import ca.bc.gov.nrs.scs.backend.repository.ClientRepository;
import ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ClientService {

  private final ClientRepository clientRepository;

  public ClientService(ClientRepository clientRepository) {
    this.clientRepository = clientRepository;
  }

  public List<Client> searchClients(
          String client,
          String companyName,
          String lastName,
          String firstName,
          String city,
          String businessPhone,
          String cellPhone,
          String emailAddress,
          String clientNumber,
          String clientLocnCode,
          Integer primarySort,
          Integer secondarySort) {

    // Client-restricted external users see only their own forest client, so the request's client
    // number is ignored — the same override the scaler and scale-site searches apply. Also closes the
    // wildcard path: padClientNumberCriterion passes a caller-supplied "%" through to the package's
    // LIKE, which an unforced value would let a restricted caller use to match every client.
    //
    // This is a deliberate divergence from legacy ClientSearchAction, which never restricted results,
    // taken to honour the matrix's R (ltd) on "Queries – Clients – Results" for IND/OWN.
    String effectiveClientNumber = SecurityContextUtils.isClientRestricted()
        ? SecurityContextUtils.currentUserClientNumber()
        : clientNumber;

    return clientRepository.searchClients(
            SCSUtils.upperOrNull(client),
            SCSUtils.upperOrNull(companyName),
            SCSUtils.upperOrNull(lastName),
            SCSUtils.upperOrNull(firstName),
            SCSUtils.upperOrNull(city),
            businessPhone,
            cellPhone,
            SCSUtils.upperOrNull(emailAddress),
            effectiveClientNumber,
            SCSUtils.upperOrNull(clientLocnCode),
            primarySort,
            secondarySort);
  }
}
