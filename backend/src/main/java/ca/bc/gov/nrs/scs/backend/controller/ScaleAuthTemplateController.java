package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ca.bc.gov.nrs.scs.backend.api.ScaleAuthTemplateApi;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthTemplate;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthTemplateSaveRequest;
import ca.bc.gov.nrs.scs.backend.service.ScaleAuthTemplateService;

@RestController
public class ScaleAuthTemplateController implements ScaleAuthTemplateApi {

  private final ScaleAuthTemplateService service;

  public ScaleAuthTemplateController(ScaleAuthTemplateService service) {
    this.service = service;
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_TEMPLATES_QUERY)
  public ResponseEntity<List<ScaleAuthTemplate>> searchScaleAuthTemplates(
      @RequestParam(value = "scaleConditionClassCode", required = false) String scaleConditionClassCode,
      @RequestParam(value = "orgUnitNo", required = false) Long orgUnitNo,
      @RequestParam(value = "scaleAuthTemplateName", required = false) String scaleAuthTemplateName) {
    return ResponseEntity.ok(
        service.searchTemplates(scaleConditionClassCode, orgUnitNo, scaleAuthTemplateName));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_TEMPLATES_CREATE)
  public ResponseEntity<ScaleAuthTemplate> createScaleAuthTemplate(
      @RequestBody ScaleAuthTemplateSaveRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.createTemplate(request));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_TEMPLATES_READ)
  public ResponseEntity<ScaleAuthTemplate> getScaleAuthTemplate(
      Long templateId) {
    return ResponseEntity.ok(service.getTemplate(templateId));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_TEMPLATES_UPDATE)
  public ResponseEntity<ScaleAuthTemplate> updateScaleAuthTemplate(
      Long templateId,
      @RequestBody ScaleAuthTemplateSaveRequest request) {
    return ResponseEntity.ok(service.updateTemplate(templateId, request));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_TEMPLATES_DELETE)
  public ResponseEntity<Void> deleteScaleAuthTemplate(
      Long templateId) {
    service.deleteTemplate(templateId);
    return ResponseEntity.noContent().build();
  }
}
