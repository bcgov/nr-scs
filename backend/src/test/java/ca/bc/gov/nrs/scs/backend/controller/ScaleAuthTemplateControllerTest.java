package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionRef;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthTemplate;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthTemplateSaveRequest;
import ca.bc.gov.nrs.scs.backend.service.ScaleAuthTemplateService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScaleAuthTemplateControllerTest {

  private ScaleAuthTemplateService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScaleAuthTemplateService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleAuthTemplateController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void searchScaleAuthTemplates_returns200AndBody() throws Exception {
    when(service.searchTemplates("GENERAL", 12L, "Template A"))
        .thenReturn(List.of(new ScaleAuthTemplate()
            .scaleAuthTemplateId(7L)
            .scaleAuthTemplateName("Template A")
            .scaleConditionClassCode("GENERAL")
            .orgUnitNo(12L)));

    mockMvc.perform(get("/scale-auth-templates")
            .param("scaleConditionClassCode", "GENERAL")
            .param("orgUnitNo", "12")
            .param("scaleAuthTemplateName", "Template A")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scaleAuthTemplateId").value(7))
        .andExpect(jsonPath("$[0].scaleAuthTemplateName").value("Template A"));
  }

  @Test
  void getScaleAuthTemplate_returns200AndBody() throws Exception {
    when(service.getTemplate(7L)).thenReturn(new ScaleAuthTemplate()
        .scaleAuthTemplateId(7L)
        .scaleAuthTemplateName("Template A")
        .conditions(List.of(new ScaleAuthCondition()
            .scaleAuthConditionId(55L)
            .scaleAuthConditionTitle("Expired but assigned")
            .expiryDate(LocalDate.of(2024, 12, 31)))));

    mockMvc.perform(get("/scale-auth-templates/7")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scaleAuthTemplateId").value(7))
        .andExpect(jsonPath("$.conditions[0].scaleAuthConditionId").value(55));
  }

  @Test
  void createScaleAuthTemplate_returns201AndBody() throws Exception {
    ScaleAuthTemplateSaveRequest request = new ScaleAuthTemplateSaveRequest("Template A", "GENERAL", 12L)
        .conditions(List.of(new ScaleAuthConditionRef()
            .scaleConditionClassCode("GENERAL")
            .scaleAuthConditionId(101L)));

    when(service.createTemplate(org.mockito.ArgumentMatchers.any(ScaleAuthTemplateSaveRequest.class)))
        .thenReturn(new ScaleAuthTemplate()
            .scaleAuthTemplateId(7L)
            .scaleAuthTemplateName("Template A")
            .scaleConditionClassCode("GENERAL")
            .orgUnitNo(12L));

    mockMvc.perform(post("/scale-auth-templates")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.scaleAuthTemplateId").value(7));
  }

  @Test
  void updateScaleAuthTemplate_returns200AndBody() throws Exception {
    ScaleAuthTemplateSaveRequest request = new ScaleAuthTemplateSaveRequest("Template A", "GENERAL", 12L);
    when(service.updateTemplate(org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.any(ScaleAuthTemplateSaveRequest.class)))
        .thenReturn(new ScaleAuthTemplate().scaleAuthTemplateId(7L).scaleAuthTemplateName("Template A"));

    mockMvc.perform(put("/scale-auth-templates/7")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scaleAuthTemplateId").value(7));
  }

  @Test
  void deleteScaleAuthTemplate_returns204() throws Exception {
    mockMvc.perform(delete("/scale-auth-templates/7")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    verify(service).deleteTemplate(7L);
  }

  @Test
  void getScaleAuthTemplate_notFound_returns404() throws Exception {
    when(service.getTemplate(7L)).thenThrow(new ResourceNotFoundException("No template found with id 7"));

    mockMvc.perform(get("/scale-auth-templates/7")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void createScaleAuthTemplate_badRequest_returns400() throws Exception {
    ScaleAuthTemplateSaveRequest request = new ScaleAuthTemplateSaveRequest("Template A", "GENERAL", 12L);
    when(service.createTemplate(org.mockito.ArgumentMatchers.any(ScaleAuthTemplateSaveRequest.class)))
        .thenThrow(new BadRequestException("Template Name is required."));

    mockMvc.perform(post("/scale-auth-templates")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }

  @Test
  void deleteScaleAuthTemplate_notFound_returns404() throws Exception {
    doThrow(new ResourceNotFoundException("No template found with id 7"))
        .when(service)
        .deleteTemplate(7L);

    mockMvc.perform(delete("/scale-auth-templates/7")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }
}