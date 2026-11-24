package ca.bc.gov.nrs.scs.backend.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils;
import org.springframework.stereotype.Repository;


@Repository
public class SystemSettingRepository extends AbstractRepository {

    private static final String SYSTEM_SETTING_PKG = "SCS_SCALE_CTL_SYSTEM_STTNG_PKG";


    @Value("${scs.welcome.current-news.default:}")
    private String defaultCurrentNews;

    public SystemSettingRepository(JdbcTemplate jdbcTemplate) {
        super(jdbcTemplate);
    }


    public Optional<String> findSystemSettingValue(String settingKey) {
        if (settingKey == null || settingKey.isBlank()) {
            return Optional.empty();
        }

        SystemSettingRecord settingRecord = getSystemSetting(settingKey);
        if (settingRecord == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(settingRecord.systemSettingValue());
    }

    public SystemSettingRecord getSystemSetting(String settingKey) {
        if (settingKey == null || settingKey.isBlank()) {
            return null;
        }

        return queryCursorCall(buildSelectRecCall(SYSTEM_SETTING_PKG, 1),
            cs -> ParameterBinder.afterReturn(cs)
                .string(settingKey),
            rs -> {
                if (rs == null || !rs.next()) {
                    return null;
                }
                return mapSystemSettingRow(rs);
            });
    }

    public SystemSettingRecord createSystemSetting(
        String settingKey,
        String description,
        String systemSettingValue,
        String entryUserid,
        String updateUserid) {
        String entryUser = fallbackUserId(entryUserid, SecurityContextUtils.currentUserIdOrSystem());
        String updateUser = fallbackUserId(updateUserid, entryUser);

        return queryCursorCall(buildInsertRecCall(SYSTEM_SETTING_PKG, 5),
            cs -> ParameterBinder.afterReturn(cs)
                .string(settingKey)
                .string(description)
                .string(systemSettingValue)
                .string(entryUser)
                .string(updateUser),
            rs -> {
                if (rs != null && rs.next()) {
                    return mapSystemSettingRow(rs);
                }
                return null;
            });
    }

    public SystemSettingRecord updateSystemSetting(
        String settingKey,
        String description,
        String systemSettingValue,
        String entryUserid,
        String updateUserid) {
        String entryUser = fallbackUserId(entryUserid, SecurityContextUtils.currentUserIdOrSystem());
        String updateUser = fallbackUserId(updateUserid, SecurityContextUtils.currentUserIdOrSystem());

        return queryCursorCall(buildUpdateRecCall(SYSTEM_SETTING_PKG, 5),
            cs -> ParameterBinder.afterReturn(cs)
                .string(settingKey)
                .string(description)
                .string(systemSettingValue)
                .string(entryUser)
                .string(updateUser),
            rs -> {
                if (rs != null && rs.next()) {
                    return mapSystemSettingRow(rs);
                }
                return null;
            });
    }
    /**
     * Returns fallback if userId is null or blank, otherwise returns userId.
     */
    private static String fallbackUserId(String userId, String fallback) {
        return (userId == null || userId.isBlank()) ? fallback : userId;
    }

    private SystemSettingRecord mapSystemSettingRow(ResultSet rs) throws SQLException {
        String settingKey = getStringWithFallback(rs, "scale_ctl_system_setting_key", 1);
        String description = getStringWithFallback(rs, "description", 2);
        String systemSettingValue = getStringWithFallback(rs, "system_setting_value", 3);
        OffsetDateTime entryTimestamp = getOffsetDateTimeWithFallback(rs, "entry_timestamp", 4);
        String entryUserid = getStringWithFallback(rs, "entry_userid", 5);
        OffsetDateTime updateTimestamp = getOffsetDateTimeWithFallback(rs, "update_timestamp", 6);
        String updateUserid = getStringWithFallback(rs, "update_userid", 7);
        Long revisionCount = getLongNullable(rs, 8);

        return new SystemSettingRecord(
            settingKey,
            description,
            systemSettingValue,
            entryTimestamp,
            entryUserid,
            updateTimestamp,
            updateUserid,
            revisionCount);
    }

    private String getStringWithFallback(ResultSet rs, String column, int index) throws SQLException {
        try {
            return rs.getString(column);
        } catch (java.sql.SQLException ex) {
            return rs.getString(index);
        }
    }

    private OffsetDateTime getOffsetDateTimeWithFallback(ResultSet rs, String column, int index) throws SQLException {
        try {
            return getOffsetDateTimeNullable(rs, column);
        } catch (SQLException ex) {
            return getOffsetDateTimeNullableByIndex(rs, index);
        }
    }

    private OffsetDateTime getOffsetDateTimeNullableByIndex(ResultSet rs, int index) throws SQLException {
        java.sql.Timestamp ts = rs.getTimestamp(index);
        if (ts == null) {
            return null;
        }
        return ts.toInstant().atOffset(ZoneOffset.UTC);
    }

    public record SystemSettingRecord(
        String settingKey,
        String description,
        String systemSettingValue,
        OffsetDateTime entryTimestamp,
        String entryUserid,
        OffsetDateTime updateTimestamp,
        String updateUserid,
        Long revisionCount) {
    }
}
