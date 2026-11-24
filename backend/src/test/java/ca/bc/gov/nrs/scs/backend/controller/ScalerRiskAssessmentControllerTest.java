package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentUpdateCommand;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentResponseInput;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSaveRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.service.ScalerRiskAssessmentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.math.BigDecimal;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScalerRiskAssessmentControllerTest {

  private ScalerRiskAssessmentService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScalerRiskAssessmentService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScalerRiskAssessmentController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  private ScalerRiskAssessmentSearchResult stubSearchResult(Long id) {
    ScalerRiskAssessmentSearchResult r = new ScalerRiskAssessmentSearchResult();
    r.setRiskQuestionnaireId(JsonNullable.of(id));
    r.setScalerLicenceNo(JsonNullable.of("LIC-" + id));
    r.setRiskRating(JsonNullable.of(BigDecimal.valueOf(4.2)));
    return r;
  }

  private ScalerRiskAssessmentDetail stubDetail(Long id) {
    ScalerRiskAssessmentDetail d = new ScalerRiskAssessmentDetail();
    d.setRiskQuestionnaireId(JsonNullable.of(id));
    d.setScalerLicenceNo(JsonNullable.of("LIC-" + id));
    d.setTemplateId(JsonNullable.of(7L));
    d.setComments(JsonNullable.of("Test comment"));
    return d;
  }

  private RiskAssessmentSaveRequest minimalSaveRequest() {
    return new RiskAssessmentSaveRequest()
        .comments("Test comment")
        .responses(List.of(new RiskAssessmentResponseInput().questionId(11L).answerId(101L)));
  }

  @Test
  void searchScalerRiskAssessments_smoke_returns200() throws Exception {
    when(service.searchScalerRiskAssessments(
            eq("100%"), eq("MEDIUM"), eq("Y"), eq("LIC001"), eq(10L),
            eq("12345678"), eq("SCS"), eq(1), eq(0)))
        .thenReturn(List.of(stubSearchResult(100L)));

    mockMvc.perform(get("/scaler-risk-assessments/search")
            .param("riskQuestionnaireId", "100%")
            .param("riskTypeCode", "MEDIUM")
            .param("completeInd", "Y")
            .param("scalerLicenceNo", "LIC001")
            .param("orgUnitNo", "10")
            .param("clientNumber", "12345678")
            .param("scalerLicenceTypeCode", "SCS")
            .param("primarySort", "1")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("LIC-100")));
  }

  @Test
  void searchScalerRiskAssessments_noParams_returns200WithEmptyList() throws Exception {
    when(service.searchScalerRiskAssessments(
            isNull(), isNull(), isNull(), isNull(), isNull(),
            isNull(), isNull(), eq(1), eq(0)))
        .thenReturn(List.of());

    mockMvc.perform(get("/scaler-risk-assessments/search")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string("[]"));
  }

  @Test
  void getScalerRiskAssessment_found_returns200() throws Exception {
    when(service.getScalerRiskAssessment(42L)).thenReturn(stubDetail(42L));

    mockMvc.perform(get("/scaler-risk-assessments/42")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("LIC-42")));
  }

  @Test
  void getScalerRiskAssessment_notFound_returns404() throws Exception {
    when(service.getScalerRiskAssessment(999L))
        .thenThrow(new ResourceNotFoundException("Scaler risk assessment not found for id: 999"));

    mockMvc.perform(get("/scaler-risk-assessments/999")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  @Test
  void updateScalerRiskAssessment_valid_returns200() throws Exception {
    when(service.updateScalerRiskAssessment(eq(42L), any(RiskAssessmentUpdateCommand.class)))
        .thenReturn(stubDetail(42L));

    mockMvc.perform(put("/scaler-risk-assessments/42")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalSaveRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("LIC-42")));

    verify(service).updateScalerRiskAssessment(eq(42L), any(RiskAssessmentUpdateCommand.class));
  }

  @Test
  void updateScalerRiskAssessment_notFound_returns404() throws Exception {
    when(service.updateScalerRiskAssessment(eq(999L), any(RiskAssessmentUpdateCommand.class)))
        .thenThrow(new ResourceNotFoundException("Scaler risk assessment not found for id: 999"));

    mockMvc.perform(put("/scaler-risk-assessments/999")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalSaveRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  @Test
  void getScalerRiskAssessmentCreateInit_found_returns200() throws Exception {
    when(service.getScalerRiskAssessmentCreateInit("1234")).thenReturn(stubDetail(0L));

    mockMvc.perform(get("/scalers/1234/risk-assessments/create-init")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("LIC-0")));
  }

  @Test
  void getScalerRiskAssessmentCreateInit_scalerNotFound_returns404() throws Exception {
    when(service.getScalerRiskAssessmentCreateInit("9999"))
        .thenThrow(new ResourceNotFoundException("No scaler tombstone found for licence number 9999"));

    mockMvc.perform(get("/scalers/9999/risk-assessments/create-init")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  @Test
  void createScalerRiskAssessment_valid_returns201() throws Exception {
    when(service.createScalerRiskAssessment(eq("1234"), any(RiskAssessmentCreateCommand.class)))
        .thenReturn(stubDetail(55L));

    mockMvc.perform(post("/scalers/1234/risk-assessments")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalSaveRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("LIC-55")));

    verify(service).createScalerRiskAssessment(eq("1234"), any(RiskAssessmentCreateCommand.class));
  }

  @Test
  void createScalerRiskAssessment_scalerNotFound_returns404() throws Exception {
    when(service.createScalerRiskAssessment(eq("9999"), any(RiskAssessmentCreateCommand.class)))
        .thenThrow(new ResourceNotFoundException("No scaler tombstone found for licence number 9999"));

    mockMvc.perform(post("/scalers/9999/risk-assessments")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalSaveRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }
}
