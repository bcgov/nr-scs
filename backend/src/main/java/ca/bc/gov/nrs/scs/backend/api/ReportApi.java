package ca.bc.gov.nrs.scs.backend.api;

import ca.bc.gov.nrs.scs.backend.model.report.ScaleSiteRegisterReportRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import ca.bc.gov.nrs.scs.backend.model.report.DesignatedMarksExceptionReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.DistrictPerformanceReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.MarkSiteDesignationReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScalerRegisterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScaleSiteComplianceReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScalingAdministrationReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScalingExceptionReportRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@Tag(name = "Report", description = "Report generation and delivery operations")
public interface ReportApi {

  @Operation(
      summary = "Generate the Scaler Register report",
      description = "Generates the Scaler Register report (legacy SCS_REP005) using the provided parameters and returns the report content directly.",
      security = {
          @SecurityRequirement(name = "BearerAuth")
      })
  @ApiResponse(responseCode = "200", description = "Report content")
    @ApiResponse(responseCode = "202", description = "Report request accepted")
  @ApiResponse(responseCode = "400", description = "Validation error")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "500", description = "Server error")
  @PostMapping(
      value = "/reports/scaler-register",
      consumes = "application/json",
      produces = {"application/pdf", "application/vnd.ms-excel", "application/json"})
    ResponseEntity<Object> getScalerRegisterReport(
      @Valid @RequestBody ScalerRegisterReportRequest scalerRegisterReportRequest);

  @Operation(
      summary = "Generate the Scale Site Register report",
      description = "Generates the Scale Site Register report (legacy SCS_REP007) using the provided parameters and returns the report content directly.",
      security = {
          @SecurityRequirement(name = "BearerAuth")
      })
  @ApiResponse(responseCode = "200", description = "Report content")
    @ApiResponse(responseCode = "202", description = "Report request accepted")
  @ApiResponse(responseCode = "400", description = "Validation error")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "500", description = "Server error")
  @PostMapping(
      value = "/reports/scale-site-register",
      consumes = "application/json",
      produces = {"application/pdf", "application/vnd.ms-excel", "application/json"})
    ResponseEntity<Object> getScaleSiteRegisterReport(
      @Valid @RequestBody ScaleSiteRegisterReportRequest scaleSiteRegisterReportRequest);

  @Operation(
      summary = "Generate the Mark Site Designation report",
      description = "Generates the Mark Site Designation report (legacy SCS_REP010) using the provided parameters and returns the report content directly.",
      security = {
          @SecurityRequirement(name = "BearerAuth")
      })
  @ApiResponse(responseCode = "200", description = "Report content")
    @ApiResponse(responseCode = "202", description = "Report request accepted")
  @ApiResponse(responseCode = "400", description = "Validation error")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "500", description = "Server error")
  @PostMapping(
      value = "/reports/mark-site-designation",
      consumes = "application/json",
      produces = {"application/pdf", "application/vnd.ms-excel", "application/json"})
    ResponseEntity<Object> getMarkSiteDesignationReport(
      @Valid @RequestBody MarkSiteDesignationReportRequest markSiteDesignationReportRequest);

  @Operation(
      summary = "Generate the Designated Marks Exception report",
      description = "Generates the Designated Marks Exception report (legacy SCS_REP002) using the provided parameters and returns the report content directly.",
      security = {
          @SecurityRequirement(name = "BearerAuth")
      })
  @ApiResponse(responseCode = "200", description = "Report content")
    @ApiResponse(responseCode = "202", description = "Report request accepted")
  @ApiResponse(responseCode = "400", description = "Validation error")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "500", description = "Server error")
  @PostMapping(
      value = "/reports/designated-marks-exception",
      consumes = "application/json",
      produces = {"application/pdf", "application/vnd.ms-excel", "application/json"})
    ResponseEntity<Object> getDesignatedMarksExceptionReport(
      @Valid @RequestBody DesignatedMarksExceptionReportRequest designatedMarksExceptionReportRequest);

    @Operation(
      summary = "Generate the Scaling Administration report",
      description = "Generates the Scaling Administration report (legacy SCS_REP015) using the provided parameters and returns the report content directly.",
      security = {
        @SecurityRequirement(name = "BearerAuth")
      })
    @ApiResponse(responseCode = "200", description = "Report content")
    @ApiResponse(responseCode = "202", description = "Report request accepted")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @ApiResponse(responseCode = "500", description = "Server error")
    @PostMapping(
      value = "/reports/scaling-administration",
      consumes = "application/json",
      produces = {"application/pdf", "application/vnd.ms-excel", "application/json"})
    ResponseEntity<Object> getScalingAdministrationReport(
      @Valid @RequestBody ScalingAdministrationReportRequest scalingAdministrationReportRequest);

    @Operation(
      summary = "Generate the Scaling Exception report",
      description = "Generates the Scaling Exception report (legacy SCS_REP016) using the provided parameters and returns the report content directly.",
      security = {
        @SecurityRequirement(name = "BearerAuth")
      })
    @ApiResponse(responseCode = "200", description = "Report content")
    @ApiResponse(responseCode = "202", description = "Report request accepted")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @ApiResponse(responseCode = "500", description = "Server error")
    @PostMapping(
      value = "/reports/scaling-exception",
      consumes = "application/json",
      produces = {"application/pdf", "application/vnd.ms-excel", "application/json"})
    ResponseEntity<Object> getScalingExceptionReport(
      @Valid @RequestBody ScalingExceptionReportRequest scalingExceptionReportRequest);

    @Operation(
      summary = "Generate the District Check Scale Performance report",
      description = "Generates the District Check Scale Performance report (legacy SCS_REP025) using the provided parameters and returns the report content directly.",
      security = {
        @SecurityRequirement(name = "BearerAuth")
      })
    @ApiResponse(responseCode = "200", description = "Report content")
    @ApiResponse(responseCode = "202", description = "Report request accepted")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @ApiResponse(responseCode = "500", description = "Server error")
    @PostMapping(
      value = "/reports/district-check-scale-performance",
      consumes = "application/json",
      produces = {"application/pdf", "application/vnd.ms-excel", "application/json"})
    ResponseEntity<Object> getDistrictCheckScalePerformanceReport(
      @Valid @RequestBody DistrictPerformanceReportRequest districtCheckScalePerformanceReportRequest);

    @Operation(
      summary = "Generate the District Site Inspection Performance report",
      description = "Generates the District Site Inspection Performance report (legacy SCS_REP026) using the provided parameters and returns the report content directly.",
      security = {
        @SecurityRequirement(name = "BearerAuth")
      })
    @ApiResponse(responseCode = "200", description = "Report content")
    @ApiResponse(responseCode = "202", description = "Report request accepted")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @ApiResponse(responseCode = "500", description = "Server error")
    @PostMapping(
      value = "/reports/district-site-inspection-performance",
      consumes = "application/json",
      produces = {"application/pdf", "application/vnd.ms-excel", "application/json"})
    ResponseEntity<Object> getDistrictSiteInspectionPerformanceReport(
      @Valid @RequestBody DistrictPerformanceReportRequest districtSiteInspectionPerformanceReportRequest);

    @Operation(
      summary = "Generate the Scale Site Compliance report",
      description = "Generates the Scale Site Compliance report (legacy SCS_REP014) for a specific site inspection and returns the report content directly.",
      security = {
        @SecurityRequirement(name = "BearerAuth")
      })
    @ApiResponse(responseCode = "200", description = "Report content")
    @ApiResponse(responseCode = "202", description = "Report request accepted")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @ApiResponse(responseCode = "500", description = "Server error")
    @PostMapping(
      value = "/reports/scale-site-compliance",
      consumes = "application/json",
      produces = {"application/pdf", "application/vnd.ms-excel", "application/json"})
    ResponseEntity<Object> getScaleSiteComplianceReport(
      @Valid @RequestBody ScaleSiteComplianceReportRequest scaleSiteComplianceReportRequest);
}
