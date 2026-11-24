package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.AuthorizedScalerSummary;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.SiteAuthorizationCoverage;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ScaleSiteAuthorizedScalerRepository extends AbstractRepository {

  private static final String AUTHORIZED_SCALERS_VW_PKG = "scs_authorized_scalers_vw_pkg";
  private static final String SITE_AUTH_SCALERS_VW_PKG = "scs_site_auth_scalers_vw_pkg";

  public ScaleSiteAuthorizedScalerRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  /**
   * Lists every scaler authorized at a scale site, backing the legacy Authorized Scalers tab.
   * Calls {@code scs_authorized_scalers_vw_pkg.search_recs} bound by {@code scale_site_id_nmbr}
   * (parameter position 3). The view computes {@code status}. Sorted by status then expiry date,
   * matching the legacy screen (primary sort 4, secondary sort 6).
   */
  public List<AuthorizedScalerSummary> listByScaleSite(String scaleSiteIdNmbr) {
    return queryCursorCall(buildSearchRecsCall(AUTHORIZED_SCALERS_VW_PKG, 4),
        cs -> ParameterBinder.afterReturn(cs)
            .nullString()                    // p_status (filtered client-side)
            .string(scaleSiteIdNmbr)         // p_scale_site_id_nmbr
            .intValue(4)                     // p_primary_sort: status
            .intValue(6),                    // p_secondary_sort: expiry date
        rs -> {
          List<AuthorizedScalerSummary> rows = new ArrayList<>();
          if (rs != null) {
            while (rs.next()) {
              rows.add(mapRow(rs));
            }
          }
          return rows;
        });
  }

  /**
   * Every authorization covering a scale site, for access decisions rather than display. Calls
   * {@code scs_site_auth_scalers_vw_pkg.search_recs} by site; other criteria are null, meaning "any".
   *
   * <p><b>Not {@link #listByScaleSite}.</b> That reads {@code scs_authorized_scalers_vw}, whose display
   * joins require the scaler's client to have a {@code client_locn_code = '00'} row — clients without
   * one silently lose every authorization (most pairs, on the seeded data). This view has no such joins.
   */
  public List<SiteAuthorizationCoverage> listAuthorizationCoverageForSite(String scaleSiteIdNmbr) {
    return queryCursorCall(buildSearchRecsCall(SITE_AUTH_SCALERS_VW_PKG, 10),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()                   // p_scaler_authorization_id
            .nullString()                    // p_scaler_licence_no
            .nullNumeric()                   // p_org_unit_no
            .nullString()                    // p_district_wide_ind
            .nullDate()                      // p_authorization_effectiv_dt
            .nullDate()                      // p_authorization_expiry_date
            .nullDate()                      // p_cancellation_date
            .string(scaleSiteIdNmbr)         // p_scale_site_id_nmbr
            .intValue(2)                     // p_primary_sort: scaler licence no
            .intValue(1),                    // p_secondary_sort: authorization id
        rs -> {
          List<SiteAuthorizationCoverage> rows = new ArrayList<>();
          if (rs != null) {
            while (rs.next()) {
              rows.add(mapCoverageRow(rs));
            }
          }
          return rows;
        });
  }

  /**
   * Every authorization held by one scaler, for access decisions rather than display. The mirror of
   * {@link #listAuthorizationCoverageForSite}: same view, same parameter list, bound by licence number
   * (position 2) instead of site — so both directions of the owner/industry-scaler bridge read exactly
   * the same rows and can never disagree about who is authorized where.
   *
   * <p>Answers "which sites may this scaler scale at", which is how a Scale Site Owner reaches a scaler
   * who is not their own employee: {@code roles-permissions.md} §4 grants them "select information on
   * scalers authorized to scale at their sites".
   */
  public List<SiteAuthorizationCoverage> listAuthorizationCoverageForScaler(String scalerLicenceNo) {
    return queryCursorCall(buildSearchRecsCall(SITE_AUTH_SCALERS_VW_PKG, 10),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()                   // p_scaler_authorization_id
            .string(scalerLicenceNo)         // p_scaler_licence_no
            .nullNumeric()                   // p_org_unit_no
            .nullString()                    // p_district_wide_ind
            .nullDate()                      // p_authorization_effectiv_dt
            .nullDate()                      // p_authorization_expiry_date
            .nullDate()                      // p_cancellation_date
            .nullString()                    // p_scale_site_id_nmbr
            .intValue(2)                     // p_primary_sort: scaler licence no
            .intValue(1),                    // p_secondary_sort: authorization id
        rs -> {
          List<SiteAuthorizationCoverage> rows = new ArrayList<>();
          if (rs != null) {
            while (rs.next()) {
              rows.add(mapCoverageRow(rs));
            }
          }
          return rows;
        });
  }

  private SiteAuthorizationCoverage mapCoverageRow(ResultSet rs) throws java.sql.SQLException {
    return new SiteAuthorizationCoverage(
        getLongNullable(rs, "scaler_authorization_id"),
        rs.getString("scaler_licence_no"),
        rs.getString("scale_site_id_nmbr"),
        rs.getString("district_wide_ind"),
        getLocalDateNullable(rs, "authorization_effective_date"),
        getLocalDateNullable(rs, "authorization_expiry_date"),
        getLocalDateNullable(rs, "cancellation_date"));
  }

  private AuthorizedScalerSummary mapRow(ResultSet rs) throws java.sql.SQLException {
    return new AuthorizedScalerSummary(
        getLongNullable(rs, "scaler_authorization_id"),
        rs.getString("scaler_licence_no"),
        rs.getString("client_name"),
        rs.getString("status"),
        rs.getString("scaler_appointment_types"),
        getLocalDateNullable(rs, "authorization_effective_date"),
        getLocalDateNullable(rs, "authorization_expiry_date"),
        rs.getString("district_wide_ind"));
  }
}
