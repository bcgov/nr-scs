package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.SystemSetting;
import ca.bc.gov.nrs.scs.backend.model.SystemSettingUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.SystemSettingRepository;
import ca.bc.gov.nrs.scs.backend.repository.SystemSettingRepository.SystemSettingRecord;
import org.springframework.stereotype.Service;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;

@Service
public class SystemSettingService {

    private static final String CURRENT_NEWS_KEY = "WMSG";
    private static final String CURRENT_NEWS_DESCRIPTION =
        "Current News - Welcome Message for SCS Home Page";
    private static final String CURRENT_NEWS_LABEL = "Current News";
    private static final int VALUE_MAX_LENGTH = 4000;

    private final SystemSettingRepository repository;

    public SystemSettingService(SystemSettingRepository repository) {
        this.repository = repository;
    }

    public SystemSetting getSystemSetting(String settingKey) {
        String normalizedKey = SCSUtils.requireText(normalizeKey(settingKey), "System setting key is required.");
        return toModel(
            SCSUtils.requireFound(
                repository.getSystemSetting(normalizedKey), "No system setting found for key " + normalizedKey));
    }

    public SystemSetting updateSystemSetting(String settingKey, SystemSettingUpdateRequest request) {
        String normalizedKey = SCSUtils.requireText(normalizeKey(settingKey), "System setting key is required.");
        if (request == null) {
            throw new BadRequestException("Request body is required.");
        }
        validateValue(normalizedKey, request.getSystemSettingValue());

        SystemSettingRecord existing = repository.getSystemSetting(normalizedKey);
        String value = request.getSystemSettingValue();
        String description = resolveDescription(normalizedKey, existing);
        String entryUserid = existing != null ? existing.entryUserid() : null;
        String updateUserid = currentUserIdOrSystem();

        SystemSettingRecord saved = existing == null
            ? repository.createSystemSetting(normalizedKey, description, value, updateUserid, updateUserid)
            : repository.updateSystemSetting(normalizedKey, description, value, entryUserid, updateUserid);

        if (saved == null) {
            throw new BadRequestException("System setting could not be saved.");
        }

        return toModel(saved);
    }

    private void validateValue(String settingKey, String value) {
        String label = resolveLabel(settingKey);
        if (SCSUtils.isBlank(value)) {
            throw new BadRequestException(label + " is required.");
        }
        if (value.length() > VALUE_MAX_LENGTH) {
            throw new BadRequestException(
                label + " can not be greater than " + VALUE_MAX_LENGTH + " characters.");
        }
    }

    private String resolveLabel(String settingKey) {
        if (CURRENT_NEWS_KEY.equalsIgnoreCase(settingKey)) {
            return CURRENT_NEWS_LABEL;
        }
        return "System setting " + settingKey;
    }

    private String resolveDescription(String settingKey, SystemSettingRecord existing) {
        if (existing != null && existing.description() != null && !existing.description().isBlank()) {
            return existing.description();
        }
        if (CURRENT_NEWS_KEY.equalsIgnoreCase(settingKey)) {
            return CURRENT_NEWS_DESCRIPTION;
        }
        return "System setting " + settingKey;
    }

    private String normalizeKey(String settingKey) {
        if (settingKey == null) {
            return null;
        }
        String trimmed = settingKey.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.toUpperCase();
    }

    private SystemSetting toModel(SystemSettingRecord record) {
        return new SystemSetting()
            .settingKey(record.settingKey())
            .description(record.description())
            .systemSettingValue(record.systemSettingValue())
            .entryTimestamp(record.entryTimestamp())
            .entryUserid(record.entryUserid())
            .updateTimestamp(record.updateTimestamp())
            .updateUserid(record.updateUserid())
            .revisionCount(record.revisionCount());
    }
}
