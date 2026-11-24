package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionRef;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthTemplate;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthTemplateSaveRequest;
import ca.bc.gov.nrs.scs.backend.repository.ScaleAuthTemplateRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScaleAuthTemplateService tests")
class ScaleAuthTemplateServiceTest {

  @Mock
  private ScaleAuthTemplateRepository repository;

  @InjectMocks
  private ScaleAuthTemplateService service;

  private ScaleAuthTemplateSaveRequest validRequest() {
    return new ScaleAuthTemplateSaveRequest("Template A", "GENERAL", 12L)
        .conditions(List.of(new ScaleAuthConditionRef()
            .scaleConditionClassCode("GENERAL")
            .scaleAuthConditionId(101L)));
  }

  private ScaleAuthTemplate template(Long id) {
    return new ScaleAuthTemplate()
        .scaleAuthTemplateId(id)
        .scaleAuthTemplateName("Template A")
        .scaleConditionClassCode("GENERAL")
        .orgUnitNo(12L);
  }

  @Nested
  @DisplayName("getTemplate")
  class GetTemplate {

    @Test
    @DisplayName("returns the repository template including conditions")
    void returnsTemplateFromRepository() {
      ScaleAuthTemplate detail = template(7L)
          .conditions(List.of(new ScaleAuthCondition()
              .scaleAuthConditionId(55L)
              .scaleAuthConditionTitle("Expired but assigned")
              .expiryDate(LocalDate.of(2024, 12, 31))));
      when(repository.getTemplate(7L)).thenReturn(detail);

      ScaleAuthTemplate result = service.getTemplate(7L);

      assertSame(detail, result);
      assertEquals(1, result.getConditions().size());
    }

    @Test
    @DisplayName("throws not found when the template does not exist")
    void throwsWhenTemplateMissing() {
      when(repository.getTemplate(7L)).thenReturn(null);

      ResourceNotFoundException ex = assertThrows(
          ResourceNotFoundException.class,
          () -> service.getTemplate(7L));

      assertEquals("No template found with id 7", ex.getMessage());
    }
  }

  @Nested
  @DisplayName("createTemplate")
  class CreateTemplate {

    @Test
    @DisplayName("creates conditions and returns the reloaded template")
    void createsConditionsAndReloadsTemplate() {
      ScaleAuthTemplateSaveRequest request = validRequest();
      ScaleAuthTemplate created = template(22L);
      ScaleAuthTemplate reloaded = template(22L)
          .conditions(List.of(new ScaleAuthCondition().scaleAuthConditionId(101L)));

      when(repository.createTemplate("Template A", "GENERAL", 12L)).thenReturn(created);
      when(repository.getTemplate(22L)).thenReturn(reloaded);

      ScaleAuthTemplate result = service.createTemplate(request);

      assertNotNull(result);
      assertEquals(22L, result.getScaleAuthTemplateId());
      verify(repository).createTemplate("Template A", "GENERAL", 12L);
      verify(repository).addConditions(22L, request.getConditions());
      verify(repository).getTemplate(22L);
    }

    @Test
    @DisplayName("skips condition insert when request has no conditions")
    void skipsConditionInsertWhenNoConditions() {
      ScaleAuthTemplateSaveRequest request = new ScaleAuthTemplateSaveRequest("Template A", "GENERAL", 12L)
          .conditions(List.of());
      when(repository.createTemplate("Template A", "GENERAL", 12L)).thenReturn(template(22L));
      when(repository.getTemplate(22L)).thenReturn(template(22L));

      service.createTemplate(request);

      verify(repository, never()).addConditions(22L, request.getConditions());
    }

    @Test
    @DisplayName("rejects invalid requests before writing")
    void rejectsInvalidRequest() {
      ScaleAuthTemplateSaveRequest request = new ScaleAuthTemplateSaveRequest(" ", "GENERAL", 12L);

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createTemplate(request));

      assertEquals("Template Name is required.", ex.getMessage());
      verify(repository, never()).createTemplate(" ", "GENERAL", 12L);
    }

