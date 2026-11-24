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
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentResponseInput;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSaveRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteRiskAssessmentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.math.BigDecimal;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScaleSiteRiskAssessmentControllerTest {

  private ScaleSiteRiskAssessmentService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScaleSiteRiskAssessmentService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleSiteRiskAssessmentController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  private ScaleSiteRiskAssessmentSearchResult stubResult(Long id, String scaleSiteIdNmbr) {
    return new ScaleSiteRiskAssessmentSearchResult()
        .riskQuestionnaireId(id)
        .scaleSiteIdNmbr(scaleSiteIdNmbr)
        .riskRating(BigDecimal.valueOf(3.5))
        .riskTypeCode("MEDIUM");
  }

  private ScaleSiteRiskAssessmentDetail stubDetail(Long id) {
    return new ScaleSiteRiskAssessmentDetail()
        .riskQuestionnaireId(id)
        .scaleSiteIdNmbr("SITE001")
        .siteName("MAIN YARD")
        .templateId(7L)
        .comments("Test comment");
  }

  private RiskAssessmentSaveRequest minimalSaveRequest() {
    return new RiskAssessmentSaveRequest()
        .comments("Test comment")
        .responses(List.of(new RiskAssessmentResponseInput().questionId(11L).answerId(101L)));
  }

  @Test
  void getScaleSiteRiskAssessment_found_returns200() throws Exception {
    when(service.getScaleSiteRiskAssessment(42L)).thenReturn(stubDetail(42L));

    mockMvc.perform(get("/scale-site-risk-assessments/42")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("SITE001")));
  }

  @Test
  void getScaleSiteRiskAssessment_notFound_returns404() throws Exception {
    when(service.getScaleSiteRiskAssessment(999L))
        .thenThrow(new ResourceNotFoundException("Scale site risk assessment not found for id: 999"));

    mockMvc.perform(get("/scale-site-risk-assessments/999")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  @Test
  void updateScaleSiteRiskAssessment_valid_returns200() throws Exception {
    when(service.updateScaleSiteRiskAssessment(eq(42L), any(RiskAssessmentUpdateCommand.class)))
        .thenReturn(stubDetail(42L));

    mockMvc.perform(put("/scale-site-risk-assessments/42")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalSaveRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("SITE001")));

    verify(service).updateScaleSiteRiskAssessment(eq(42L), any(RiskAssessmentUpdateCommand.class));
  }

  @Test
  void updateScaleSiteRiskAssessment_notFound_returns404() throws Exception {
    when(service.updateScaleSiteRiskAssessment(eq(999L), any(RiskAssessmentUpdateCommand.class)))
        .thenThrow(new ResourceNotFoundException("Scale site risk assessment not found for id: 999"));

    mockMvc.perform(put("/scale-site-risk-assessments/999")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalSaveRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  @Test
  void searchScaleSiteRiskAssessments_smoke_returns200() throws Exception {
    when(service.searchScaleSiteRiskAssessments(
            eq("100"), eq("MEDIUM"), eq("Y"), eq("SITE001"), eq(10L),
            any(), eq("Test%"), eq("12345678"), eq("00"), eq(1), eq(0)))
        .thenReturn(List.of(stubResult(100L, "SITE001")));

    mockMvc.perform(get("/scale-site-risk-assessments/search")
            .param("riskQuestionnaireId", "100")
            .param("riskTypeCode", "MEDIUM")
            .param("completeInd", "Y")
            .param("scaleSiteIdNmbr", "SITE001")
            .param("orgUnitNo", "10")
            .param("methodTypes", "W", "P")
            .param("siteName", "Test%")
            .param("ownerClientNumber", "12345678")
            .param("ownerClientLocnCode", "00")
            .param("primarySort", "1")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("SITE001")));

    verify(service).searchScaleSiteRiskAssessments(
        eq("100"), eq("MEDIUM"), eq("Y"), eq("SITE001"), eq(10L),
        any(), eq("Test%"), eq("12345678"), eq("00"), eq(1), eq(0));
  }

  @Test
  void searchScaleSiteRiskAssessments_noParams_returns200WithEmptyList() throws Exception {
    when(service.searchScaleSiteRiskAssessments(
            isNull(), isNull(), isNull(), isNull(), isNull(),
            isNull(), isNull(), isNull(), isNull(), eq(1), eq(0)))
        .thenReturn(List.of());

    mockMvc.perform(get("/scale-site-risk-assessments/search")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string("[]"));
  }

  @Test
  void getScaleSiteRiskAssessmentCreateInit_found_returns200() throws Exception {
    when(service.getScaleSiteRiskAssessmentCreateInit("123")).thenReturn(stubDetail(0L));

    mockMvc.perform(get("/scale-sites/123/risk-assessments/create-init")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("SITE001")));
  }

  @Test
  void getScaleSiteRiskAssessmentCreateInit_scaleSiteNotFound_returns404() throws Exception {
    when(service.getScaleSiteRiskAssessmentCreateInit("9999"))
        .thenThrow(new ResourceNotFoundException("No scale site tombstone found for scale site id 9999"));

    mockMvc.perform(get("/scale-sites/9999/risk-assessments/create-init")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  @Test
  void createScaleSiteRiskAssessment_valid_returns201() throws Exception {
    when(service.createScaleSiteRiskAssessment(eq("123"), any(RiskAssessmentCreateCommand.class)))
        .thenReturn(stubDetail(55L));

    mockMvc.perform(post("/scale-sites/123/risk-assessments")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalSaveRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("SITE001")));

    verify(service).createScaleSiteRiskAssessment(eq("123"), any(RiskAssessmentCreateCommand.class));
  }

  @Test
  void createScaleSiteRiskAssessment_scaleSiteNotFound_returns404() throws Exception {
    when(service.createScaleSiteRiskAssessment(eq("9999"), any(RiskAssessmentCreateCommand.class)))
        .thenThrow(new ResourceNotFoundException("No scale site tombstone found for scale site id 9999"));

    mockMvc.perform(post("/scale-sites/9999/risk-assessments")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalSaveRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }
}
