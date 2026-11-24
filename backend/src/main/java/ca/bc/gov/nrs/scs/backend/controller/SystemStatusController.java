package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.api.SystemStatusApi;
import ca.bc.gov.nrs.scs.backend.model.SystemStatus;
import ca.bc.gov.nrs.scs.backend.service.SystemStatusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SystemStatusController implements SystemStatusApi {

    private final SystemStatusService service;

    public SystemStatusController(SystemStatusService service) {
        this.service = service;
    }

    @Override
    public ResponseEntity<SystemStatus> getSystemStatus() {
        return ResponseEntity.ok(service.getStatus());
    }
}
