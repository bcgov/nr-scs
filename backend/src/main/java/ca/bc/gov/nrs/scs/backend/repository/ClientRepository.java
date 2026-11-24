package ca.bc.gov.nrs.scs.backend.repository;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.padClientNumber;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.padClientNumberCriterion;

import ca.bc.gov.nrs.scs.backend.model.Client;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

@Repository
public class ClientRepository extends AbstractRepository {

  private static final String CLIENT_SEARCH_PKG = "scs_client_vw_pkg";


  public ClientRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public boolean checkClientExists(String clientNumber, String clientLocnCode) {
    Boolean found = queryClients(
        cs -> {
          for (int index = 2; index <= 9; index++) {
            cs.setNull(index, Types.VARCHAR);
          }
          cs.setString(10, padClientNumber(clientNumber));
          cs.setString(11, clientLocnCode);
          cs.setInt(12, 1);
          cs.setInt(13, 1);
        },
        rs -> rs != null && rs.next());
    return Boolean.TRUE.equals(found);
  }

  /**
   * The client's {@code company_name} for a single forest client number (via
   * {@code scs_client_vw_pkg.search_recs}, bound on {@code p_client_number} only), or {@code null}
   * when the client is not found. Used for the Organization display; the number is padded to
   * an exact match (no {@code %} wildcard).
   */
  public String findCompanyName(String clientNumber) {
    return queryClients(
        cs -> {
          for (int index = 2; index <= 9; index++) {
            cs.setNull(index, Types.VARCHAR);
          }
          cs.setString(10, padClientNumber(clientNumber));
          cs.setNull(11, Types.VARCHAR);
          cs.setInt(12, 1);
          cs.setInt(13, 1);
        },
        rs -> (rs != null && rs.next()) ? rs.getString("company_name") : null);
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

    return queryClients(
        cs -> ParameterBinder.afterReturn(cs)
            // Combined "client / locn" LIKE field — never padded (legacy ClientVwDto:79)
            .string(client)
            .string(companyName)
            .string(lastName)
            .string(firstName)
            .string(city)
            .string(businessPhone)
            .string(cellPhone)
            .string(emailAddress)
            // Zero-padded unless the caller sent a % wildcard (package matches with LIKE)
            .string(padClientNumberCriterion(clientNumber))
            .string(clientLocnCode)
            .intValue(primarySort)
            .intValue(secondarySort),
        rs -> {
          List<Client> out = new ArrayList<>();
          while (rs.next()) {
            Client c = new Client()
                .client(rs.getString("client"))
                .companyName(rs.getString("company_name"))
                .lastName(rs.getString("last_name"))
                .firstName(rs.getString("first_name"))
                .city(rs.getString("city"))
                .businessPhone(rs.getString("business_phone"))
                .cellPhone(rs.getString("cell_phone"))
                .emailAddress(rs.getString("email_address"))
                .clientNumber(rs.getString("client_number"))
                .clientLocnCode(rs.getString("client_locn_code"));

            out.add(c);
          }
          return out;
        });
  }

  private <T> T queryClients(StatementBinder binder, ResultSetMapper<T> mapper) {
    return queryCursorCall(buildSearchRecsCall(CLIENT_SEARCH_PKG, 12), binder, mapper);
  }
}
