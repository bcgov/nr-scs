package ca.bc.gov.nrs.scs.backend.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;

@Tag(name = "Health", description = "Operations related to health checks")
public interface HealthApi {

    @Operation(summary = "Get health status", description = "Returns a 200 OK to confirm that the API is working")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved health status")
    @GetMapping("/health")
    ResponseEntity<Void> getHealth();
}
