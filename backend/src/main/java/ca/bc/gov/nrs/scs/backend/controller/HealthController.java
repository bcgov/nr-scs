package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import ca.bc.gov.nrs.scs.backend.api.HealthApi;
import ca.bc.gov.nrs.scs.backend.service.HealthService;

@RestController
public class HealthController implements HealthApi {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @Override
    @RequiresPermission(Permissions.SYSTEM_ADMIN)
    public ResponseEntity getHealth() {
        return ResponseEntity.ok(healthService.checkHealth());
    }
}
