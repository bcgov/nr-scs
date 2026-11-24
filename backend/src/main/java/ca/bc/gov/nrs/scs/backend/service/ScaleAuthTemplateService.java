package ca.bc.gov.nrs.scs.backend.service;

import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionRef;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthTemplate;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthTemplateSaveRequest;
import ca.bc.gov.nrs.scs.backend.repository.ScaleAuthTemplateRepository;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;

@Service
public class ScaleAuthTemplateService {

  private static final String NO_TEMPLATE_FOUND = "No template found with id ";

  private final ScaleAuthTemplateRepository repository;

  public ScaleAuthTemplateService(ScaleAuthTemplateRepository repository) {
    this.repository = repository;
  }

  public List<ScaleAuthTemplate> searchTemplates(
      String scaleConditionClassCode, Long orgUnitNo, String scaleAuthTemplateName) {
    return repository.searchTemplates(scaleConditionClassCode, orgUnitNo, scaleAuthTemplateName);
  }

  public ScaleAuthTemplate getTemplate(Long templateId) {
    ScaleAuthTemplate template = repository.getTemplate(templateId);
    SCSUtils.requireFound(template, NO_TEMPLATE_FOUND + templateId);
    return template;
  }

  // Template mutations must evict the "lov-template" cache (LovService.getTemplateLov),
  // otherwise the template dropdowns on the MSD / Scaler Auth / Scale Site Auth usage pages
  // keep serving the stale, pre-mutation list for the cache's 24h TTL — a deleted template
  // lingers in the dropdown and applying it silently does nothing. allEntries because the
  // cache is keyed by filterField and one template maps to whichever view a subject reads.
  @CacheEvict(value = "lov-template", allEntries = true)
  @Transactional
  public ScaleAuthTemplate createTemplate(ScaleAuthTemplateSaveRequest request) {
    validate(request);

    ScaleAuthTemplate created = repository.createTemplate(
        request.getScaleAuthTemplateName(),
        request.getScaleConditionClassCode(),
        request.getOrgUnitNo());

    if (created == null || created.getScaleAuthTemplateId() == null) {
      throw new BadRequestException("Template could not be created.");
    }

    List<ScaleAuthConditionRef> conditions = request.getConditions();
    if (conditions != null && !conditions.isEmpty()) {
      repository.addConditions(created.getScaleAuthTemplateId(), conditions);
    }

    return repository.getTemplate(created.getScaleAuthTemplateId());
  }

  @CacheEvict(value = "lov-template", allEntries = true)
  @Transactional
  public ScaleAuthTemplate updateTemplate(Long templateId, ScaleAuthTemplateSaveRequest request) {
    validate(request);

    ScaleAuthTemplate existing = repository.getTemplate(templateId);
    SCSUtils.requireFound(existing, NO_TEMPLATE_FOUND + templateId);

    ScaleAuthTemplate updated = repository.updateTemplate(
        templateId,
        request.getScaleAuthTemplateName(),
        request.getScaleConditionClassCode(),
        request.getOrgUnitNo());

    if (updated == null) {
      throw new BadRequestException("Template could not be updated.");
    }

    repository.replaceConditions(templateId, request.getConditions());

    return repository.getTemplate(templateId);
  }

  @CacheEvict(value = "lov-template", allEntries = true)
  @Transactional
  public void deleteTemplate(Long templateId) {
    ScaleAuthTemplate existing = repository.getTemplate(templateId);
    SCSUtils.requireFound(existing, NO_TEMPLATE_FOUND + templateId);
    repository.deleteTemplate(templateId);
  }

  private void validate(ScaleAuthTemplateSaveRequest request) {
    if (request == null) {
      throw new BadRequestException("Request body is required.");
    }
    if (SCSUtils.isBlank(request.getScaleAuthTemplateName())) {
      throw new BadRequestException("Template Name is required.");
    }
    if (SCSUtils.isBlank(request.getScaleConditionClassCode())) {
      throw new BadRequestException("Type (Scale Condition Class Code) is required.");
    }
  }
}
