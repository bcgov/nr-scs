package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ConditionApi;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ConditionService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ConditionController implements ConditionApi {

  private final ConditionService conditionService;

  public ConditionController(ConditionService conditionService) {
    this.conditionService = conditionService;
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_CONDITIONS_QUERY)
  public ResponseEntity<List<ScaleAuthConditionDetail>> searchConditions(
      @RequestParam(value = "scaleConditionClassCode", required = false) String scaleConditionClassCode,
      @RequestParam(value = "scaleAuthConditionId", required = false) Long scaleAuthConditionId,
      @RequestParam(value = "scaleAuthConditionTitle", required = false) String scaleAuthConditionTitle,
      @RequestParam(value = "scaleAuthConditionDesc", required = false) String scaleAuthConditionDesc,
      @RequestParam(value = "ministryStandardInd", required = false) String ministryStandardInd,
      @RequestParam(value = "sortOrderNo", required = false) Integer sortOrderNo,
      @RequestParam(value = "effectiveDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDate,
      @RequestParam(value = "expiryDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate) {
    return ResponseEntity.ok(
        conditionService.searchConditions(
            scaleConditionClassCode,
            scaleAuthConditionId,
            scaleAuthConditionTitle,
            scaleAuthConditionDesc,
            ministryStandardInd,
            sortOrderNo,
            effectiveDate,
            expiryDate));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_CONDITIONS_CREATE)
  public ResponseEntity<ScaleAuthConditionDetail> createCondition(
      @RequestBody ScaleAuthConditionCreateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(conditionService.createCondition(request));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_CONDITIONS_READ)
  public ResponseEntity<ScaleAuthConditionDetail> getCondition(
      String scaleConditionClassCode,
      Long scaleAuthConditionId) {
    return ResponseEntity.ok(conditionService.getCondition(scaleConditionClassCode, scaleAuthConditionId));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_CONDITIONS_UPDATE)
  public ResponseEntity<ScaleAuthConditionDetail> updateCondition(
      String scaleConditionClassCode,
      Long scaleAuthConditionId,
      @RequestBody ScaleAuthConditionUpdateRequest request) {
    return ResponseEntity.ok(
        conditionService.updateCondition(scaleConditionClassCode, scaleAuthConditionId, request));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_CONDITIONS_DELETE)
  public ResponseEntity<Void> deleteCondition(
      String scaleConditionClassCode,
      Long scaleAuthConditionId) {
    conditionService.deleteCondition(scaleConditionClassCode, scaleAuthConditionId);
    return ResponseEntity.noContent().build();
  }
}
