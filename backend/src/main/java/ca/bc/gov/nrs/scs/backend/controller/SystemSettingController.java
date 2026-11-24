package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.SystemSettingApi;
import ca.bc.gov.nrs.scs.backend.model.SystemSetting;
import ca.bc.gov.nrs.scs.backend.model.SystemSettingUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.SystemSettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SystemSettingController implements SystemSettingApi {

    private final SystemSettingService service;

    public SystemSettingController(SystemSettingService service) {
        this.service = service;
    }

    @Override
    @RequiresPermission(Permissions.MAINTAIN_SYSTEM_READ)
    public ResponseEntity<SystemSetting> getSystemSetting(String settingKey) {
        return ResponseEntity.ok(service.getSystemSetting(settingKey));
    }

    @Override
    @RequiresPermission(Permissions.MAINTAIN_SYSTEM_UPDATE)
    public ResponseEntity<SystemSetting> updateSystemSetting(
        String settingKey,
        SystemSettingUpdateRequest systemSettingUpdateRequest) {
        return ResponseEntity.ok(service.updateSystemSetting(settingKey, systemSettingUpdateRequest));
    }
}
