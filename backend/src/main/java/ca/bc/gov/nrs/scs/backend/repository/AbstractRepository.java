package ca.bc.gov.nrs.scs.backend.repository;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import oracle.jdbc.OracleTypes;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Abstract base class for all SCS repositories. Provides shared JDBC/repository helper methods
 * for reading nullable values, binding optional statement parameters, and building common package
 * call strings.
 *
 * <p><b>Transaction contract.</b> The Oracle stored procedures invoked through these helpers are
 * assumed to defer to the calling transaction: they perform DML but issue no {@code COMMIT} or
 * {@code ROLLBACK}, so the application controls the commit boundary via {@code @Transactional} on the
 * service layer. The {@code search_recs}/{@code count_recs}/{@code select_rec} reads and the
 * {@code insert_rec}/{@code update_rec}/{@code delete_rec} CRUD procedures all honour this contract.
 *
 * <p><b>Known exception:</b> the workbench {@code renew_*} functions (see {@link WorkbenchRepository})
 * {@code COMMIT} internally and so must only be called as a standalone unit of work.
 */
public abstract class AbstractRepository {

  @FunctionalInterface
  protected interface StatementBinder {
    void bind(CallableStatement cs) throws SQLException;
  }

  @FunctionalInterface
  protected interface ResultSetMapper<T> {
    T map(ResultSet rs) throws SQLException;
  }

  @FunctionalInterface
  protected interface CallableStatementMapper<T> {
    T map(CallableStatement cs) throws SQLException;
  }

  private final JdbcTemplate jdbcTemplate;

  protected AbstractRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  protected JdbcTemplate getJdbcTemplate() {
    return jdbcTemplate;
  }

  protected Long getLongNullable(ResultSet rs, String column) throws SQLException {
    Object obj = rs.getObject(column);
    return obj != null ? rs.getLong(column) : null;
  }

  protected Long getLongNullable(ResultSet rs, int index) throws SQLException {
    Object obj = rs.getObject(index);
    return toLong(obj);
  }

  protected Integer getIntNullable(ResultSet rs, String column) throws SQLException {
    Object obj = rs.getObject(column);
    return obj != null ? rs.getInt(column) : null;
  }

  protected Integer getIntNullable(ResultSet rs, int index) throws SQLException {
    Object obj = rs.getObject(index);
    return toInteger(obj);
  }

  protected Double getDoubleNullable(ResultSet rs, String column) throws SQLException {
    Object obj = rs.getObject(column);
    return obj != null ? rs.getDouble(column) : null;
  }

  protected Double getDoubleNullable(ResultSet rs, int index) throws SQLException {
    Object obj = rs.getObject(index);
    return obj != null ? rs.getDouble(index) : null;
  }

  protected LocalDate getLocalDateNullable(ResultSet rs, String column) throws SQLException {
    java.sql.Date d = rs.getDate(column);
    return d != null ? d.toLocalDate() : null;
  }

  protected LocalDate getLocalDateNullable(ResultSet rs, int index) throws SQLException {
    java.sql.Date d = rs.getDate(index);
    return d != null ? d.toLocalDate() : null;
  }

  protected OffsetDateTime getOffsetDateTimeNullable(ResultSet rs, String column) throws SQLException {
    java.sql.Timestamp ts = rs.getTimestamp(column);
    if (ts == null) {
      return null;
    }
    return ts.toInstant().atOffset(ZoneOffset.UTC);
  }

  protected OffsetDateTime getOffsetDateTimeNullable(ResultSet rs, int index) throws SQLException {
    java.sql.Timestamp ts = rs.getTimestamp(index);
    if (ts == null) {
      return null;
    }
    return ts.toInstant().atOffset(ZoneOffset.UTC);
  }

  /**
   * Read a timezone-naive Oracle {@code DATE}/{@code TIMESTAMP} as its stored wall-clock value.
   * Unlike {@link #getOffsetDateTimeNullable}, this does NOT re-interpret the value through the JVM
   * zone and relabel it UTC (which shifts the time-of-day whenever the server is not on UTC); the
   * exact stored value is preserved to the second. The offset is nominal — the column carries no
   * zone. Used by the read-only "Risk Rating" tabs' "Date Created" column.
   */
  protected OffsetDateTime getWallClockOffsetDateTimeNullable(ResultSet rs, String column)
      throws SQLException {
    java.sql.Timestamp ts = rs.getTimestamp(column);
    return ts == null ? null : ts.toLocalDateTime().atOffset(ZoneOffset.UTC);
  }

