package ca.bc.gov.nrs.scs.backend.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteOwnerRecord;

@Repository
public class ScaleSiteOwnerRepository extends AbstractRepository {

  private static final String OWNER_VW_PKG = "scs_scale_site_owner_vw_pkg";

  public ScaleSiteOwnerRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public ScaleSiteOwnerRecord getOwner(String scaleSiteIdNmbr) {
    List<ScaleSiteOwnerRecord> results = queryCursorCall(
        buildSearchRecsCall(OWNER_VW_PKG, 20),
        cs -> ParameterBinder.afterReturn(cs)
            .string(scaleSiteIdNmbr)  // p_scale_site_id_nmbr
            .nullString()             // p_client_number
            .nullString()             // p_client_locn_code
            .nullString()             // p_company_name
            .nullString()             // p_last_name
            .nullString()             // p_first_name
            .nullString()             // p_business_phone
            .nullString()             // p_resident_phone
            .nullString()             // p_cell_phone
            .nullString()             // p_fax
            .nullString()             // p_email
            .nullString()             // p_address_1
            .nullString()             // p_address_2
            .nullString()             // p_address_3
            .nullString()             // p_city
            .nullString()             // p_province
            .nullString()             // p_country
            .nullString()             // p_postal_code
            .nullNumeric()            // p_primary_sort
            .nullNumeric(),           // p_secondary_sort
        rs -> {
          List<ScaleSiteOwnerRecord> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new ScaleSiteOwnerRecord(
                rs.getString("scale_site_id_nmbr"),
                rs.getString("client_number"),
                rs.getString("client_locn_code"),
                rs.getString("company_name"),
                rs.getString("last_name"),
                rs.getString("first_name"),
                rs.getString("business_phone"),
                rs.getString("resident_phone"),
                rs.getString("cell_phone"),
                rs.getString("fax"),
                rs.getString("email"),
                rs.getString("address_1"),
                rs.getString("address_2"),
                rs.getString("address_3"),
                rs.getString("city"),
                rs.getString("province"),
                rs.getString("country"),
                rs.getString("postal_code")
            ));
          }
          return out;
        });
    return results.isEmpty() ? null : results.get(0);
  }
}
