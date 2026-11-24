package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.domain.authorization.ScalerAuthorizationListEntry;
import ca.bc.gov.nrs.scs.backend.domain.authorization.ScalerAuthorizationRecord;
import ca.bc.gov.nrs.scs.backend.model.*;
import ca.bc.gov.nrs.scs.backend.model.report.ReportDefinition;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Blob;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;

@Repository
public class ScalerAuthorizationRepository extends ScaleAuthConditionRepositorySupport {

    private static final String AUTHORIZED_FORST_PRDCT_PKG = "SCS_AUTHORIZED_FORST_PRDCT_PKG";
    private static final String SCALE_JOB_FUNCTION_PKG = "scs_scale_job_function_pkg";
    private static final String SCALER_AUTHORZTN_CNDTN_PKG = "SCS_SCALER_AUTHORZTN_CNDTN_PKG";
    private static final String SCALER_AUTHORIZATION_PKG = "scs_scaler_authorization_pkg";
    private static final String SCALER_AUTHORIZED_SITE_PKG = "scs_scaler_authorized_site_pkg";
    private static final String CRYSTAL_REPORTS_PKG = "SCS_CRYSTAL_REPORTS_PKG";
    private static final String SCALER_AUTHORIZED_STATUS_PKG = "SCS_SCALER_AUTHORZD_STS_VW_PKG";
    private static final String SCALER_CONDITION_PKG = "scs_scaler_condition_vw_pkg";

  public ScalerAuthorizationRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public ScalerAuthorizationDetail createScalerAuthorization(ScalerAuthorizationCreate req) {
    final String userId = currentUserIdOrSystem();

    return queryCursorCall(buildInsertRecCall(SCALER_AUTHORIZATION_PKG, 12),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()                                    // scaler_authorization_id
            .string(req.getScalerLicenceNo())
            .longValue(req.getOrgUnitNo())
            .string(req.getDistrictWideInd())
            .string(req.getLetterArcsFileNumber())
            .date(req.getAuthorizationEffectiveDate())
            .date(req.getAuthorizationExpiryDate())
            .string(req.getExpiryNotificationInd())
            .date(req.getCancellationDate())
            .string(req.getCancellationReasonTxt())
            .string(userId)
            .string(userId),
        rs -> rs.next() ? mapScalerAuthorizationRow(rs) : null);
  }

  public ScalerAuthorizationDetail getScalerAuthorization(Long scalerAuthorizationId) {
    ScalerAuthorizationDetail detail = getScalerAuthorizationBase(scalerAuthorizationId);
    if (detail == null) {
      return null;
    }

    populateScalerAuthorizationDetail(detail);
    return detail;
  }

  /**
   * Lists every authorization belonging to a scaler, mirroring the legacy
   * {@code ScalerAuthorizationAction.list()}. Calls {@code scs_scaler_authorization_pkg.search_recs}
   * bound by {@code scaler_licence_no} (parameter position 2), then enriches each row with its
   * authorized sites, a computed status, and a letter-exists flag.
   */
  public List<ScalerAuthorizationListEntry> listScalerAuthorizationsByLicence(String scalerLicenceNo) {
    List<ScalerAuthorizationDetail> baseRows = queryCursorCall(
        buildSearchRecsCall(SCALER_AUTHORIZATION_PKG, 12),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()                  // scaler_authorization_id
            .string(scalerLicenceNo)        // scaler_licence_no
            .nullNumeric()                  // org_unit_no
            .nullString()                   // district_wide_ind
            .nullString()                   // letter_arcs_file_number
            .nullDate()                     // authorization_effective_date
            .nullDate()                     // authorization_expiry_date
            .nullString()                   // expiry_notification_ind
            .nullDate()                     // cancellation_date
            .nullString()                   // cancellation_reason_txt
            .nullString()                   // entry_userid
            .nullString(),                  // update_userid
        rs -> {
          List<ScalerAuthorizationDetail> rows = new ArrayList<>();
          while (rs.next()) {
            rows.add(mapScalerAuthorizationRow(rs));
          }
          return rows;
        });

    List<ScalerAuthorizationListEntry> items = new ArrayList<>();
    // N+1 by design: each row is enriched with two more queries (authorized sites + letter-exists),
    // mirroring the legacy per-authorization enrichment (populateAuthrizedSites / populateLetterExists).
    // Acceptable for the small authorization counts a single scaler has; revisit with a set-based
    // query if that assumption changes.
    for (ScalerAuthorizationDetail row : baseRows) {
      items.add(toListEntry(row));
    }
    return items;
  }