    @Test
    @DisplayName("rejects a blank class code before writing")
    void createTemplate_throwsWhenClassCodeBlank() {
      ScaleAuthTemplateSaveRequest request = new ScaleAuthTemplateSaveRequest("Template A", " ", 12L);

      BadRequestException ex = assertThrows(
          BadRequestException.class, () -> service.createTemplate(request));

      assertEquals("Type (Scale Condition Class Code) is required.", ex.getMessage());
      verify(repository, never()).createTemplate("Template A", " ", 12L);
    }

    @Test
    @DisplayName("throws when the repository returns a template without an id")
    void createTemplate_throwsWhenRepositoryReturnsNoId() {
      ScaleAuthTemplateSaveRequest request = validRequest();
      when(repository.createTemplate("Template A", "GENERAL", 12L))
          .thenReturn(new ScaleAuthTemplate());

      BadRequestException ex = assertThrows(
          BadRequestException.class, () -> service.createTemplate(request));

      assertEquals("Template could not be created.", ex.getMessage());
      verify(repository, never()).addConditions(anyLong(), anyList());
    }
  }

  @Nested
  @DisplayName("updateTemplate")
  class UpdateTemplate {

    @Test
    @DisplayName("updates and replaces conditions before returning the refreshed template")
    void updatesAndReplacesConditions() {
      ScaleAuthTemplateSaveRequest request = validRequest();
      when(repository.getTemplate(22L)).thenReturn(template(22L), template(22L).conditions(List.of()));
      when(repository.updateTemplate(22L, "Template A", "GENERAL", 12L)).thenReturn(template(22L));

      ScaleAuthTemplate result = service.updateTemplate(22L, request);

      assertEquals(22L, result.getScaleAuthTemplateId());
      verify(repository).updateTemplate(22L, "Template A", "GENERAL", 12L);
      verify(repository).replaceConditions(22L, request.getConditions());
    }

    @Test
    @DisplayName("throws not found when the target template is missing")
    void throwsWhenUpdateTargetMissing() {
      when(repository.getTemplate(22L)).thenReturn(null);

      ResourceNotFoundException ex = assertThrows(
          ResourceNotFoundException.class,
          () -> service.updateTemplate(22L, validRequest()));

      assertEquals("No template found with id 22", ex.getMessage());
      verify(repository, never()).updateTemplate(22L, "Template A", "GENERAL", 12L);
      verify(repository, never()).replaceConditions(22L, validRequest().getConditions());
    }

    @Test
    @DisplayName("rejects an invalid request before touching the repository")
    void updateTemplate_validatesRequest() {
      ScaleAuthTemplateSaveRequest request = new ScaleAuthTemplateSaveRequest(" ", "GENERAL", 12L);

      BadRequestException ex = assertThrows(
          BadRequestException.class, () -> service.updateTemplate(22L, request));

      assertEquals("Template Name is required.", ex.getMessage());
      verify(repository, never()).getTemplate(22L);
      verify(repository, never()).updateTemplate(22L, " ", "GENERAL", 12L);
    }

    @Test
    @DisplayName("throws when the repository update returns null")
    void updateTemplate_throwsWhenUpdateReturnsNull() {
      ScaleAuthTemplateSaveRequest request = validRequest();
      when(repository.getTemplate(22L)).thenReturn(template(22L));
      when(repository.updateTemplate(22L, "Template A", "GENERAL", 12L)).thenReturn(null);

      BadRequestException ex = assertThrows(
          BadRequestException.class, () -> service.updateTemplate(22L, request));

      assertEquals("Template could not be updated.", ex.getMessage());
      verify(repository, never()).replaceConditions(anyLong(), anyList());
    }
  }

  @Nested
  @DisplayName("deleteTemplate")
  class DeleteTemplate {

    @Test
    @DisplayName("deletes an existing template")
    void deletesExistingTemplate() {
      when(repository.getTemplate(22L)).thenReturn(template(22L));

      service.deleteTemplate(22L);

      verify(repository).deleteTemplate(22L);
    }

    @Test
    @DisplayName("throws not found when deleting a missing template")
    void throwsWhenDeleteTargetMissing() {
      when(repository.getTemplate(22L)).thenReturn(null);

      ResourceNotFoundException ex = assertThrows(
          ResourceNotFoundException.class,
          () -> service.deleteTemplate(22L));

      assertEquals("No template found with id 22", ex.getMessage());
      verify(repository, never()).deleteTemplate(22L);
    }
  }
}