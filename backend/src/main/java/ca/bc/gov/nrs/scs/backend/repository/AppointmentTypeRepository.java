package ca.bc.gov.nrs.scs.backend.repository;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;

import ca.bc.gov.nrs.scs.backend.model.AppointmentType;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeUpdateRequest;
import java.sql.SQLException;
import java.time.LocalDate;
import org.openapitools.jackson.nullable.JsonNullable;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AppointmentTypeRepository extends AbstractRepository {

  private static final String SCALER_APPOINTMENT_TYP_PKG = "scs_scaler_appointment_typ_pkg";
  private static final String SCALER_LICENCE_ATTRIBT_PKG = "scs_scaler_licence_attribt_pkg";

  public AppointmentTypeRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public List<AppointmentType> search(
      String code,
      String description,
      String actingInd,
      LocalDate effectiveDate,
      LocalDate expiryDate
  ) {
    return queryCursorCall(
        buildSearchRecsCall(SCALER_APPOINTMENT_TYP_PKG, 7),
        cs -> ParameterBinder.afterReturn(cs)
            .string(code)
            .string(description)
            .string(actingInd)
            .date(effectiveDate)
            .date(expiryDate)
            .nullString()
            .nullString(),
        rs -> {
          List<AppointmentType> rows = new ArrayList<>();
          while (rs.next()) {
            rows.add(mapRow(rs));
          }
          return rows;
        });
  }

  public AppointmentType findByCode(String appointmentTypeCode) {
    return queryCursorCall(
        buildSelectRecCall(SCALER_APPOINTMENT_TYP_PKG, 1),
        cs -> ParameterBinder.afterReturn(cs)
            .string(appointmentTypeCode),
        rs -> rs.next() ? mapRow(rs) : null);
  }

  public AppointmentType create(AppointmentTypeCreateRequest request) {
    final String userId = currentUserIdOrSystem();
    return queryCursorCall(
        buildInsertRecCall(SCALER_APPOINTMENT_TYP_PKG, 7),
        cs -> ParameterBinder.afterReturn(cs)
            .string(request.getCode())
            .string(request.getDescription())
            .string(request.getActingInd().getValue())
            .date(request.getEffectiveDate())
            .date(request.getExpiryDate())
            .string(userId)
            .string(userId),
        rs -> {
          if (rs.next()) return mapRow(rs);
          throw new SQLException("Stored procedure did not return an appointment type row.");
        });
  }

  public AppointmentType update(String appointmentTypeCode, AppointmentTypeUpdateRequest request) {
    final String userId = currentUserIdOrSystem();
    return queryCursorCall(
        buildUpdateRecCall(SCALER_APPOINTMENT_TYP_PKG, 7),
        cs -> ParameterBinder.afterReturn(cs)
            .string(appointmentTypeCode)
            .string(request.getDescription())
            .string(request.getActingInd().getValue())
            .date(request.getEffectiveDate())
            .date(request.getExpiryDate())
            .string(userId)
            .string(userId),
        rs -> {
          if (rs.next()) return mapRow(rs);
          throw new SQLException("Stored procedure did not return an appointment type row.");
        });
  }

  public void delete(String appointmentTypeCode) {
    executeVoidCall(
        buildDeleteRecCall(SCALER_APPOINTMENT_TYP_PKG, 1),
        cs -> ParameterBinder.fromStart(cs)
            .string(appointmentTypeCode));
  }

  public boolean hasDependentScalerAppointments(String appointmentTypeCode) {
    return queryCursorCall(
        buildSearchRecsCall(SCALER_LICENCE_ATTRIBT_PKG, 12),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()
            .nullString()
            .string(appointmentTypeCode)
            .nullString()
            .nullNumeric()
            .nullString()
            .nullDate()
            .nullDate()
            .nullDate()
            .nullString()
            .nullString()
            .nullString(),
        rs -> rs.next());
  }

  private AppointmentType mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
    String actingInd = rs.getString(3);
    AppointmentType row = new AppointmentType();
    row.setCode(rs.getString(1));
    row.setDescription(rs.getString(2));
    row.setActingInd(actingInd != null ? AppointmentType.ActingIndEnum.fromValue(actingInd) : null);
    row.setEffectiveDate(getLocalDateNullable(rs, 4));
    row.setExpiryDate(getLocalDateNullable(rs, 5));
    row.setEntryTimestamp(JsonNullable.of(getOffsetDateTimeNullable(rs, "entry_timestamp")));
    row.setEntryUserid(JsonNullable.of(rs.getString(7)));
    row.setUpdateTimestamp(JsonNullable.of(getOffsetDateTimeNullable(rs, "update_timestamp")));
    row.setUpdateUserid(JsonNullable.of(rs.getString(9)));
    row.setRevisionCount(JsonNullable.of(getLongNullable(rs, 10)));
    return row;
  }
}
