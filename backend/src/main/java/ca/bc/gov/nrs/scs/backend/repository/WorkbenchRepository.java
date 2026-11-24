package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.domain.workbench.MarkSiteDesignationSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.workbench.MarkSiteDesignationWorkbenchEntry;
import ca.bc.gov.nrs.scs.backend.domain.workbench.ScaleSiteAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.workbench.ScalerAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationWorkbenchResult;
import java.util.ArrayList;
import java.util.List;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Repository for the authorization workbench page. Owns every operation backed by a workbench Oracle
 * package: the cross-feature renewal package {@code scs_scale_workbench_pkg}, and the per-feature
 * workbench-grid view packages ({@code scs_scaler_auth_wb_vw_pkg},
 * {@code scs_scale_site_auth_wb_vw_pkg}, {@code scs_mark_site_des_wb_vw_pkg}) that drive the expiring
 * -authorization grids. Consolidating them here keeps all workbench-package access in one vertical.
 *
 * <p><b>Transaction contract.</b> The {@code renew_*} functions {@code COMMIT} internally, so a
 * renew must be a standalone unit of work — never call it from a {@code @Transactional} method that
 * performs additional writes, or its commit would prematurely commit that surrounding work and
 * defeat any later rollback. The grid searches are read-only.
 */
@Repository
public class WorkbenchRepository extends AbstractRepository {

  private static final String WORKBENCH_PKG = "scs_scale_workbench_pkg";
  private static final String SCALER_AUTH_WB_VW_PKG = "scs_scaler_auth_wb_vw_pkg";
  private static final String SCALE_SITE_AUTH_WB_VW_PKG = "scs_scale_site_auth_wb_vw_pkg";
  private static final String MARK_SITE_DES_WB_VW_PKG = "scs_mark_site_des_wb_vw_pkg";

  public WorkbenchRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  /** Renews a scaler authorization, returning the id of the newly-created authorization. */
  public Long renewScalerAuthorization(Long authorizationId) {
    return renew(authorizationId, "renew_scaler_auth");
  }

  /** Renews a scale-site authorization, returning the id of the newly-created authorization. */
  public Long renewScaleSiteAuthorization(Long authorizationId) {
    return renew(authorizationId, "renew_scale_site_auth");
  }

  /** Renews a hauling-mark (mark-site) authorization, returning the id of the newly-created authorization. */
  public Long renewMarkSiteDesignation(Long authorizationId) {
    return renew(authorizationId, "renew_hauling_mark_auth");
  }

  private Long renew(Long authorizationId, String functionName) {
    return queryLongCall(buildFunctionCall(WORKBENCH_PKG, functionName, 1),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(authorizationId));
  }

  public List<ScalerAuthorizationWorkbenchResult> searchScalerAuthorizations(
      ScalerAuthorizationWorkbenchSearchCriteria criteria) {

    return queryCursorCall(buildSearchRecsCall(SCALER_AUTH_WB_VW_PKG, 9),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(criteria.scalerAuthorizationId())
            .date(criteria.effectiveDate())
            .date(criteria.expiryDate())
            .string(criteria.scalerLicenceNumber())
            .longValue(criteria.regionId())
            .longValue(criteria.districtId())
            .string(criteria.scalerName())
            .intValue(criteria.primarySort())
            .intValue(criteria.secondarySort()),
        rs -> {
          List<ScalerAuthorizationWorkbenchResult> out = new ArrayList<>();
          if (rs == null) {
            return out;
          }
          while (rs.next()) {
            ScalerAuthorizationWorkbenchResult rec = new ScalerAuthorizationWorkbenchResult();
            rec.setScalerAuthorizationId(JsonNullable.of(getLongNullable(rs, 1)));
            rec.setEffectiveDate(JsonNullable.of(getLocalDateNullable(rs, 2)));
            rec.setExpiryDate(JsonNullable.of(getLocalDateNullable(rs, 3)));
            rec.setScalerLicenceNumber(JsonNullable.of(rs.getString(4)));
            rec.setRegionId(JsonNullable.of(getLongNullable(rs, 5)));
            rec.setDistrictId(JsonNullable.of(getLongNullable(rs, 6)));
            rec.setScalerName(JsonNullable.of(rs.getString(7)));
            out.add(rec);
          }
          return out;
        });
  }

  public List<ScaleSiteAuthorizationWorkbenchResult> searchScaleSiteAuthorizations(
      ScaleSiteAuthorizationWorkbenchSearchCriteria criteria) {

    return queryCursorCall(buildSearchRecsCall(SCALE_SITE_AUTH_WB_VW_PKG, 9),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(criteria.scaleSiteAuthorizationId())
            .date(criteria.effectiveDate())
            .date(criteria.expiryDate())
            .string(criteria.scaleSiteNumber())
            .string(criteria.scaleSiteName())
            .longValue(criteria.regionId())
            .longValue(criteria.districtId())
            .intValue(criteria.primarySort())
            .intValue(criteria.secondarySort()),
        rs -> {
          List<ScaleSiteAuthorizationWorkbenchResult> out = new ArrayList<>();
          if (rs == null) {
            return out;
          }
          while (rs.next()) {
            ScaleSiteAuthorizationWorkbenchResult rec = new ScaleSiteAuthorizationWorkbenchResult();
            rec.setScaleSiteAuthorizationId(JsonNullable.of(getLongNullable(rs, 1)));
            rec.setEffectiveDate(JsonNullable.of(getLocalDateNullable(rs, 2)));
            rec.setExpiryDate(JsonNullable.of(getLocalDateNullable(rs, 3)));
            rec.setScaleSiteNumber(JsonNullable.of(rs.getString(4)));
            rec.setScaleSiteName(JsonNullable.of(rs.getString(5)));
            rec.setRegionId(JsonNullable.of(getLongNullable(rs, 6)));
            rec.setDistrictId(JsonNullable.of(getLongNullable(rs, 7)));
            out.add(rec);
          }
          return out;
        });
  }

  public List<MarkSiteDesignationWorkbenchEntry> searchMarkSiteDesignations(MarkSiteDesignationSearchCriteria criteria) {

    return queryCursorCall(buildSearchRecsCall(MARK_SITE_DES_WB_VW_PKG, 8),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(criteria.authorizationId())
            .date(criteria.effectiveDate())
            .date(criteria.expiryDate())
            .string(criteria.timberMark())
            .longValue(criteria.regionId())
            .longValue(criteria.districtId())
            .intValue(criteria.primarySort())
            .intValue(criteria.secondarySort()),
        rs -> {
          List<MarkSiteDesignationWorkbenchEntry> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new MarkSiteDesignationWorkbenchEntry(
                getLongNullable(rs, 1),
                getLocalDateNullable(rs, 2),
                getLocalDateNullable(rs, 3),
                rs.getString(4),
                getLongNullable(rs, 5),
                getLongNullable(rs, 6)));
          }
          return out;
        });
  }

}