  /**
   * Safely coerce an arbitrary object (typically from {@link ResultSet#getObject(String)}) into an
   * Integer. Returns null when the value is null or not parseable.
   */
  protected Integer toInteger(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number number) return number.intValue();
    if (obj instanceof String string) {
      String s = string.trim();
      if (s.isEmpty()) return null;
      try {
        return Integer.parseInt(s);
      } catch (NumberFormatException ex) {
        try {
          return new java.math.BigDecimal(s).intValue();
        } catch (Exception e) {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Safely coerce an arbitrary object into a Long. Returns null when value is null or not
   * parseable.
   */
  protected Long toLong(Object obj) {
    if (obj == null) return null;
    if (obj instanceof Number number) return number.longValue();
    if (obj instanceof String string) {
      String s = string.trim();
      if (s.isEmpty()) return null;
      try {
        return Long.parseLong(s);
      } catch (NumberFormatException ex) {
        try {
          return new java.math.BigDecimal(s).longValue();
        } catch (Exception e) {
          return null;
        }
      }
    }
    return null;
  }


  protected <T> T queryCursorCall(
      String sql,
      StatementBinder binder,
      ResultSetMapper<T> mapper) {
    return jdbcTemplate.execute(
        (Connection con) -> {
          CallableStatement cs = con.prepareCall(sql);
          cs.registerOutParameter(1, OracleTypes.CURSOR);
          binder.bind(cs);
          return cs;
        },
        (CallableStatement cs) -> {
          cs.execute();
          try (ResultSet rs = (ResultSet) cs.getObject(1)) {
            return mapper.map(rs);
          }
        });
  }

  protected Long queryLongCall(
      String sql,
      StatementBinder binder) {
    return jdbcTemplate.execute(
        (Connection con) -> {
          CallableStatement cs = con.prepareCall(sql);
          cs.registerOutParameter(1, OracleTypes.NUMBER);
          binder.bind(cs);
          return cs;
        },
        (CallableStatement cs) -> {
          cs.execute();
          Object value = cs.getObject(1);
          if (value == null) return null;
          if (value instanceof Number number) return number.longValue();
          return Long.valueOf(value.toString());
        });
  }

  protected void executeVoidCall(
      String sql,
      StatementBinder binder) {
    jdbcTemplate.execute(
        (Connection con) -> {
          CallableStatement cs = con.prepareCall(sql);
          binder.bind(cs);
          return cs;
        },
        (CallableStatement cs) -> {
          cs.execute();
          return null;
        });
  }

  /**
   * Executes a call whose results come back through OUT parameters rather than a cursor.
   * The binder is responsible for both binding IN parameters and registering OUT parameters;
   * the mapper reads the OUT parameters from the executed statement.
   */
  protected <T> T queryOutParamsCall(
      String sql,
      StatementBinder binder,
      CallableStatementMapper<T> mapper) {
    return jdbcTemplate.execute(
        (Connection con) -> {
          CallableStatement cs = con.prepareCall(sql);
          binder.bind(cs);
          return cs;
        },
        (CallableStatement cs) -> {
          cs.execute();
          return mapper.map(cs);
        });
  }

  protected <T> T querySearchRecs(
      String packageName,
      int inParamCount,
      StatementBinder binder,
      ResultSetMapper<T> mapper) {
    return queryCursorCall(buildSearchRecsCall(packageName, inParamCount), binder, mapper);
  }

  protected String buildQuestionMarkString(int inParamCount) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < inParamCount; i++) {
      if (i > 0) sb.append(", ");
      sb.append("?");
    }
    return sb.toString();
  }

  protected String buildSearchRecsCall(String packageName, int inParamCount) {
    return buildFunctionCall(packageName, "search_recs", inParamCount);
  }

  protected String buildCountRecsCall(String packageName, int inParamCount) {
    return buildFunctionCall(packageName, "count_recs", inParamCount);
  }

  protected String buildSelectRecCall(String packageName, int inParamCount) {
    return buildFunctionCall(packageName, "select_rec", inParamCount);
  }

  protected String buildInsertRecCall(String packageName, int inParamCount) {
    return buildFunctionCall(packageName, "insert_rec", inParamCount);
  }

  protected String buildUpdateRecCall(String packageName, int inParamCount) {
    return buildFunctionCall(packageName, "update_rec", inParamCount);
  }

  protected String buildDeleteRecCall(String packageName, int inParamCount) {
    return buildProcedureCall(packageName, "delete_rec", inParamCount);
  }

  protected String buildFunctionCall(String packageName, String methodName, int inParamCount) {
    return "{ ? = " + buildPackageCall(packageName, methodName, inParamCount);
  }

  protected String buildProcedureCall(String packageName, String procedureName, int inParamCount) {
    return "{ " + buildPackageCall(packageName, procedureName, inParamCount);
  }

  private String buildPackageCall(String packageName, String methodName, int inParamCount) {
    return "call " + packageName + "." + methodName + "(" + buildQuestionMarkString(inParamCount) + ") }";
  }
}
