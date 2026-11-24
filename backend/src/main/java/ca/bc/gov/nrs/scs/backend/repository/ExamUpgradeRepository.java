package ca.bc.gov.nrs.scs.backend.repository;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import ca.bc.gov.nrs.scs.backend.dto.ExamUpgradeRow;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;

@Repository
public class ExamUpgradeRepository extends AbstractRepository {
    private static final String EXAM_UPGRADE_PKG = "scs_scaler_training_type_pkg";


    public ExamUpgradeRepository(JdbcTemplate jdbcTemplate) {
        super(jdbcTemplate);
    }

    public List<ExamUpgradeRow> findAll(String classCode) {
        return queryCursorCall(buildSearchRecsCall(EXAM_UPGRADE_PKG, 8),
                cs -> ParameterBinder.afterReturn(cs)
                    .string(SCSUtils.isBlank(classCode) ? null : classCode)
                    .nullString()   // p_scaler_training_type_id — not filtering
                    .nullString()   // p_licence_accredit_ind — not filtering
                    .nullString()   // p_description — not filtering
                    .nullDate()     // p_effective_date — not filtering
                    .nullDate()     // p_expiry_date — not filtering
                    .nullString()   // p_entry_userid — not filtering
                    .nullString(),  // p_update_userid — not filtering
                rs -> {
                    List<ExamUpgradeRow> out = new ArrayList<>();
                    while (rs.next()) {
                        out.add(mapRow(rs));
                    }
                    return out;
                });
    }

    public ExamUpgradeRow findByClassCodeAndTypeId(String classCode, String typeId) {
        return queryCursorCall(buildSelectRecCall(EXAM_UPGRADE_PKG, 2),
                cs -> ParameterBinder.afterReturn(cs)
                    .string(classCode)
                    .string(typeId),
                rs -> rs.next() ? mapRow(rs) : null);
    }

    public ExamUpgradeRow save(ExamUpgradeCreateRequest request) {
        final String userId = currentUserIdOrSystem();
        return queryCursorCall(buildInsertRecCall(EXAM_UPGRADE_PKG, 8),
                cs -> ParameterBinder.afterReturn(cs)
                    .string(request.getScalerTrainingClassCode())  // in_scaler_training_class_cod
                    .nullString()                                   // in_scaler_training_type_id — DB-generated
                    .string(request.getLicenceAccreditInd())
                    .string(request.getDescription())
                    .date(request.getEffectiveDate())
                    .date(request.getExpiryDate())
                    .string(userId)                                 // in_entry_userid
                    .string(userId),                               // in_update_userid
                rs -> rs.next() ? mapRow(rs) : null);
    }

    public ExamUpgradeRow update(
            String classCode,
            String typeId,
            ExamUpgradeUpdateRequest request) {
        final String userId = currentUserIdOrSystem();
        return queryCursorCall(buildUpdateRecCall(EXAM_UPGRADE_PKG, 8),
                cs -> ParameterBinder.afterReturn(cs)
                    .string(classCode)
                    .string(typeId)
                    .string(request.getLicenceAccreditInd())
                    .string(request.getDescription())
                    .date(request.getEffectiveDate())
                    .date(request.getExpiryDate())
                    .string(userId)   // in_entry_userid
                    .string(userId),  // in_update_userid
                rs -> rs.next() ? mapRow(rs) : null);
    }

    public void delete(String classCode, String typeId) {
        executeVoidCall(buildDeleteRecCall(EXAM_UPGRADE_PKG, 2),
                cs -> ParameterBinder.fromStart(cs)
                    .string(classCode)
                    .string(typeId));
    }

    private ExamUpgradeRow mapRow(ResultSet rs) throws SQLException {
        ExamUpgradeRow row = new ExamUpgradeRow();
        row.setScalerTrainingClassCode(rs.getString("scaler_training_class_code"));
        row.setScalerTrainingTypeId(rs.getString("scaler_training_type_id"));
        row.setLicenceAccreditInd(rs.getString("licence_accredit_ind"));
        row.setDescription(rs.getString("description"));
        row.setEffectiveDate(getLocalDateNullable(rs, "effective_date"));
        row.setExpiryDate(getLocalDateNullable(rs, "expiry_date"));
        row.setEntryTimestamp(getOffsetDateTimeNullable(rs, "entry_timestamp"));
        row.setEntryUserid(rs.getString("entry_userid"));
        row.setUpdateTimestamp(getOffsetDateTimeNullable(rs, "update_timestamp"));
        row.setUpdateUserid(rs.getString("update_userid"));
        row.setRevisionCount(getLongNullable(rs, "revision_count"));
        return row;
    }
}
