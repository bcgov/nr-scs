package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Scale-authorization-condition access shared by {@link ScalerAuthorizationRepository} and
 * {@link ScaleSiteAuthorizationRepository}. Both resolve {@code scs_scale_auth_condition_pkg} rows
 * into {@link ScaleAuthCondition} the same way and look conditions up by id the same way; they differ
 * only in which package function performs the 10-IN-parameter search, which each names through
 * {@link #scaleAuthConditionSearchCall()}.
 */
abstract class ScaleAuthConditionRepositorySupport extends AbstractRepository {

  protected static final String SCALE_AUTH_CONDITION_ID = "scale_auth_condition_id";
  protected static final String SCALE_AUTH_CONDITION_PKG = "scs_scale_auth_condition_pkg";
  protected static final String SCALE_TEMPLATE_CONDITN_PKG = "scs_scale_template_conditn_pkg";

  protected ScaleAuthConditionRepositorySupport(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  /**
   * The callable-statement SQL for the {@code scs_scale_auth_condition_pkg} search this repository
   * uses: 10 IN parameters (class code, condition id, title, description, ministry-standard
   * indicator, sort order, effective date, expiry date, entry userid, update userid) after the
   * cursor return.
   */
  protected abstract String scaleAuthConditionSearchCall();

  public List<ScaleAuthCondition> searchActiveScaleAuthConditions(
      String scaleConditionClassCode,
      Long scaleAuthConditionId,
      String scaleAuthConditionTitle,
      String scaleAuthConditionDesc,
      String ministryStandardInd,
      Integer sortOrderNo) {
    return queryScaleAuthConditions(
        cs -> ParameterBinder.afterReturn(cs)
            .string(scaleConditionClassCode)
            .longValue(scaleAuthConditionId)
            .string(scaleAuthConditionTitle)
            .string(scaleAuthConditionDesc)
            .string(ministryStandardInd)
            .intValue(sortOrderNo)
            .nullDate()
            .nullDate()
            .nullString()
            .nullString(),
        this::mapScaleAuthConditionRows);
  }

  /** Resolves each id through {@link #searchActiveScaleAuthConditions}; null / empty ids yield an empty list. */
  protected List<ScaleAuthCondition> fetchScaleAuthConditionsByIds(Set<Long> ids) {
    List<ScaleAuthCondition> results = new ArrayList<>();
    if (ids == null || ids.isEmpty()) {
      return results;
    }
    for (Long id : ids) {
      if (id == null) {
        continue;
      }
      List<ScaleAuthCondition> found = searchActiveScaleAuthConditions(null, id, null, null, null, null);
      if (found != null) {
        results.addAll(found);
      }
    }
    return results;
  }

  protected <T> T queryScaleAuthConditions(StatementBinder binder, ResultSetMapper<T> mapper) {
    return queryCursorCall(scaleAuthConditionSearchCall(), binder, mapper);
  }

  protected List<ScaleAuthCondition> mapScaleAuthConditionRows(ResultSet rs) throws SQLException {
    List<ScaleAuthCondition> results = new ArrayList<>();
    while (rs.next()) {
      results.add(mapScaleAuthConditionRow(rs));
    }
    return results;
  }

  protected ScaleAuthCondition mapScaleAuthConditionRow(ResultSet rs) throws SQLException {
    ScaleAuthCondition condition = new ScaleAuthCondition();
    condition.setScaleConditionClassCode(rs.getString("scale_condition_class_code"));
    condition.setScaleAuthConditionId(getLongNullable(rs, SCALE_AUTH_CONDITION_ID));
    condition.setScaleAuthConditionTitle(rs.getString("scale_auth_condition_title"));
    condition.setScaleAuthConditionDesc(rs.getString("scale_auth_condition_desc"));
    condition.setMinistryStandardInd(rs.getString("ministry_standard_ind"));
    condition.setSortOrderNo(getIntNullable(rs, "sort_order_no"));
    condition.setEffectiveDate(getLocalDateNullable(rs, "effective_date"));
    condition.setExpiryDate(getLocalDateNullable(rs, "expiry_date"));
    return condition;
  }
}