  private ScalerAuthorizationListEntry toListEntry(ScalerAuthorizationDetail row) {
    List<String> sites = new ArrayList<>();
    boolean letterExists = false;

    Long scalerAuthorizationId = row.getScalerAuthorizationId();
    if (scalerAuthorizationId != null) {
      for (ScaleSiteSearchResult site : getScalerAuthorizationScaleSites(scalerAuthorizationId)) {
        String siteNumber = site == null ? null : getNullable(site.getScaleSiteIdNmbr());
        if (siteNumber != null && !siteNumber.isBlank()) {
          sites.add(siteNumber);
        }
      }
      letterExists = getScalerAuthorizationLetterExists(scalerAuthorizationId);
    }

    return new ScalerAuthorizationListEntry(
        row.getScalerAuthorizationId(),
        row.getAuthorizationEffectiveDate(),
        row.getAuthorizationExpiryDate(),
        row.getDistrictWideInd(),
        row.getOrgUnitNo(),
        sites,
        computeScalerAuthorizationStatus(row),
        letterExists);
  }

  public boolean setExpiryNotificationInd(Long scalerAuthorizationId, String expiryNotificationInd) {
    ScalerAuthorizationDetail detail = getScalerAuthorizationBase(scalerAuthorizationId);
    if (detail == null) {
      return false;
    }

    final String userId = currentUserIdOrSystem();
    final String detailEntryUserId = detail.getEntryUserid().orElse(null);
    final String entryUserId = isBlank(detailEntryUserId) ? userId : detailEntryUserId;

    ScalerAuthorizationDetail updated = queryCursorCall(buildUpdateRecCall(SCALER_AUTHORIZATION_PKG, 12),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(detail.getScalerAuthorizationId())
            .string(detail.getScalerLicenceNo())
            .longValue(detail.getOrgUnitNo())
            .string(detail.getDistrictWideInd())
            .string(detail.getLetterArcsFileNumber())
            .date(detail.getAuthorizationEffectiveDate())
            .date(detail.getAuthorizationExpiryDate())
            .string(expiryNotificationInd)
            .date(detail.getCancellationDate())
            .string(detail.getCancellationReasonTxt())
            .string(entryUserId)
            .string(userId),
        rs -> rs.next() ? mapScalerAuthorizationRow(rs) : null);

    return updated != null;
  }

  public ScalerAuthorizationDetail updateScalerAuthorization(ScalerAuthorizationRecord saRecord) {
    final String userId = currentUserIdOrSystem();
    final String entryUserId = saRecord.entryUserid() == null ? userId : saRecord.entryUserid();

    return queryCursorCall(buildUpdateRecCall(SCALER_AUTHORIZATION_PKG, 12),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(saRecord.scalerAuthorizationId())
            .string(saRecord.scalerLicenceNo())
            .longValue(saRecord.orgUnitNo())
            .string(saRecord.districtWideInd())
            .string(saRecord.letterArcsFileNumber())
            .date(saRecord.authorizationEffectiveDate())
            .date(saRecord.authorizationExpiryDate())
            .string(saRecord.expiryNotificationInd())
            .date(saRecord.cancellationDate())
            .string(saRecord.cancellationReasonTxt())
            .string(entryUserId)
            .string(userId),
        rs -> rs.next() ? mapScalerAuthorizationRow(rs) : null);
  }

  public void deleteScalerAuthorization(Long scalerAuthorizationId) {
    executeVoidCall(buildDeleteRecCall(SCALER_AUTHORIZATION_PKG, 1),
        cs -> ParameterBinder.fromStart(cs)
            .longValue(scalerAuthorizationId));
  }

  public void addConditions(Long scalerAuthorizationId,
      List<ScaleAuthConditionRef> conditions) {
    if (conditions == null || conditions.isEmpty()) {
      return;
    }

    final String userId = currentUserIdOrSystem();

    for (var condition : conditions) {
      if (condition == null || condition.getScaleAuthConditionId() == null) {
        continue;
      }
      queryCursorCall(buildInsertRecCall(SCALER_AUTHORZTN_CNDTN_PKG, 5),
          cs -> ParameterBinder.afterReturn(cs)
              .longValue(scalerAuthorizationId)
              .string(condition.getScaleConditionClassCode())
              .longValue(condition.getScaleAuthConditionId())
              .string(userId)
              .string(userId),
          rs -> null);
    }
  }

