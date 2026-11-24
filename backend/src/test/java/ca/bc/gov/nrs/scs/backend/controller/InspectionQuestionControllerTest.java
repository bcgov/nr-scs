package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionDetail;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionSummary;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.InspectionQuestionService;
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

class InspectionQuestionControllerTest {

  private InspectionQuestionService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(InspectionQuestionService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new InspectionQuestionController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private InspectionQuestionSummary stubSummary(Long id, String questionText) {
    InspectionQuestionSummary s = new InspectionQuestionSummary();
    s.setInspectionQuestionId(id);
    s.setQuestionText(questionText);
    s.setCommentRequiredInd("N");
    s.setSortOrderNo(10);
    s.setEffectiveDate(LocalDate.of(2025, 1, 1));
    s.setInspectionTypeCodes(List.of("PRE"));
    return s;
  }

  private InspectionQuestionDetail stubDetail(Long id, String questionText) {
    InspectionQuestionDetail d = new InspectionQuestionDetail();
    d.setInspectionQuestionId(id);
    d.setQuestionText(questionText);
    d.setCommentRequiredInd("N");
    d.setSortOrderNo(10);
    d.setEffectiveDate(LocalDate.of(2025, 1, 1));
    d.setExpiryDate(LocalDate.of(2025, 12, 31));
    d.setInspectionTypeCodes(List.of("PRE"));
    d.setScalingMethodTypeCodes(List.of("WT"));
    d.setValidResponseCodes(List.of("Y", "N"));
    d.setQuestionUsed(false);
    return d;
  }

  private InspectionQuestionCreateRequest minimalCreateRequest() {
    InspectionQuestionCreateRequest req = new InspectionQuestionCreateRequest();
    req.setQuestionText("Is the load secure?");
    req.setCommentRequiredInd("N");
    req.setSortOrderNo(10);
    req.setEffectiveDate(LocalDate.of(2025, 1, 1));
    req.setExpiryDate(LocalDate.of(2025, 12, 31));
    req.setInspectionTypeCodes(List.of("PRE"));
    req.setScalingMethodTypeCodes(List.of("WT"));
    req.setValidResponseCodes(List.of("Y", "N"));
    return req;
  }

  private InspectionQuestionUpdateRequest minimalUpdateRequest() {
    InspectionQuestionUpdateRequest req = new InspectionQuestionUpdateRequest();
    req.setQuestionText("Updated question?");
    req.setCommentRequiredInd("Y");
    req.setSortOrderNo(20);
    req.setEffectiveDate(LocalDate.of(2025, 1, 1));
    req.setExpiryDate(LocalDate.of(2025, 12, 31));
    req.setInspectionTypeCodes(List.of("PRE"));
    req.setScalingMethodTypeCodes(List.of("WT"));
    req.setValidResponseCodes(List.of("Y", "N"));
    return req;
  }

  // ---------------------------------------------------------------------------
  // searchInspectionQuestions
  // ---------------------------------------------------------------------------

  @Test
  void searchInspectionQuestions_noParams_returns200WithList() throws Exception {
    when(service.searchQuestions(null, null, null, null, null, null))
        .thenReturn(List.of(stubSummary(1L, "Q1"), stubSummary(2L, "Q2")));

    mockMvc.perform(get("/inspection-questions").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2));
  }

  @Test
  void searchInspectionQuestions_withAllParams_delegates() throws Exception {
    when(service.searchQuestions(
        eq(5L), eq("Text"), eq("Y"), eq(10),
        eq(LocalDate.of(2025, 1, 1)), eq(LocalDate.of(2025, 12, 31))))
        .thenReturn(List.of(stubSummary(5L, "Text")));

    mockMvc.perform(get("/inspection-questions")
            .param("inspectionQuestionId", "5")
            .param("questionText", "Text")
            .param("commentRequiredInd", "Y")
            .param("sortOrderNo", "10")
            .param("effectiveDate", "2025-01-01")
            .param("expiryDate", "2025-12-31")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].inspectionQuestionId").value(5));

    verify(service).searchQuestions(
        eq(5L), eq("Text"), eq("Y"), eq(10),
        eq(LocalDate.of(2025, 1, 1)), eq(LocalDate.of(2025, 12, 31)));
  }

