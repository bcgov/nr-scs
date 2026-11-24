package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationSaveRequest;
import ca.bc.gov.nrs.scs.backend.service.LetterService;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteAuthorizationService;

class ScaleSiteAuthorizationControllerTest {

  private ScaleSiteAuthorizationService service;
    private LetterService letterService;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScaleSiteAuthorizationService.class);
    letterService = mock(LetterService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleSiteAuthorizationController(service, letterService))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void listScaleSiteAuthorizations_returns200AndBody() throws Exception {
    ScaleSiteAuthorizationDetail item = new ScaleSiteAuthorizationDetail();
    item.setScaleSiteAuthorizationId(7001L);
    item.setScaleSiteIdNmbr("A12345");
    item.setAuthorizationEffectiveDate(LocalDate.of(2025, 1, 15));
    item.setAuthorizationExpiryDate(LocalDate.of(2027, 1, 15));
    item.setStatus("Active");
    item.setLetterExists(true);
    when(service.listScaleSiteAuthorizations("A12345")).thenReturn(List.of(item));

    mockMvc.perform(get("/scale-sites/A12345/authorizations")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scaleSiteAuthorizationId").value(7001))
        .andExpect(jsonPath("$[0].status").value("Active"))
        .andExpect(jsonPath("$[0].letterExists").value(true));

    verify(service).listScaleSiteAuthorizations("A12345");
  }

  @Test
  void listScaleSiteAuthorizations_scaleSiteNotFound_returns404() throws Exception {
    when(service.listScaleSiteAuthorizations("ZZZZZ"))
        .thenThrow(new ResourceNotFoundException("No scale site found with number ZZZZZ"));

    mockMvc.perform(get("/scale-sites/ZZZZZ/authorizations")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }


  @Test
  void removeScaleSiteAuthorizationFromWorkbench_returns204() throws Exception {
    mockMvc.perform(post("/scale-site-authorizations/12345/workbench/remove")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    verify(service).removeScaleSiteAuthorizationFromWorkbench(12345L);
  }

  @Test
  void removeScaleSiteAuthorizationFromWorkbench_notFound_returns404() throws Exception {
    Mockito.doThrow(new ResourceNotFoundException("No scale site authorization found with id 12345"))
        .when(service)
        .removeScaleSiteAuthorizationFromWorkbench(12345L);

    mockMvc.perform(post("/scale-site-authorizations/12345/workbench/remove")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void createScaleSiteAuthorization_returns201AndBody() throws Exception {
    ScaleSiteAuthorizationSaveRequest request = new ScaleSiteAuthorizationSaveRequest();
    request.setScaleSiteIdNmbr("S001");
    request.setAuthorizationEffectiveDate(LocalDate.of(2025, 1, 1));
    request.setAuthorizationExpiryDate(LocalDate.of(2025, 12, 31));
    request.setExpectedScaleVolume(500L);

    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setScaleSiteAuthorizationId(8888L);
    detail.setScaleSiteIdNmbr("S001");

    when(service.createScaleSiteAuthorization(any())).thenReturn(detail);

    mockMvc.perform(post("/scale-site-authorizations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.scaleSiteAuthorizationId").value(8888))
        .andExpect(jsonPath("$.scaleSiteIdNmbr").value("S001"));
  }

  @Test
  void createScaleSiteAuthorization_badRequest_returns400() throws Exception {
    ScaleSiteAuthorizationSaveRequest request = new ScaleSiteAuthorizationSaveRequest();
    request.setScaleSiteIdNmbr("XXXX");
    request.setAuthorizationEffectiveDate(LocalDate.of(2025, 1, 1));
    request.setAuthorizationExpiryDate(LocalDate.of(2025, 12, 31));
    request.setExpectedScaleVolume(100L);

    when(service.createScaleSiteAuthorization(any()))
        .thenThrow(new BadRequestException("Scale Site # does not exist."));

    mockMvc.perform(post("/scale-site-authorizations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }

  @Test
  void getScaleSiteAuthorization_returns200AndBody() throws Exception {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setScaleSiteAuthorizationId(7777L);
    detail.setScaleSiteIdNmbr("S002");

    when(service.getScaleSiteAuthorization(7777L)).thenReturn(detail);

    mockMvc.perform(get("/scale-site-authorizations/7777")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scaleSiteAuthorizationId").value(7777))
        .andExpect(jsonPath("$.scaleSiteIdNmbr").value("S002"));
  }

  @Test
  void getScaleSiteAuthorization_notFound_returns404() throws Exception {
    when(service.getScaleSiteAuthorization(9999L))
        .thenThrow(new ResourceNotFoundException("No scale site authorization found with id 9999"));

    mockMvc.perform(get("/scale-site-authorizations/9999")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void searchActiveScaleSiteAuthConditions_returns200AndBody() throws Exception {
    ScaleAuthCondition condition = new ScaleAuthCondition();
    condition.setScaleAuthConditionId(3L);
    condition.setScaleAuthConditionTitle("Site Condition B");

    when(service.searchActiveScaleSiteAuthConditions("SITE", 3L, "Site Condition B", null, "N", null))
        .thenReturn(List.of(condition));

    mockMvc.perform(get("/scale-site-authorizations/conditions")
            .param("scaleConditionClassCode", "SITE")
            .param("scaleAuthConditionId", "3")
            .param("scaleAuthConditionTitle", "Site Condition B")
            .param("ministryStandardInd", "N")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scaleAuthConditionId").value(3))
        .andExpect(jsonPath("$[0].scaleAuthConditionTitle").value("Site Condition B"));
  }

  @Test
  void searchActiveScaleSiteAuthConditions_noParams_returns200EmptyList() throws Exception {
    when(service.searchActiveScaleSiteAuthConditions(null, null, null, null, null, null))
        .thenReturn(List.of());

    mockMvc.perform(get("/scale-site-authorizations/conditions")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());
  }

  @Test
  void getScaleSiteAuthTemplateConditions_returns200AndBody() throws Exception {
    ScaleAuthCondition condition = new ScaleAuthCondition();
    condition.setScaleAuthConditionId(11L);
    condition.setScaleAuthConditionTitle("Template Condition X");

    when(service.getScaleAuthTemplateConditions(55L)).thenReturn(List.of(condition));

    mockMvc.perform(get("/scale-site-authorizations/templates/55/conditions")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scaleAuthConditionId").value(11))
        .andExpect(jsonPath("$[0].scaleAuthConditionTitle").value("Template Condition X"));
  }

}