  public void addJobFunctions(Long scalerAuthorizationId, List<String> jobFunctions) {
    addStringAssociations(buildInsertRecCall(SCALE_JOB_FUNCTION_PKG, 4), scalerAuthorizationId, jobFunctions);
  }

  public void addAuthorizedForestProducts(Long scalerAuthorizationId, List<String> products) {
    addStringAssociations(buildInsertRecCall(AUTHORIZED_FORST_PRDCT_PKG, 4), scalerAuthorizationId, products);
  }

  public void addScaleSites(Long scalerAuthorizationId, List<String> scaleSites) {
    addStringAssociations(buildInsertRecCall(SCALER_AUTHORIZED_SITE_PKG, 4), scalerAuthorizationId, scaleSites);
  }

  private void addStringAssociations(String sql, Long scalerAuthorizationId, List<String> values) {
    if (values == null || values.isEmpty()) {
      return;
    }

    final String userId = currentUserIdOrSystem();

    for (String value : values) {
      if (value == null || value.isBlank()) {
        continue;
      }
      queryCursorCall(sql,
          cs -> ParameterBinder.afterReturn(cs)
              .longValue(scalerAuthorizationId)
              .string(value)
              .string(userId)
              .string(userId),
          rs -> null);
    }
  }

  public List<ScaleAuthCondition> getScaleAuthTemplateConditions(Long templateId) {
    Set<Long> ids = toIdSet(searchScaleAuthTemplateConditionIds(templateId));
    if (ids.isEmpty()) {
      return new ArrayList<>();
    }

    return fetchScaleAuthConditionsByIds(ids);
  }

  private List<Long> searchScaleAuthTemplateConditionIds(Long templateId) {
    return queryCursorCall(buildSearchRecsCall(SCALE_TEMPLATE_CONDITN_PKG, 5),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(templateId)
            .nullString()
            .nullNumeric()
            .nullString()
            .nullString(),
        rs -> {
          List<Long> ids = new ArrayList<>();
          while (rs.next()) {
            ids.add(readConditionId(rs));
          }
          return ids;
        });
  }

  private Set<Long> toIdSet(List<Long> refs) {
    Set<Long> ids = new HashSet<>();
    if (refs == null) {
      return ids;
    }

    for (Long id : refs) {
      if (id != null) {
        ids.add(id);
      }
    }
    return ids;
  }

  private Long readConditionId(ResultSet rs) throws java.sql.SQLException {
    Object rawId = rs.getObject(SCALE_AUTH_CONDITION_ID);
    return rawId == null ? null : ((Number) rawId).longValue();
  }

  /** Conditions are searched through {@code search_active_recs}: only currently effective rows. */
  @Override
  protected String scaleAuthConditionSearchCall() {
    return buildFunctionCall(SCALE_AUTH_CONDITION_PKG, "search_active_recs", 10);
  }

  private ScalerAuthorizationDetail mapScalerAuthorizationRow(ResultSet rs) throws java.sql.SQLException {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setScalerAuthorizationId(getLongNullable(rs, "scaler_authorization_id"));
    detail.setScalerLicenceNo(rs.getString("scaler_licence_no"));
    detail.setOrgUnitNo(getLongNullable(rs, "org_unit_no"));
    detail.setDistrictWideInd(rs.getString("district_wide_ind"));
    detail.setLetterArcsFileNumber(rs.getString("letter_arcs_file_number"));
    detail.setAuthorizationEffectiveDate(getLocalDateNullable(rs, "authorization_effective_date"));
    detail.setAuthorizationExpiryDate(getLocalDateNullable(rs, "authorization_expiry_date"));
    detail.setExpiryNotificationInd(rs.getString("expiry_notification_ind"));
    detail.setCancellationDate(getLocalDateNullable(rs, "cancellation_date"));
    detail.setCancellationReasonTxt(rs.getString("cancellation_reason_txt"));
    detail.setEntryTimestamp(JsonNullable.of(getOffsetDateTimeNullable(rs, "entry_timestamp")));
    detail.setEntryUserid(JsonNullable.of(rs.getString("entry_userid")));
    detail.setUpdateTimestamp(JsonNullable.of(getOffsetDateTimeNullable(rs, "update_timestamp")));
    detail.setUpdateUserid(JsonNullable.of(rs.getString("update_userid")));
    detail.setRevisionCount(JsonNullable.of(getLongNullable(rs, "revision_count")));
    return detail;
  }