  @Test
  void searchInspectionQuestions_emptyResult_returns200EmptyArray() throws Exception {
    when(service.searchQuestions(null, null, null, null, null, null))
        .thenReturn(List.of());

    mockMvc.perform(get("/inspection-questions").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  // ---------------------------------------------------------------------------
  // getInspectionQuestion
  // ---------------------------------------------------------------------------

  @Test
  void getInspectionQuestion_found_returns200() throws Exception {
    when(service.getQuestion(1L)).thenReturn(stubDetail(1L, "Is the load secure?"));

    mockMvc.perform(get("/inspection-questions/1").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.inspectionQuestionId").value(1))
        .andExpect(jsonPath("$.questionText").value("Is the load secure?"));
  }

  @Test
  void getInspectionQuestion_notFound_returns404() throws Exception {
    when(service.getQuestion(999L))
        .thenThrow(new ResourceNotFoundException("No inspection question found with id 999"));

    mockMvc.perform(get("/inspection-questions/999").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  // ---------------------------------------------------------------------------
  // createInspectionQuestion
  // ---------------------------------------------------------------------------

  @Test
  void createInspectionQuestion_valid_returns201() throws Exception {
    when(service.createQuestion(any(InspectionQuestionCreateRequest.class)))
        .thenReturn(stubDetail(99L, "Is the load secure?"));

    mockMvc.perform(post("/inspection-questions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.inspectionQuestionId").value(99))
        .andExpect(jsonPath("$.questionText").value("Is the load secure?"));

    verify(service).createQuestion(any(InspectionQuestionCreateRequest.class));
  }

  @Test
  void createInspectionQuestion_serviceBadRequest_returns400() throws Exception {
    when(service.createQuestion(any(InspectionQuestionCreateRequest.class)))
        .thenThrow(new BadRequestException("At least one inspection type is required."));

    mockMvc.perform(post("/inspection-questions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
        .andExpect(jsonPath("$.message").value("At least one inspection type is required."));
  }

  // ---------------------------------------------------------------------------
  // updateInspectionQuestion
  // ---------------------------------------------------------------------------

  @Test
  void updateInspectionQuestion_found_returns200() throws Exception {
    InspectionQuestionDetail updated = stubDetail(1L, "Updated question?");
    when(service.updateQuestion(eq(1L), any(InspectionQuestionUpdateRequest.class)))
        .thenReturn(updated);

    mockMvc.perform(put("/inspection-questions/1")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalUpdateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.questionText").value("Updated question?"));

    verify(service).updateQuestion(eq(1L), any(InspectionQuestionUpdateRequest.class));
  }

  @Test
  void updateInspectionQuestion_notFound_returns404() throws Exception {
    when(service.updateQuestion(eq(999L), any(InspectionQuestionUpdateRequest.class)))
        .thenThrow(new ResourceNotFoundException("No inspection question found with id 999"));

    mockMvc.perform(put("/inspection-questions/999")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalUpdateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  // ---------------------------------------------------------------------------
  // deleteInspectionQuestion
  // ---------------------------------------------------------------------------

  @Test
  void deleteInspectionQuestion_found_returns204() throws Exception {
    doNothing().when(service).deleteQuestion(1L);

    mockMvc.perform(delete("/inspection-questions/1"))
        .andDo(print())
        .andExpect(status().isNoContent());

    verify(service).deleteQuestion(1L);
  }

  @Test
  void deleteInspectionQuestion_notFound_returns404() throws Exception {
    doThrow(new ResourceNotFoundException("No inspection question found with id 999"))
        .when(service).deleteQuestion(999L);

    mockMvc.perform(delete("/inspection-questions/999"))
        .andDo(print())
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void deleteInspectionQuestion_used_returns400() throws Exception {
    doThrow(new BadRequestException(
        "This question has been used in an inspection and cannot be deleted."))
        .when(service).deleteQuestion(1L);

    mockMvc.perform(delete("/inspection-questions/1"))
        .andDo(print())
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
        .andExpect(jsonPath("$.message")
            .value("This question has been used in an inspection and cannot be deleted."));
  }
}
