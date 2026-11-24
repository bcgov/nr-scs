package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.domain.authorization.ScaleSiteAuthorizationListEntry;
import ca.bc.gov.nrs.scs.backend.domain.authorization.ScaleSiteAuthorizationRecord;
import ca.bc.gov.nrs.scs.backend.model.*;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;

@Repository
public class ScaleSiteAuthorizationRepository extends ScaleAuthConditionRepositorySupport {

  private static final String SCALE_SITE_AUTHORIZATN_PKG = "scs_scale_site_authorizatn_pkg";
  private static final String SITE_AUTHORIZATN_CNDTN_PKG = "SCS_SITE_AUTHORIZATN_CNDTN_PKG";
  private static final String SITE_AUTHORIZATN_CNDTN_SEARCH_PKG = "scs_site_authorizatn_cndtn_pkg";
  private static final String SCALE_SITE_AUTH_VW_PKG = "scs_scale_site_auth_vw_pkg";
  private static final String SCALE_SITE_AUTH_LETTER_PKG = "scs_scale_site_auth_letter_pkg";


  public ScaleSiteAuthorizationRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public ScaleSiteAuthorizationDetail createScaleSiteAuthorization(ScaleSiteAuthorizationSaveRequest req) {
    final String userId = currentUserIdOrSystem();

    return queryCursorCall(buildInsertRecCall(SCALE_SITE_AUTHORIZATN_PKG, 11),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()                                   // scale_site_authorization_id
            .string(req.getScaleSiteIdNmbr())
            .string(req.getLetterArcsFileNumber())
            .date(req.getAuthorizationEffectiveDate())
            .date(req.getAuthorizationExpiryDate())
            .string(req.getExpiryNotificationInd())
            .longValue(req.getExpectedScaleVolume())
            .date(req.getCancellationDate())
            .string(req.getCancellationReasonTxt())
            .string(userId)
            .string(userId),
        rs -> rs != null && rs.next() ? mapScaleSiteAuthorizationRow(rs) : null);
  }

  public ScaleSiteAuthorizationDetail getScaleSiteAuthorization(Long scaleSiteAuthorizationId) {
    ScaleSiteAuthorizationDetail detail = queryCursorCall(buildSearchRecsCall(SCALE_SITE_AUTH_VW_PKG, 15),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scaleSiteAuthorizationId)
            .nullString()
            .nullString()
            .nullDate()
            .nullDate()
            .nullString()
            .nullNumeric()
            .nullDate()
            .nullString()
            .nullString()
            .nullString()
            .nullString()
            .nullString()
            .intValue(1)
            .intValue(1),
        rs -> rs != null && rs.next() ? mapScaleSiteAuthorizationRow(rs) : null);

    if (detail == null) {
      return null;
    }