  private void populateScalerAuthorizationDetail(ScalerAuthorizationDetail detail) {
    Long scalerAuthorizationId = detail.getScalerAuthorizationId();
    if (scalerAuthorizationId == null) {
      return;
    }

    detail.setJobFunctions(getScalerAuthorizationJobFunctions(scalerAuthorizationId));
    detail.setAuthForestProducts(getScalerAuthorizationForestProducts(scalerAuthorizationId));
    detail.setScaleSites(getScalerAuthorizationScaleSites(scalerAuthorizationId));
    detail.setConditions(getScalerAuthorizationConditions(scalerAuthorizationId));
    detail.setLetterExists(getScalerAuthorizationLetterExists(scalerAuthorizationId));
    detail.setStatus(computeScalerAuthorizationStatus(detail));
  }

  private List<String> getScalerAuthorizationJobFunctions(Long scalerAuthorizationId) {
    return queryCursorCall(buildSearchRecsCall(SCALE_JOB_FUNCTION_PKG, 4),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scalerAuthorizationId)
            .nullString()
            .nullString()
            .nullString(),
        rs -> {
          List<String> results = new java.util.ArrayList<>();
          while (rs.next()) {
            String code = rs.getString(2);
            if (code != null && !code.isBlank()) {
              results.add(code);
            }
          }
          return results;
        });
  }

  private List<String> getScalerAuthorizationForestProducts(Long scalerAuthorizationId) {
    return queryCursorCall(buildSearchRecsCall(AUTHORIZED_FORST_PRDCT_PKG, 4),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scalerAuthorizationId)
            .nullString()
            .nullString()
            .nullString(),
        rs -> {
          List<String> results = new java.util.ArrayList<>();
          while (rs.next()) {
            String code = rs.getString(2);
            if (code != null && !code.isBlank()) {
              results.add(code);
            }
          }
          return results;
        });
  }

  private List<ScaleSiteSearchResult> getScalerAuthorizationScaleSites(Long scalerAuthorizationId) {
    return queryCursorCall(buildSearchRecsCall(SCALER_AUTHORIZED_STATUS_PKG, 10),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scalerAuthorizationId)
            .nullString()
            .longValue(null)
            .nullString()
            .nullString()
            .nullString()
            .nullString()
            .nullString()
            .intValue(null)
            .intValue(null),
        rs -> {
          List<ScaleSiteSearchResult> results = new java.util.ArrayList<>();
          while (rs.next()) {
            ScaleSiteSearchResult site = new ScaleSiteSearchResult();
            site.scaleSiteIdNmbr(rs.getString(2));
            site.siteName(rs.getString(6));
            results.add(site);
          }
          return results;
        });
  }

  private List<ScaleAuthCondition> getScalerAuthorizationConditions(Long scalerAuthorizationId) {
    return queryCursorCall(buildSearchRecsCall(SCALER_CONDITION_PKG, 8),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scalerAuthorizationId)
            .longValue(null)
            .nullString()
            .nullString()
            .nullString()
            .nullString()
            .intValue(0)
            .intValue(0),
        rs -> {
          List<ScaleAuthCondition> results = new java.util.ArrayList<>();
          while (rs.next()) {
            ScaleAuthCondition condition = new ScaleAuthCondition();
            Long conditionId = rs.getLong(2);
            if (!rs.wasNull()) {
              condition.setScaleAuthConditionId(conditionId);
            }
            condition.setScaleAuthConditionTitle(rs.getString(3));
            condition.setMinistryStandardInd(rs.getString(4));
            condition.setScaleAuthConditionDesc(rs.getString(5));
            condition.setScaleConditionClassCode(rs.getString(6));
            results.add(condition);
          }
          return results;
        });
  }

  /**
   * Reports whether a downloadable letter blob is actually stored for the authorization, checking the
   * same {@code CRYSTAL_REPORTS_PKG} store that {@link #getScalerAuthorizationLetter} serves from.
   *
   * <p>This deliberately does <em>not</em> use the legacy {@code SCS_SCALER_AUTHORIZATN_LTR} flag
   * table: that table only records that a letter was issued and can be set (e.g. for letters created
   * in the legacy app) without a stored blob, which made the Authorizations tab offer "View Letter"
   * for a letter the download endpoint could not find ("Scaler authorization letter not found").
   * Only the blob length is read so the list does not materialize every PDF.
   *
   * <p>{@code PRC_GET_LETTER} raises {@code NO_DATA_FOUND} (ORA-01403) when no letter is stored
   * rather than returning a null blob, so this probe must treat that as "no letter exists"; letting
   * it propagate would 500 the whole list as soon as one authorization lacks a stored letter.
   */
  private boolean getScalerAuthorizationLetterExists(Long scalerAuthorizationId) {
    if (scalerAuthorizationId == null) {
      return false;
    }

    String sql = buildProcedureCall(CRYSTAL_REPORTS_PKG, "PRC_GET_LETTER", 3);
    try {
      return Boolean.TRUE.equals(getJdbcTemplate().execute(
          (Connection con) -> {
            CallableStatement cs = con.prepareCall(sql);
            cs.registerOutParameter(1, Types.BLOB);
            cs.setLong(2, scalerAuthorizationId);
            cs.setString(3, ReportDefinition.SCALER_AUTHORIZATION_LETTER.getReportName());
            return cs;
          },
          (CallableStatement cs) -> {
            cs.execute();
            Blob blob = cs.getBlob(1);
            return blob != null && blob.length() > 0;
          }));
    } catch (DataAccessException ex) {
      if (isNoDataFound(ex)) {
        return false;
      }
      throw ex;
    }
  }

  /**
   * Returns true when {@code ex} (or one of its causes) is an Oracle {@code NO_DATA_FOUND}
   * (ORA-01403). {@code PRC_GET_LETTER} raises this when no letter blob is stored, so callers using
   * it as an existence/fetch probe must translate it to "absent" instead of an error.
   */
  private static boolean isNoDataFound(DataAccessException ex) {
    for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
      if (cause instanceof SQLException sqlEx && sqlEx.getErrorCode() == 1403) {
        return true;
      }
      String message = cause.getMessage();
      if (message != null && message.contains("ORA-01403")) {
        return true;
      }
    }
    return false;
  }

  public void upsertScalerAuthorizationLetter(Long scalerAuthorizationId, byte[] letterBlob) {
    if (scalerAuthorizationId == null) {
      return;
    }

    if (letterBlob == null) {
      return;
    }

    executeVoidCall(buildProcedureCall(CRYSTAL_REPORTS_PKG, "PRC_SAVE_LETTER", 3), cs -> {
          cs.setLong(1, scalerAuthorizationId);
          cs.setString(2, ReportDefinition.SCALER_AUTHORIZATION_LETTER.getReportName());
          cs.setBytes(3, letterBlob);
        });
  }

  /**
   * Retrieves the stored authorization letter blob saved by {@link #upsertScalerAuthorizationLetter}
   * via {@code CRYSTAL_REPORTS_PKG.PRC_GET_LETTER}. Returns null when no letter is stored.
   *
   * <p>{@code PRC_GET_LETTER} raises {@code NO_DATA_FOUND} (ORA-01403) rather than returning a null
   * blob when nothing is stored, so that is caught and translated to null here; the caller turns a
   * null into a clean 404 instead of letting the download 500.
   */
  public byte[] getScalerAuthorizationLetter(Long scalerAuthorizationId) {
    if (scalerAuthorizationId == null) {
      return null;
    }

    String sql = buildProcedureCall(CRYSTAL_REPORTS_PKG, "PRC_GET_LETTER", 3);
    try {
      return getJdbcTemplate().execute(
          (Connection con) -> {
            CallableStatement cs = con.prepareCall(sql);
            cs.registerOutParameter(1, Types.BLOB);
            cs.setLong(2, scalerAuthorizationId);
            cs.setString(3, ReportDefinition.SCALER_AUTHORIZATION_LETTER.getReportName());
            return cs;
          },
          (CallableStatement cs) -> {
            cs.execute();
            Blob blob = cs.getBlob(1);
            if (blob == null) {
              return null;
            }
            return blob.getBytes(1, (int) blob.length());
          });
    } catch (DataAccessException ex) {
      if (isNoDataFound(ex)) {
        return null;
      }
      throw ex;
    }
  }

  public void deleteScalerAuthorizationAssociations(Long scalerAuthorizationId) {
    if (scalerAuthorizationId == null) {
      return;
    }

    deleteScalerAuthorizationConditions(scalerAuthorizationId, getScalerAuthorizationConditions(scalerAuthorizationId));
    deleteScalerAuthorizationForestProducts(scalerAuthorizationId, getScalerAuthorizationForestProducts(scalerAuthorizationId));
    deleteScalerAuthorizationJobFunctions(scalerAuthorizationId, getScalerAuthorizationJobFunctions(scalerAuthorizationId));
    deleteScalerAuthorizationScaleSites(scalerAuthorizationId, getScalerAuthorizationScaleSites(scalerAuthorizationId));
  }

  private void deleteScalerAuthorizationJobFunctions(Long scalerAuthorizationId, List<String> jobFunctions) {
    deleteStringAssociations(buildDeleteRecCall(SCALE_JOB_FUNCTION_PKG, 2), scalerAuthorizationId, jobFunctions);
  }

  private void deleteScalerAuthorizationForestProducts(Long scalerAuthorizationId, List<String> products) {
    deleteStringAssociations(buildDeleteRecCall(AUTHORIZED_FORST_PRDCT_PKG, 2), scalerAuthorizationId, products);
  }

  private void deleteScalerAuthorizationScaleSites(Long scalerAuthorizationId, List<ScaleSiteSearchResult> scaleSites) {
    List<String> siteNumbers = new java.util.ArrayList<>();
    if (scaleSites != null) {
      for (ScaleSiteSearchResult site : scaleSites) {
        String siteNumber = site == null ? null : getNullable(site.getScaleSiteIdNmbr());
        if (siteNumber != null && !siteNumber.isBlank()) {
          siteNumbers.add(siteNumber);
        }
      }
    }
    deleteStringAssociations(buildDeleteRecCall(SCALER_AUTHORIZED_SITE_PKG, 2), scalerAuthorizationId, siteNumbers);
  }

  private void deleteScalerAuthorizationConditions(Long scalerAuthorizationId, List<ScaleAuthCondition> conditions) {
    if (conditions == null || conditions.isEmpty()) {
      return;
    }

    for (ScaleAuthCondition condition : conditions) {
      if (condition == null || condition.getScaleAuthConditionId() == null) {
        continue;
      }
      executeVoidCall(buildDeleteRecCall(SCALER_AUTHORZTN_CNDTN_PKG, 3),
          cs -> ParameterBinder.fromStart(cs)
              .longValue(scalerAuthorizationId)
              .string(condition.getScaleConditionClassCode())
              .longValue(condition.getScaleAuthConditionId()));
    }
  }

    private void deleteStringAssociations(String sql, Long scalerAuthorizationId, List<String> values) {
      if (values == null || values.isEmpty()) {
        return;
      }

      for (String value : values) {
        if (value == null || value.isBlank()) {
          continue;
        }
        executeVoidCall(sql,
            cs -> ParameterBinder.fromStart(cs)
                .longValue(scalerAuthorizationId)
                .string(value));
      }
    }

  private String computeScalerAuthorizationStatus(ScalerAuthorizationDetail detail) {
    LocalDate now = LocalDate.now();
    LocalDate cancellationDate = detail.getCancellationDate();
    if (cancellationDate != null && !now.isBefore(cancellationDate)) {
      return "Cancelled";
    }

    LocalDate expiryDate = detail.getAuthorizationExpiryDate();
    if (expiryDate != null && now.isAfter(expiryDate)) {
      return "Expired";
    }

    LocalDate effectiveDate = detail.getAuthorizationEffectiveDate();
    if (effectiveDate != null && expiryDate != null
        && !now.isBefore(effectiveDate)
        && !now.isAfter(expiryDate)) {
      return "Active";
    }

    return "Inactive";
  }

  private ScalerAuthorizationDetail getScalerAuthorizationBase(Long scalerAuthorizationId) {
    return queryCursorCall(buildSelectRecCall(SCALER_AUTHORIZATION_PKG, 1),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scalerAuthorizationId),
        rs -> rs.next() ? mapScalerAuthorizationRow(rs) : null);
  }
}
