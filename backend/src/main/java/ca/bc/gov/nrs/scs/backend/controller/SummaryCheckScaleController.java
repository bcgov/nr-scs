package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.SummaryCheckScaleApi;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleCreateResponse;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerSummaryCheckScaleTabResult;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleSpgRow;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleSpgRowKey;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.SummaryCheckScaleService;
import ca.bc.gov.nrs.scs.backend.service.mapper.CheckScaleApiMapper;
import ca.bc.gov.nrs.scs.backend.service.mapper.SummaryCheckScaleApiMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SummaryCheckScaleController implements SummaryCheckScaleApi {

  private final SummaryCheckScaleService service;

  public SummaryCheckScaleController(SummaryCheckScaleService service) {
    this.service = service;
  }

  @Override
  @RequiresPermission(Permissions.SCALER_CHECK_SCALE_QUERY)
  public ResponseEntity<ScalerSummaryCheckScaleTabResult> getScalerSummaryCheckScales(
      String scalerLicenceNo) {
    return ResponseEntity.ok(
        SummaryCheckScaleApiMapper.toScalerSummaryTabResult(
            service.getScalerSummaryCheckScales(scalerLicenceNo)));
  }

  @Override
  @RequiresPermission(Permissions.SUMMARY_CHECK_SCALE_CREATE)
  public ResponseEntity<CheckScaleCreateResponse> createSummaryCheckScale(
      @RequestBody SummaryCheckScaleCreateRequest request) {
    Long id = service.createSummaryCheckScale(SummaryCheckScaleApiMapper.toCreateCommand(request));
    return ResponseEntity.status(HttpStatus.CREATED).body(CheckScaleApiMapper.toCreateResponse(id));
  }

  @Override
  @RequiresPermission(Permissions.SUMMARY_CHECK_SCALE_UPDATE)
  public ResponseEntity<CheckScaleDetail> updateSummaryCheckScale(
      Long checkScaleId, @RequestBody SummaryCheckScaleUpdateRequest request) {
    return ResponseEntity.ok(
        CheckScaleApiMapper.toCheckScaleDetail(
            service.updateSummaryCheckScale(
                checkScaleId, SummaryCheckScaleApiMapper.toUpdateCommand(request))));
  }

  @Override
  @RequiresPermission(Permissions.SUMMARY_CHECK_SCALE_UPDATE)
  public ResponseEntity<CheckScaleDetail> addSummaryCheckScaleSpgRow(
      Long checkScaleId, @RequestBody SummaryCheckScaleSpgRow request) {
    return ResponseEntity.ok(
        CheckScaleApiMapper.toCheckScaleDetail(
            service.addSpgRow(checkScaleId, SummaryCheckScaleApiMapper.toSpgRowCommand(request))));
  }

  /**
   * The composite key arrives in the BODY, not as query parameters. A blanked product or grade is
   * stored as a single space, and query-parameter binding runs it through
   * {@code RequestParamTrimmingAdvice}'s {@code StringTrimmerEditor(true)}, which turns a
   * whitespace-only value into null — so a required parameter arrived null and the request died with
   * {@code MissingServletRequestParameterException} before this method ran. That surfaced as a
   * <strong>500</strong>, not the Spring-default 400: {@link
   * ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler} does not extend
   * {@code ResponseEntityExceptionHandler} and maps no handler to that exception, so it landed on
   * the catch-all {@code @ExceptionHandler(Exception.class)}. Jackson deserializes the body without
   * the data binder, so the space survives. See {@code SummaryCheckScaleSpgRowKey}.
   */
  @Override
  @RequiresPermission(Permissions.SUMMARY_CHECK_SCALE_UPDATE)
  public ResponseEntity<CheckScaleDetail> deleteSummaryCheckScaleSpgRow(
      Long checkScaleId, @RequestBody SummaryCheckScaleSpgRowKey key) {
    return ResponseEntity.ok(
        CheckScaleApiMapper.toCheckScaleDetail(
            service.deleteSpgRow(
                checkScaleId,
                key.getScaleSpeciesCode(),
                key.getScaleProductCode(),
                key.getScaleGradeCode())));
  }

  @Override
  @RequiresPermission(Permissions.SUMMARY_CHECK_SCALE_DELETE)
  public ResponseEntity<Void> deleteSummaryCheckScale(Long checkScaleId) {
    service.deleteSummaryCheckScale(checkScaleId);
    return ResponseEntity.noContent().build();
  }
}
