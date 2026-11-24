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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ConditionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.LocalDate;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ConditionControllerTest {

  private ConditionService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ConditionService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ConditionController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private ScaleAuthConditionDetail stubDetail(Long id, String classCode) {
    ScaleAuthConditionDetail d = new ScaleAuthConditionDetail();
    d.setScaleAuthConditionId(id);
    d.setScaleConditionClassCode(classCode);
    d.setScaleAuthConditionTitle("Test Condition");
    d.setScaleAuthConditionDesc("Test description");
    d.setMinistryStandardInd("Y");
    d.setSortOrderNo(10);
    d.setEffectiveDate(LocalDate.of(2025, 1, 1));
    d.setDependentChildExists(false);
    return d;
  }

  private ScaleAuthConditionCreateRequest minimalCreateRequest() {
    ScaleAuthConditionCreateRequest req = new ScaleAuthConditionCreateRequest();
    req.setScaleConditionClassCode("MSD");
    req.setScaleAuthConditionTitle("Test Condition");
    req.setScaleAuthConditionDesc("Test description");
    req.setMinistryStandardInd("Y");
    req.setSortOrderNo(10);
    req.setEffectiveDate(LocalDate.of(2025, 1, 1));
    return req;
  }

  private ScaleAuthConditionUpdateRequest minimalUpdateRequest() {
    ScaleAuthConditionUpdateRequest req = new ScaleAuthConditionUpdateRequest();
    req.setScaleConditionClassCode("MSD");
    req.setScaleAuthConditionTitle("Updated Condition");
    req.setScaleAuthConditionDesc("Updated description");
    req.setMinistryStandardInd("N");
    req.setSortOrderNo(20);
    req.setEffectiveDate(LocalDate.of(2025, 1, 1));
    return req;
  }

  // ---------------------------------------------------------------------------
  // searchConditions
  // ---------------------------------------------------------------------------

  @Test
  void searchConditions_noParams_returns200WithList() throws Exception {
    ScaleAuthConditionDetail d1 = stubDetail(1L, "MSD");
    ScaleAuthConditionDetail d2 = stubDetail(2L, "SCA");
    when(service.searchConditions(null, null, null, null, null, null, null, null))
        .thenReturn(List.of(d1, d2));

    mockMvc.perform(get("/conditions").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2));
  }

  @Test
  void searchConditions_withParams_delegatesCorrectly() throws Exception {
    when(service.searchConditions(
        eq("MSD"), eq(5L), eq("Title"), eq("Desc"), eq("Y"),
        eq(10), eq(LocalDate.of(2025, 1, 1)), eq(LocalDate.of(2025, 12, 31))))
        .thenReturn(List.of(stubDetail(5L, "MSD")));

    mockMvc.perform(get("/conditions")
            .param("scaleConditionClassCode", "MSD")
            .param("scaleAuthConditionId", "5")
            .param("scaleAuthConditionTitle", "Title")
            .param("scaleAuthConditionDesc", "Desc")
            .param("ministryStandardInd", "Y")
            .param("sortOrderNo", "10")
            .param("effectiveDate", "2025-01-01")
            .param("expiryDate", "2025-12-31")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("MSD")));

    verify(service).searchConditions(
        eq("MSD"), eq(5L), eq("Title"), eq("Desc"), eq("Y"),
        eq(10), eq(LocalDate.of(2025, 1, 1)), eq(LocalDate.of(2025, 12, 31)));
  }

  @Test
  void searchConditions_emptyResult_returns200WithEmptyList() throws Exception {
    when(service.searchConditions(null, null, null, null, null, null, null, null))
        .thenReturn(List.of());

    mockMvc.perform(get("/conditions").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string("[]"));
  }

  // ---------------------------------------------------------------------------
  // createCondition
  // ---------------------------------------------------------------------------

  @Test
  void createCondition_validRequest_returns201() throws Exception {
    when(service.createCondition(any(ScaleAuthConditionCreateRequest.class)))
        .thenReturn(stubDetail(99L, "MSD"));

    mockMvc.perform(post("/conditions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.scaleAuthConditionId").value(99))
        .andExpect(jsonPath("$.scaleConditionClassCode").value("MSD"));

    verify(service).createCondition(any(ScaleAuthConditionCreateRequest.class));
  }

  @Test
  void createCondition_forScaleSite_withSiteMethodTypeCodes_returns201() throws Exception {
    ScaleAuthConditionCreateRequest req = minimalCreateRequest();
    req.setScaleConditionClassCode("SIA");
    req.setSiteMethodTypeCodes(List.of("FORS"));

    ScaleAuthConditionDetail created = stubDetail(100L, "SIA");
    created.setSiteMethodTypeCodes(List.of("FORS"));
    when(service.createCondition(any(ScaleAuthConditionCreateRequest.class))).thenReturn(created);

    mockMvc.perform(post("/conditions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(req))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.scaleConditionClassCode").value("SIA"));
  }

  // ---------------------------------------------------------------------------
  // getCondition
  // ---------------------------------------------------------------------------

  @Test
  void getCondition_found_returns200() throws Exception {
    when(service.getCondition("MSD", 1L)).thenReturn(stubDetail(1L, "MSD"));

    mockMvc.perform(get("/conditions/MSD/1").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scaleAuthConditionId").value(1))
        .andExpect(jsonPath("$.scaleConditionClassCode").value("MSD"));
  }

  @Test
  void getCondition_notFound_returns404() throws Exception {
    when(service.getCondition("MSD", 999L))
        .thenThrow(new ResourceNotFoundException("No condition found with id 999"));

    mockMvc.perform(get("/conditions/MSD/999").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  // ---------------------------------------------------------------------------
  // updateCondition
  // ---------------------------------------------------------------------------

  @Test
  void updateCondition_found_returns200() throws Exception {
    ScaleAuthConditionDetail updated = stubDetail(1L, "MSD");
    updated.setScaleAuthConditionTitle("Updated Condition");
    when(service.updateCondition(eq("MSD"), eq(1L), any(ScaleAuthConditionUpdateRequest.class)))
        .thenReturn(updated);

    mockMvc.perform(put("/conditions/MSD/1")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalUpdateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scaleAuthConditionTitle").value("Updated Condition"));

    verify(service).updateCondition(eq("MSD"), eq(1L), any(ScaleAuthConditionUpdateRequest.class));
  }

  @Test
  void updateCondition_notFound_returns404() throws Exception {
    when(service.updateCondition(eq("MSD"), eq(999L), any(ScaleAuthConditionUpdateRequest.class)))
        .thenThrow(new ResourceNotFoundException("No condition found with id 999"));

    mockMvc.perform(put("/conditions/MSD/999")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalUpdateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  // ---------------------------------------------------------------------------
  // deleteCondition
  // ---------------------------------------------------------------------------

  @Test
  void deleteCondition_found_returns204() throws Exception {
    doNothing().when(service).deleteCondition("MSD", 1L);

    mockMvc.perform(delete("/conditions/MSD/1"))
        .andDo(print())
        .andExpect(status().isNoContent());

    verify(service).deleteCondition("MSD", 1L);
  }

  @Test
  void deleteCondition_notFound_returns404() throws Exception {
    doThrow(new ResourceNotFoundException("No condition found with id 999"))
        .when(service).deleteCondition("MSD", 999L);

    mockMvc.perform(delete("/conditions/MSD/999"))
        .andDo(print())
        .andExpect(status().isNotFound());
  }
}

