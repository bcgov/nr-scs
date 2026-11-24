package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ReportApi;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.model.report.DesignatedMarksExceptionReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.DistrictPerformanceReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.MarkSiteDesignationReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScaleSiteComplianceReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScaleSiteRegisterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScalerRegisterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScalingAdministrationReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScalingExceptionReportRequest;
import ca.bc.gov.nrs.scs.backend.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.NativeWebRequest;

@RestController
@RateLimited(RateLimitCategory.REPORT)
public class ReportController implements ReportApi {

  private static final String AUTHORIZATION_HEADER = "Authorization";

  private final ReportService reportService;
  private final NativeWebRequest request;

  public ReportController(ReportService reportService, NativeWebRequest request) {
    this.reportService = reportService;
    this.request = request;
  }
  @Override
  @RequiresPermission(Permissions.REPORT_READ)
  public ResponseEntity<Object> getScalerRegisterReport(
      @RequestBody ScalerRegisterReportRequest scalerRegisterReportRequest) {
    String authHeader = request != null ? request.getHeader(AUTHORIZATION_HEADER) : null;
    return ReportResponses.toResponse(reportService.fetchScalerRegisterReport(
        scalerRegisterReportRequest,
        authHeader));
  }

  @Override
  @RequiresPermission(Permissions.REPORT_READ)
  public ResponseEntity<Object> getScaleSiteRegisterReport(
      @RequestBody ScaleSiteRegisterReportRequest scaleSiteRegisterReportRequest) {
    String authHeader = request != null ? request.getHeader(AUTHORIZATION_HEADER) : null;
    return ReportResponses.toResponse(reportService.fetchScaleSiteRegisterReport(
        scaleSiteRegisterReportRequest,
        authHeader));
  }

  @Override
  @RequiresPermission(Permissions.REPORT_READ)
  public ResponseEntity<Object> getMarkSiteDesignationReport(
      @RequestBody MarkSiteDesignationReportRequest markSiteDesignationReportRequest) {
    String authHeader = request != null ? request.getHeader(AUTHORIZATION_HEADER) : null;
    return ReportResponses.toResponse(reportService.fetchMarkSiteDesignationReport(
        markSiteDesignationReportRequest,
        authHeader));
  }

  @Override
  @RequiresPermission(Permissions.REPORT_READ)
  public ResponseEntity<Object> getDesignatedMarksExceptionReport(
      @RequestBody DesignatedMarksExceptionReportRequest designatedMarksExceptionReportRequest) {
    String authHeader = request != null ? request.getHeader(AUTHORIZATION_HEADER) : null;
    return ReportResponses.toResponse(reportService.fetchDesignatedMarksExceptionReport(
        designatedMarksExceptionReportRequest,
        authHeader));
  }

  @Override
  @RequiresPermission(Permissions.REPORT_READ)
  public ResponseEntity<Object> getScalingAdministrationReport(
      @RequestBody ScalingAdministrationReportRequest scalingAdministrationReportRequest) {
    String authHeader = request != null ? request.getHeader(AUTHORIZATION_HEADER) : null;
    return ReportResponses.toResponse(reportService.fetchScalingAdministrationReport(
        scalingAdministrationReportRequest,
        authHeader));
  }

  @Override
  @RequiresPermission(Permissions.REPORT_READ)
  public ResponseEntity<Object> getScalingExceptionReport(
      @RequestBody ScalingExceptionReportRequest scalingExceptionReportRequest) {
    String authHeader = request != null ? request.getHeader(AUTHORIZATION_HEADER) : null;
    return ReportResponses.toResponse(reportService.fetchScalingExceptionReport(
        scalingExceptionReportRequest,
        authHeader));
  }

  @Override
  @RequiresPermission(Permissions.REPORT_READ)
  public ResponseEntity<Object> getDistrictCheckScalePerformanceReport(
      @RequestBody DistrictPerformanceReportRequest districtCheckScalePerformanceReportRequest) {
    String authHeader = request != null ? request.getHeader(AUTHORIZATION_HEADER) : null;
    return ReportResponses.toResponse(reportService.fetchDistrictCheckScalePerformanceReport(
        districtCheckScalePerformanceReportRequest,
        authHeader));
  }

  @Override
  @RequiresPermission(Permissions.REPORT_READ)
  public ResponseEntity<Object> getDistrictSiteInspectionPerformanceReport(
      @RequestBody DistrictPerformanceReportRequest districtSiteInspectionPerformanceReportRequest) {
    String authHeader = request != null ? request.getHeader(AUTHORIZATION_HEADER) : null;
    return ReportResponses.toResponse(reportService.fetchDistrictSiteInspectionPerformanceReport(
        districtSiteInspectionPerformanceReportRequest,
        authHeader));
  }

  @Override
  @RequiresPermission(Permissions.REPORT_READ)
  public ResponseEntity<Object> getScaleSiteComplianceReport(
      @RequestBody ScaleSiteComplianceReportRequest scaleSiteComplianceReportRequest) {
    String authHeader = request != null ? request.getHeader(AUTHORIZATION_HEADER) : null;
    return ReportResponses.toResponse(reportService.fetchScaleSiteComplianceReport(
        scaleSiteComplianceReportRequest,
        authHeader));
  }
}
