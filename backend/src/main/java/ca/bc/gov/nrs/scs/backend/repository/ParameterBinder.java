package ca.bc.gov.nrs.scs.backend.repository;

import java.sql.CallableStatement;
import java.sql.Date;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;

/**
 * Fluent, auto-incrementing helper for binding IN parameters on a {@link CallableStatement} (M-1).
 *
 * <p>It replaces hand-written positional binding (e.g. {@code cs.setString(3, value)} /
 * {@code cs.setNull(4, Types.NUMERIC)}) — which is off-by-one prone and was written three different
 * ways across the repositories — with a single chained idiom that tracks the parameter index
 * internally:
 *
 * <pre>{@code
 * cs -> ParameterBinder.afterReturn(cs)   // first IN param is index 2 (index 1 is the cursor/return)
 *     .nullString()                        // licence_no — DB-generated
 *     .string(req.getClientNumber())
 *     .longValue(req.getOrgUnitNo())       // null-safe
 *     .date(req.getIssuedDate())           // null-safe
 *     .string(userId);
 * }</pre>
 *
 * <p>Null SQL types match the long-standing {@code AbstractRepository.set*OrNull} helpers: numeric
 * types bind {@link Types#NUMERIC}, strings {@link Types#VARCHAR}, dates {@link Types#DATE}. This
 * also unifies the previous {@code Types.INTEGER}/{@code Types.NUMERIC} drift for nullable numbers
 * (both map to Oracle {@code NUMBER}).
 *
 * <p>Not thread-safe — a binder instance is created and consumed within a single statement-binding
 * lambda.
 *
 * <p>Bind a statement's IN parameters sequentially from the start index — one idiom per statement,
 * never interleaved with explicit {@code cs.setX(index, ...)} on the same statement (that
 * reintroduces the off-by-one risk it exists to remove). A trailing run of "not filtering" NULLs is
 * still the binder's job (loop over {@link #nullUntyped()} et al.); an OUT parameter is registered
 * separately after the IN binds. For a JDBC batch, create a fresh binder before each
 * {@code addBatch()} so every row rebinds from the start index.
 */
public final class ParameterBinder {

  private final CallableStatement cs;
  private int index;

  private ParameterBinder(CallableStatement cs, int startIndex) {
    this.cs = cs;
    this.index = startIndex;
  }

  /**
   * Binds IN parameters for a function call {@code { ? = call pkg.fn(...) }}: position 1 is the
   * registered return/cursor, so the first IN parameter is at index 2.
   */
  public static ParameterBinder afterReturn(CallableStatement cs) {
    return new ParameterBinder(cs, 2);
  }

  /**
   * Binds IN parameters for a procedure call {@code { call pkg.proc(...) }}: there is no return
   * slot, so the first IN parameter is at index 1.
   */
  public static ParameterBinder fromStart(CallableStatement cs) {
    return new ParameterBinder(cs, 1);
  }

  // ---------------------------------------------------------------------------
  // Null-safe value setters — bind the value, or a typed NULL when it is null.
  // ---------------------------------------------------------------------------

  public ParameterBinder string(String value) throws SQLException {
    if (value == null) {
      cs.setNull(index, Types.VARCHAR);
    } else {
      cs.setString(index, value);
    }
    index++;
    return this;
  }

  public ParameterBinder longValue(Long value) throws SQLException {
    if (value == null) {
      cs.setNull(index, Types.NUMERIC);
    } else {
      cs.setLong(index, value);
    }
    index++;
    return this;
  }

  public ParameterBinder intValue(Integer value) throws SQLException {
    if (value == null) {
      cs.setNull(index, Types.NUMERIC);
    } else {
      cs.setInt(index, value);
    }
    index++;
    return this;
  }

  public ParameterBinder doubleValue(Double value) throws SQLException {
    if (value == null) {
      cs.setNull(index, Types.NUMERIC);
    } else {
      cs.setDouble(index, value);
    }
    index++;
    return this;
  }

  public ParameterBinder date(LocalDate value) throws SQLException {
    if (value == null) {
      cs.setNull(index, Types.DATE);
    } else {
      cs.setDate(index, Date.valueOf(value));
    }
    index++;
    return this;
  }

  /** Binds a binary (BLOB) value; a {@code null} binds a SQL NULL, matching {@code setBytes}. */
  public ParameterBinder bytes(byte[] value) throws SQLException {
    cs.setBytes(index++, value);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Explicit typed NULLs — for placeholder / "not filtering" parameters.
  // ---------------------------------------------------------------------------

  public ParameterBinder nullString() throws SQLException {
    cs.setNull(index++, Types.VARCHAR);
    return this;
  }

  public ParameterBinder nullNumeric() throws SQLException {
    cs.setNull(index++, Types.NUMERIC);
    return this;
  }

  public ParameterBinder nullDate() throws SQLException {
    cs.setNull(index++, Types.DATE);
    return this;
  }

  public ParameterBinder nullTimestamp() throws SQLException {
    cs.setNull(index++, Types.TIMESTAMP);
    return this;
  }

  /**
   * Binds an untyped SQL NULL ({@link Types#NULL}) — for a "not filtering" parameter where the
   * column type is irrelevant. Matches the legacy {@code cs.setNull(i, Types.NULL)} /
   * {@code cs.setObject(i, null)} placeholder binds.
   */
  public ParameterBinder nullUntyped() throws SQLException {
    cs.setNull(index++, Types.NULL);
    return this;
  }

  /** The 1-based index the next bind will use. Primarily for tests/diagnostics. */
  public int nextIndex() {
    return index;
  }
}
