package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.WelcomeApi;
import ca.bc.gov.nrs.scs.backend.model.WelcomeSummary;
import ca.bc.gov.nrs.scs.backend.service.WelcomeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.NativeWebRequest;

@RestController
public class WelcomeController implements WelcomeApi {

    private final WelcomeService welcomeService;
    private final NativeWebRequest request;

    public WelcomeController(WelcomeService welcomeService, NativeWebRequest request) {
        this.welcomeService = welcomeService;
        this.request = request;
    }

    @Override
    @RequiresPermission(Permissions.WELCOME_READ)
    public ResponseEntity<WelcomeSummary> getWelcome(Long orgUnitNo) {
        String authHeader = request != null ? request.getHeader("Authorization") : null;
        return ResponseEntity.ok(welcomeService.buildWelcomeSummary(request, authHeader, orgUnitNo));
    }
}
