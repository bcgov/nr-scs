package ca.bc.gov.nrs.scs.backend.repository;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;

import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamRecord;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Data access for per-scaler exam / upgrade (training) records via {@code scs_scaler_training_pkg}.
 *
 * <p>Verified signatures ({@code scs_scaler_training_pkg.pks}):
 * <ul>
 *   <li>{@code search_recs(licence, classCode, typeId, completionDate, entryUserid, updateUserid)} → cursor</li>
 *   <li>{@code select_rec(licence, classCode, typeId)} → cursor</li>
 *   <li>{@code insert_rec(licence, classCode, typeId, completionDate, entryUserid, updateUserid)} → cursor</li>
 *   <li>{@code update_rec(licence, classCode, typeId, completionDate, entryUserid, updateUserid)} → cursor</li>
 *   <li>{@code delete_rec(licence, classCode, typeId)} → void (procedure)</li>
 * </ul>
 * Cursor columns: {@code scaler_licence_no, scaler_training_class_code, scaler_training_type_id,
 * completion_date, entry_timestamp, entry_userid, update_timestamp, update_userid, revision_count}.
 */
@Repository
public class ScalerExamRepository extends AbstractRepository {

  private static final String SCALER_TRAINING_PKG = "scs_scaler_training_pkg";

  public ScalerExamRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public List<ScalerExamRecord> findByScalerLicenceNo(String scalerLicenceNo) {
    return queryCursorCall(buildSearchRecsCall(SCALER_TRAINING_PKG, 6),
        cs -> {
          cs.setString(2, scalerLicenceNo);
          cs.setNull(3, Types.VARCHAR);
          cs.setNull(4, Types.VARCHAR);
          cs.setNull(5, Types.DATE);
          cs.setNull(6, Types.VARCHAR);
          cs.setNull(7, Types.VARCHAR);
        },
        rs -> {
          List<ScalerExamRecord> exams = new ArrayList<>();
          while (rs.next()) {
            exams.add(mapExamRow(rs));
          }
          return exams;
        });
  }

  public ScalerExamRecord findById(String scalerLicenceNo, String classCode, String typeId) {
    return queryCursorCall(buildSelectRecCall(SCALER_TRAINING_PKG, 3),
        cs -> {
          cs.setString(2, scalerLicenceNo);
          cs.setString(3, classCode);
          cs.setString(4, typeId);
        },
        rs -> rs.next() ? mapExamRow(rs) : null);
  }

  public ScalerExamRecord insert(
      String scalerLicenceNo,
      String classCode,
      String typeId,
      LocalDate completionDate
  ) {
    final String userId = currentUserIdOrSystem();
    return queryCursorCall(buildInsertRecCall(SCALER_TRAINING_PKG, 6),
        cs -> ParameterBinder.afterReturn(cs)
            .string(scalerLicenceNo)
            .string(classCode)
            .string(typeId)
            .date(completionDate)
            .string(userId)
            .string(userId),
        rs -> {
          if (rs.next()) {
            return mapExamRow(rs);
          }
          throw new SQLException("Stored procedure did not return an exam row.");
        });
  }

  public ScalerExamRecord update(
      String scalerLicenceNo,
      String classCode,
      String typeId,
      LocalDate completionDate
  ) {
    final String userId = currentUserIdOrSystem();
    return queryCursorCall(buildUpdateRecCall(SCALER_TRAINING_PKG, 6),
        cs -> ParameterBinder.afterReturn(cs)
            .string(scalerLicenceNo)
            .string(classCode)
            .string(typeId)
            .date(completionDate)
            .string(userId)
            .string(userId),
        rs -> {
          if (rs.next()) {
            return mapExamRow(rs);
          }
          throw new SQLException("Stored procedure did not return an exam row.");
        });
  }

  public void delete(String scalerLicenceNo, String classCode, String typeId) {
    getJdbcTemplate().execute(
        (Connection con) -> {
          CallableStatement cs = con.prepareCall(buildDeleteRecCall(SCALER_TRAINING_PKG, 3));
          cs.setString(1, scalerLicenceNo);
          cs.setString(2, classCode);
          cs.setString(3, typeId);
          return cs;
        },
        (CallableStatement cs) -> {
          cs.execute();
          return null;
        });
  }

  private ScalerExamRecord mapExamRow(ResultSet rs) throws SQLException {
    return new ScalerExamRecord(
        rs.getString("scaler_licence_no"),
        rs.getString("scaler_training_class_code"),
        rs.getString("scaler_training_type_id"),
        getLocalDateNullable(rs, "completion_date"),
        getOffsetDateTimeNullable(rs, "entry_timestamp"),
        rs.getString("entry_userid"),
        getOffsetDateTimeNullable(rs, "update_timestamp"),
        rs.getString("update_userid"),
        getLongNullable(rs, "revision_count"));
  }
}
