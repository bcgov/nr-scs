package ca.bc.gov.nrs.scs.backend.repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import ca.bc.gov.nrs.scs.backend.model.HaulMarkAuthorization;

@Repository
public class HaulMarkAuthorizationRepository extends AbstractRepository {

  private static final String HAUL_MARK_AUTH_SRCH_VW_PKG = "scs_haul_mark_auth_srch_vw_pkg";

  public HaulMarkAuthorizationRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public List<HaulMarkAuthorization> searchHaulMarkAuthorizations(
      Long haulingMarkAuthorizationId,
      String timberMark,
      LocalDate effectiveDate,
      LocalDate expiryDate,
      String orgUnitName,
      Integer primarySort,
      Integer secondarySort) {

    return queryCursorCall(buildSearchRecsCall(HAUL_MARK_AUTH_SRCH_VW_PKG, 7),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(haulingMarkAuthorizationId)
            .string(timberMark)
            .date(effectiveDate)
            .date(expiryDate)
            .string(orgUnitName)
            .intValue(primarySort)
            .intValue(secondarySort),
        rs -> {
          List<HaulMarkAuthorization> out = new ArrayList<>();
          while (rs.next()) {
            Long id = getLongNullable(rs, "hauling_mark_authorization_id");
            LocalDate eff = getLocalDateNullable(rs, "effective_date");
            LocalDate exp = getLocalDateNullable(rs, "expiry_date");

            HaulMarkAuthorization rec = new HaulMarkAuthorization()
                .haulingMarkAuthorizationId(id)
                .timberMark(rs.getString("timber_mark"))
                .effectiveDate(eff)
                .expiryDate(exp)
                .orgUnitName(rs.getString("org_unit_name"));

            out.add(rec);
          }
          return out;
        });
  }

}