    populateScaleSiteAuthorizationDetail(detail);
    return detail;
  }

  /**
   * Lists every authorization belonging to a scale site, backing the Site Authorizations tab.
   * Calls {@code scs_scale_site_auth_vw_pkg.search_recs} bound by {@code scale_site_id_nmbr}
   * (parameter position 3). The view computes {@code status}; letter-exists is re-derived from the
   * letter table below so the tab reliably downloads existing letters. Sorted by status then expiry
   * date, matching the legacy screen (primary sort 16, secondary sort 5).
   */
  public List<ScaleSiteAuthorizationListEntry> listScaleSiteAuthorizationsByScaleSite(String scaleSiteIdNmbr) {
    List<ScaleSiteAuthorizationDetail> list = queryCursorCall(buildSearchRecsCall(SCALE_SITE_AUTH_VW_PKG, 15),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()              // scale_site_authorization_id
            .string(scaleSiteIdNmbr)   // scale_site_id_nmbr
            .nullString()              // letter_arcs_file_no
            .nullDate()                // authorization_effective_date
            .nullDate()                // authorization_expiry_date
            .nullString()              // expiry_notification_ind
            .nullNumeric()             // expected_scale_volume
            .nullDate()                // cancellation_date
            .nullString()              // cancellation_reason_txt
            .nullString()              // entry_userid
            .nullString()              // update_userid
            .nullString()              // letter_exists
            .nullString()              // status (filtered client-side)
            .intValue(16)              // primary sort: status
            .intValue(5),              // secondary sort: expiry date
        rs -> {
          List<ScaleSiteAuthorizationDetail> rows = new ArrayList<>();
          if (rs != null) {
            while (rs.next()) {
              rows.add(mapScaleSiteAuthorizationRow(rs));
            }
          }
          return rows;
        });

    // Derive letter-exists from the authoritative letter table rather than the view flag, so the
    // tab reliably downloads an existing letter (mirrors the scaler list). Done after the cursor is
    // closed to avoid a nested query on the same statement.
    // N+1 by design: one letter-exists query per row, acceptable for the small authorization counts
    // a single scale site has; revisit with a set-based query if that assumption changes.
    List<ScaleSiteAuthorizationListEntry> entries = new ArrayList<>();
    for (ScaleSiteAuthorizationDetail row : list) {
      boolean letterExists = Boolean.TRUE.equals(row.getLetterExists());
      if (row.getScaleSiteAuthorizationId() != null) {
        letterExists = getScaleSiteAuthorizationLetterExists(row.getScaleSiteAuthorizationId());
      }
      entries.add(toListEntry(row, letterExists));
    }

    return entries;
  }

  private ScaleSiteAuthorizationListEntry toListEntry(ScaleSiteAuthorizationDetail row, boolean letterExists) {
    return new ScaleSiteAuthorizationListEntry(
        row.getScaleSiteAuthorizationId(),
        row.getScaleSiteIdNmbr(),
        row.getLetterArcsFileNumber(),
        row.getAuthorizationEffectiveDate(),
        row.getAuthorizationExpiryDate(),
        row.getExpiryNotificationInd(),
        row.getExpectedScaleVolume(),
        row.getCancellationDate(),
        row.getCancellationReasonTxt(),
        row.getStatus(),
        letterExists,
        row.getEntryTimestamp().orElse(null),
        row.getEntryUserid().orElse(null),
        row.getUpdateTimestamp().orElse(null),
        row.getUpdateUserid().orElse(null),
        row.getRevisionCount().orElse(null));
  }

  /**
   * Returns whether a downloadable letter is stored for the authorization, checking the
   * {@code scs_scale_site_auth_letter_pkg} letter table directly. Mirrors
   * {@link #getScaleSiteAuthorizationLetter}: a row whose blob column is empty does not count as an
   * existing letter, otherwise the tab would offer a "View Letter" button the download cannot serve.
   */
  public boolean getScaleSiteAuthorizationLetterExists(Long scaleSiteAuthorizationId) {
    return Boolean.TRUE.equals(queryCursorCall(
        buildSelectRecCall(SCALE_SITE_AUTH_LETTER_PKG, 1),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scaleSiteAuthorizationId),
        rs -> rs != null && rs.next() && rs.getBytes(2) != null));
  }

  public boolean setExpiryNotificationInd(Long scaleSiteAuthorizationId, String expiryNotificationInd) {
    ScaleSiteAuthorizationDetail detail = getScaleSiteAuthorizationBase(scaleSiteAuthorizationId);
    if (detail == null) {
      return false;
    }

    final String userId = currentUserIdOrSystem();
    final String detailEntryUserId = detail.getEntryUserid().orElse(null);
    final String entryUserId = detailEntryUserId == null ? userId : detailEntryUserId;

    ScaleSiteAuthorizationDetail updated = queryCursorCall(buildUpdateRecCall(SCALE_SITE_AUTHORIZATN_PKG, 11),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(detail.getScaleSiteAuthorizationId())
            .string(detail.getScaleSiteIdNmbr())
            .string(detail.getLetterArcsFileNumber())
            .date(detail.getAuthorizationEffectiveDate())
            .date(detail.getAuthorizationExpiryDate())
            .string(expiryNotificationInd)
            .longValue(detail.getExpectedScaleVolume())
            .date(detail.getCancellationDate())
            .string(detail.getCancellationReasonTxt())
            .string(entryUserId)
            .string(userId),
        rs -> rs != null && rs.next() ? mapScaleSiteAuthorizationRow(rs) : null);

    return updated != null;
  }

  public ScaleSiteAuthorizationDetail updateScaleSiteAuthorization(ScaleSiteAuthorizationRecord ssaRecord) {
    final String userId = currentUserIdOrSystem();
    final String entryUserId = ssaRecord.entryUserid() == null ? userId : ssaRecord.entryUserid();

    return queryCursorCall(buildUpdateRecCall(SCALE_SITE_AUTHORIZATN_PKG, 11),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(ssaRecord.scaleSiteAuthorizationId())
            .string(ssaRecord.scaleSiteIdNmbr())
            .string(ssaRecord.letterArcsFileNumber())
            .date(ssaRecord.authorizationEffectiveDate())
            .date(ssaRecord.authorizationExpiryDate())
            .string(ssaRecord.expiryNotificationInd())
            .longValue(ssaRecord.expectedScaleVolume())
            .date(ssaRecord.cancellationDate())
            .string(ssaRecord.cancellationReasonTxt())
            .string(entryUserId)
            .string(userId),
        rs -> rs != null && rs.next() ? mapScaleSiteAuthorizationRow(rs) : null);
  }

  public void deleteScaleSiteAuthorization(Long scaleSiteAuthorizationId) {
    executeVoidCall(buildDeleteRecCall(SCALE_SITE_AUTHORIZATN_PKG, 1),
        cs -> ParameterBinder.fromStart(cs)
            .longValue(scaleSiteAuthorizationId));
  }

  private ScaleSiteAuthorizationDetail getScaleSiteAuthorizationBase(Long scaleSiteAuthorizationId) {
    return queryCursorCall(buildSelectRecCall(SCALE_SITE_AUTHORIZATN_PKG, 1),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scaleSiteAuthorizationId),
        rs -> rs != null && rs.next() ? mapScaleSiteAuthorizationRow(rs) : null);
  }

  public void addConditions(Long scaleSiteAuthorizationId, List<ScaleAuthConditionRef> conditions) {
    if (conditions == null || conditions.isEmpty()) {
      return;
    }
    
    final String userId = currentUserIdOrSystem();

    for (var condition : conditions) {
      if (condition == null || condition.getScaleAuthConditionId() == null) {
        continue;
      }
      queryCursorCall(buildInsertRecCall(SITE_AUTHORIZATN_CNDTN_PKG, 5),
          cs -> ParameterBinder.afterReturn(cs)
              .longValue(scaleSiteAuthorizationId)
              .string(condition.getScaleConditionClassCode())
              .longValue(condition.getScaleAuthConditionId())
              .string(userId)
              .string(userId),
          rs -> null);
    }
  }

  public List<ScaleAuthCondition> getScaleAuthTemplateConditions(Long templateId) {
    List<Long> conditionIds = queryCursorCall(
        buildSearchRecsCall(SCALE_TEMPLATE_CONDITN_PKG, 5),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(templateId)
            .nullString()  // scale_condition_class_code
            .nullNumeric() // scale_auth_condition_id
            .nullString()  // entry_userid
            .nullString(), // update_userid
        rs -> {
          List<Long> ids = new java.util.ArrayList<>();
          while (rs.next()) {
            Object raw = rs.getObject(SCALE_AUTH_CONDITION_ID);
            Long id = raw == null ? null : ((Number) raw).longValue();
            if (id != null) {
              ids.add(id);
            }
          }
          return ids;
        });

    List<ScaleAuthCondition> results = new java.util.ArrayList<>();
    for (Long cid : conditionIds == null ? List.<Long>of() : conditionIds) {
      List<ScaleAuthCondition> found = this.searchActiveScaleAuthConditions(null, cid, null, null, null, null);
      if (found != null && !found.isEmpty()) {
        results.addAll(found);
      }
    }

    return results;
  }

  public void deleteSiteAuthorizationConditions(Long scaleSiteAuthorizationId, List<ScaleAuthCondition> conditions) {
    if (conditions == null || conditions.isEmpty()) {
      return;
    }

    for (ScaleAuthCondition condition : conditions) {
      if (condition == null || condition.getScaleAuthConditionId() == null) {
        continue;
      }
      executeVoidCall(buildDeleteRecCall(SITE_AUTHORIZATN_CNDTN_SEARCH_PKG, 3),
          cs -> ParameterBinder.fromStart(cs)
              .longValue(scaleSiteAuthorizationId)
              .string(condition.getScaleConditionClassCode())
              .longValue(condition.getScaleAuthConditionId()));
    }
  }

  public byte[] getScaleSiteAuthorizationLetter(Long scaleSiteAuthorizationId) {
    return queryCursorCall(buildSelectRecCall(SCALE_SITE_AUTH_LETTER_PKG, 1),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scaleSiteAuthorizationId),
        rs -> (rs != null && rs.next()) ? rs.getBytes(2) : null);
  }

  public void upsertScaleSiteAuthorizationLetter(Long scaleSiteAuthorizationId, byte[] letterBlob) {
    if (scaleSiteAuthorizationId == null) {
      return;
    }

    boolean exists = getScaleSiteAuthorizationLetter(scaleSiteAuthorizationId) != null;
    if (exists) {
      queryCursorCall(buildUpdateRecCall(SCALE_SITE_AUTH_LETTER_PKG, 2),
          cs -> ParameterBinder.afterReturn(cs)
              .longValue(scaleSiteAuthorizationId)
              .bytes(letterBlob),
          rs -> null);
      return;
    }

    queryCursorCall(buildInsertRecCall(SCALE_SITE_AUTH_LETTER_PKG, 2),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scaleSiteAuthorizationId)
            .bytes(letterBlob),
        rs -> null);
  }

  private ScaleSiteAuthorizationDetail mapScaleSiteAuthorizationRow(ResultSet rs) throws java.sql.SQLException {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setScaleSiteAuthorizationId(getLongNullable(rs, "scale_site_authorization_id"));
    detail.setScaleSiteIdNmbr(rs.getString("scale_site_id_nmbr"));
    detail.setLetterArcsFileNumber(getStringWithFallback(rs, "letter_arcs_file_number", "letter_arcs_file_no"));
    detail.setAuthorizationEffectiveDate(getLocalDateNullable(rs, "authorization_effective_date"));
    detail.setAuthorizationExpiryDate(getLocalDateNullable(rs, "authorization_expiry_date"));
    detail.setExpiryNotificationInd(rs.getString("expiry_notification_ind"));
    detail.setExpectedScaleVolume(getLongNullable(rs, "expected_scale_volume"));
    detail.setCancellationDate(getLocalDateNullable(rs, "cancellation_date"));
    detail.setCancellationReasonTxt(rs.getString("cancellation_reason_txt"));
    detail.setEntryTimestamp(JsonNullable.of(getOffsetDateTimeNullable(rs, "entry_timestamp")));
    detail.setEntryUserid(JsonNullable.of(rs.getString("entry_userid")));
    detail.setUpdateTimestamp(JsonNullable.of(getOffsetDateTimeNullable(rs, "update_timestamp")));
    detail.setUpdateUserid(JsonNullable.of(rs.getString("update_userid")));
    detail.setRevisionCount(JsonNullable.of(getLongNullable(rs, "revision_count")));
    detail.setStatus(getStringOptional(rs, "status"));
    detail.setLetterExists(parseBooleanString(getStringOptional(rs, "letter_exists")));
    return detail;
  }

  private String getStringWithFallback(ResultSet rs, String primary, String fallback) throws java.sql.SQLException {
    try {
      return rs.getString(primary);
    } catch (java.sql.SQLException primaryError) {
      try {
        return rs.getString(fallback);
      } catch (java.sql.SQLException secondaryError) {
        return null;
      }
    }
  }

  private String getStringOptional(ResultSet rs, String column) {
    try {
      return rs.getString(column);
    } catch (java.sql.SQLException ex) {
      return null;
    }
  }

  private boolean parseBooleanString(String raw) {
    return raw != null && Boolean.parseBoolean(raw.trim());
  }

  private void populateScaleSiteAuthorizationDetail(ScaleSiteAuthorizationDetail detail) {
    Long scaleSiteAuthorizationId = detail.getScaleSiteAuthorizationId();
    if (scaleSiteAuthorizationId == null) {
      return;
    }

    detail.setConditions(getScaleSiteAuthorizationConditions(scaleSiteAuthorizationId));
  }

  private List<ScaleAuthCondition> getScaleSiteAuthorizationConditions(Long scaleSiteAuthorizationId) {
    List<ScaleAuthConditionRef> refs = fetchConditionRefs(scaleSiteAuthorizationId);


    // Collect all referenced IDs and fetch them in a single query to avoid N+1 calls.
    Set<Long> ids = new HashSet<>();
    Set<String> classCodes = new HashSet<>();
    for (ScaleAuthConditionRef ref : refs == null ? List.<ScaleAuthConditionRef>of() : refs) {
      if (ref != null && ref.getScaleAuthConditionId() != null) {
        ids.add(ref.getScaleAuthConditionId());
      } else if (ref != null && ref.getScaleConditionClassCode() != null) {
        classCodes.add(ref.getScaleConditionClassCode());
      }
    }

    List<ScaleAuthCondition> results = new ArrayList<>();
    if (!ids.isEmpty()) {
      results.addAll(fetchScaleAuthConditionsByIds(ids));
    }
    if (!classCodes.isEmpty()) {
      for (ScaleAuthCondition c : fetchAllActiveConditions()) {
        if (c != null
            && c.getScaleConditionClassCode() != null
            && classCodes.contains(c.getScaleConditionClassCode())
            && c.getScaleAuthConditionId() != null
            && ids.add(c.getScaleAuthConditionId())) {
          results.add(c);
        }
      }
    }
    return results;
  }

  private List<ScaleAuthConditionRef> fetchConditionRefs(Long scaleSiteAuthorizationId) {
    return queryCursorCall(buildSearchRecsCall(SITE_AUTHORIZATN_CNDTN_SEARCH_PKG, 5),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(scaleSiteAuthorizationId)
            .nullString()
            .nullNumeric()
            .nullString()
            .nullString(),
        rs -> {
          List<ScaleAuthConditionRef> results = new ArrayList<>();
          if (rs != null) {
            while (rs.next()) {
              ScaleAuthConditionRef ref = new ScaleAuthConditionRef();
              ref.setScaleConditionClassCode(rs.getString("scale_condition_class_code"));
              ref.setScaleAuthConditionId(getLongNullable(rs, SCALE_AUTH_CONDITION_ID));
              results.add(ref);
            }
          }
          return results;
        });
  }

  private List<ScaleAuthCondition> fetchAllActiveConditions() {
    List<ScaleAuthCondition> found = queryScaleAuthConditions(
        cs -> ParameterBinder.afterReturn(cs)
            .nullString()
            .nullNumeric()
            .nullString()
            .nullString()
            .nullString()
            .nullNumeric()
            .nullDate()
            .nullDate()
            .nullString()
            .nullString(),
        this::mapScaleAuthConditionRows);
    return found != null ? found : List.of();
  }

  /**
   * Conditions are searched through {@code search_recs} (all rows, not only currently effective
   * ones) — the behaviour this repository has always had; {@link ScalerAuthorizationRepository} uses
   * {@code search_active_recs}.
   */
  @Override
  protected String scaleAuthConditionSearchCall() {
    return buildSearchRecsCall(SCALE_AUTH_CONDITION_PKG, 10);
  }
}