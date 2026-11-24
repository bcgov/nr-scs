package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ClientApi;
import ca.bc.gov.nrs.scs.backend.model.Client;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.ClientService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ClientController implements ClientApi {

  private final ClientService clientService;

  public ClientController(ClientService clientService) {
    this.clientService = clientService;
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.CLIENT_QUERY)
  public ResponseEntity<List<Client>> searchClients(
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
    return ResponseEntity.ok(
        clientService.searchClients(
            client,
            companyName,
            lastName,
            firstName,
            city,
            businessPhone,
            cellPhone,
            emailAddress,
            clientNumber,
            clientLocnCode,
            primarySort,
            secondarySort));
  }
}
