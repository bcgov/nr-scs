package ca.bc.gov.nrs.scs.backend.repository;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import ca.bc.gov.nrs.scs.backend.dto.ValidLicenceAttributeRow;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeUpdateRequest;
import oracle.jdbc.OracleTypes;

@Repository
public class ValidLicenceAttributeRepository extends AbstractRepository {

  private static final String VALID_LICENCE_ATTRIBUTE_PKG = "SCS_SCALER_VALD_LCNC_TTRBT_PKG";
  private static final String SCALER_LICENCE_ATTRIBUTE_PKG = "scs_scaler_licence_attribt_pkg";


  public ValidLicenceAttributeRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public List<ValidLicenceAttributeRow> search(String scaleGradingSystemCode, String scalerAppointmentType) {
    return queryValidLicenceAttributes(
        cs -> ParameterBinder.afterReturn(cs)
            .string(scalerAppointmentType)
            .string(scaleGradingSystemCode)
            .nullDate()
            .nullDate()
            .nullString()
            .nullString(),
        rs -> {
          List<ValidLicenceAttributeRow> results = new ArrayList<>();
          while (rs.next()) {
            results.add(mapRow(rs));
          }
          return results;
        });
  }

  public ValidLicenceAttributeRow findByPk(String scaleGradingSystemCode, String scalerAppointmentType) {
    return queryValidLicenceAttributes(
        cs -> ParameterBinder.afterReturn(cs)
            .string(scalerAppointmentType)
            .string(scaleGradingSystemCode)
            .nullDate()
            .nullDate()
            .nullString()
            .nullString(),
        rs -> {
          if (rs.next()) {
            return mapRow(rs);
          }
          return null;
        });
  }

  public ValidLicenceAttributeRow insert(ValidLicenceAttributeCreateRequest request) {
    final String userId = currentUserIdOrSystem();
    return queryCursorCall(buildInsertRecCall(VALID_LICENCE_ATTRIBUTE_PKG, 6),
        cs -> ParameterBinder.afterReturn(cs)
            .string(request.getScalerAppointmentType())
            .string(request.getScaleGradingSystemCode())
            .date(request.getEffectiveDate())
            .date(getNullable(request.getExpiryDate()))
            .string(userId)
            .string(userId),
        rs -> {
          if (rs != null && rs.next()) {
            return mapRow(rs);
          }
          throw new SQLException("Stored procedure did not return a valid licence attribute row.");
        });
  }

  public ValidLicenceAttributeRow update(
      String scaleGradingSystemCode,
      String scalerAppointmentType,
      ValidLicenceAttributeUpdateRequest request) {
    final String userId = currentUserIdOrSystem();
    return queryCursorCall(buildUpdateRecCall(VALID_LICENCE_ATTRIBUTE_PKG, 6),
        cs -> ParameterBinder.afterReturn(cs)
            .string(scalerAppointmentType)
            .string(scaleGradingSystemCode)
            .date(request.getEffectiveDate())
            .date(getNullable(request.getExpiryDate()))
            .string(userId)
            .string(userId),
        rs -> {
          if (rs != null && rs.next()) {
            return mapRow(rs);
          }
          throw new SQLException("Stored procedure did not return a valid licence attribute row.");
        });
  }

  public void delete(String scaleGradingSystemCode, String scalerAppointmentType) {
    executeVoidCall(buildDeleteRecCall(VALID_LICENCE_ATTRIBUTE_PKG, 2),
        cs -> ParameterBinder.fromStart(cs)
            .string(scalerAppointmentType)
            .string(scaleGradingSystemCode));
  }

  public boolean hasDependentAppointments(String scaleGradingSystemCode, String scalerAppointmentType) {
    return Boolean.TRUE.equals(queryCursorCall(buildSearchRecsCall(SCALER_LICENCE_ATTRIBUTE_PKG, 12),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()           // p_scaler_licence_attribut_d — not filtering
            .nullString()            // p_scaler_licence_no — not filtering
            .string(scalerAppointmentType)
            .string(scaleGradingSystemCode)
            .nullNumeric()           // p_org_unit_no — not filtering
            .nullString()            // p_province_wide_ind — not filtering
            .nullDate()              // p_issued_date — not filtering
            .nullDate()              // p_expiry_date — not filtering
            .nullDate()              // p_cancellation_date — not filtering
            .nullString()            // p_cancellation_reason_txt — not filtering
            .nullString()            // p_entry_userid — not filtering
            .nullString(),           // p_update_userid — not filtering
        rs -> rs != null && rs.next()));
  }

  private <T> T queryValidLicenceAttributes(StatementBinder binder, ResultSetMapper<T> mapper) {
    return getJdbcTemplate().execute(
        (CallableStatementCreator) (Connection con) -> {
          CallableStatement cs = con.prepareCall(buildSearchRecsCall(VALID_LICENCE_ATTRIBUTE_PKG, 6));
          cs.registerOutParameter(1, OracleTypes.CURSOR);
          binder.bind(cs);
          return cs;
        },
        (CallableStatementCallback<T>) cs -> {
          cs.execute();
          try (ResultSet rs = (ResultSet) cs.getObject(1)) {
            return mapper.map(rs);
          }
        });
  }

  private ValidLicenceAttributeRow mapRow(ResultSet rs) throws SQLException {
    ValidLicenceAttributeRow row = new ValidLicenceAttributeRow();
    int idx = 1;
    row.setScalerAppointmentType(rs.getString(idx++));
    row.setScaleGradingSystemCode(rs.getString(idx++));
    row.setEffectiveDate(getLocalDateNullable(rs, idx++));
    row.setExpiryDate(getLocalDateNullable(rs, idx++));
    row.setEntryTimestamp(getOffsetDateTimeNullable(rs, idx++));
    row.setEntryUserid(rs.getString(idx++));
    row.setUpdateTimestamp(getOffsetDateTimeNullable(rs, idx++));
    row.setUpdateUserid(rs.getString(idx++));
    row.setRevisionCount(getLongNullable(rs, idx));
    return row;
  }
}
