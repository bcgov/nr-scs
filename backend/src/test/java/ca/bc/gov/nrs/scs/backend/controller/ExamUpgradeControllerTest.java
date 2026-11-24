package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgrade;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ExamUpgradeService;
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

class ExamUpgradeControllerTest {

  private ExamUpgradeService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ExamUpgradeService.class);

    // Mirror WebConfig's ObjectMapper so JsonNullable and date types work in tests
    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ExamUpgradeController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private ExamUpgradeCreateRequest stubCreateRequest() {
    ExamUpgradeCreateRequest req = new ExamUpgradeCreateRequest();
    req.setScalerTrainingClassCode("EXAM");
    req.setLicenceAccreditInd("Y");
    req.setDescription("Test exam upgrade");
    req.setEffectiveDate(LocalDate.of(2025, 1, 1));
    return req;
  }

  private ExamUpgrade stubExamUpgrade(String classCode, String typeId) {
    ExamUpgrade eu = new ExamUpgrade();
    eu.setScalerTrainingClassCode(classCode);
    eu.setScalerTrainingTypeId(typeId);
    eu.setDescription("Test exam upgrade");
    eu.setLicenceAccreditInd("Y");
    eu.setEffectiveDate(LocalDate.of(2025, 1, 1));
    return eu;
  }

  // ---------------------------------------------------------------------------
  // GET /exam-upgrades
  // ---------------------------------------------------------------------------

  @Test
  void listExamUpgrades_noFilter_returns200WithList() throws Exception {
    when(service.getAllExamUpgrades(isNull())).thenReturn(List.of(stubExamUpgrade("EXAM", "001")));

    mockMvc.perform(get("/exam-upgrades").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("001")));
  }

  @Test
  void listExamUpgrades_withClassCodeFilter_passesParamToService() throws Exception {
    when(service.getAllExamUpgrades("EXAM")).thenReturn(List.of(stubExamUpgrade("EXAM", "001")));

    mockMvc.perform(get("/exam-upgrades")
            .param("classCode", "EXAM")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("EXAM")));

    verify(service).getAllExamUpgrades("EXAM");
  }

  // ---------------------------------------------------------------------------
  // GET /exam-upgrades/{classCode}/{typeId}
  // ---------------------------------------------------------------------------

  @Test
  void getExamUpgrade_found_returns200() throws Exception {
    when(service.getExamUpgrade("EXAM", "001"))
      .thenReturn(stubExamUpgrade("EXAM", "001"));

    mockMvc.perform(get("/exam-upgrades/EXAM/001").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("001")));
  }

  @Test
  void getExamUpgrade_notFound_returns404() throws Exception {
    when(service.getExamUpgrade("EXAM", "XXXX"))
      .thenThrow(new ResourceNotFoundException("No exam/upgrade found with class code 'EXAM' and type id 'XXXX'."));

    mockMvc.perform(get("/exam-upgrades/EXAM/XXXX").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
      .andExpect(status().isNotFound())
      .andExpect(content().string(Matchers.containsString("No exam/upgrade found")));
  }

  // ---------------------------------------------------------------------------
  // POST /exam-upgrades
  // ---------------------------------------------------------------------------

  @Test
  void createExamUpgrade_valid_returns201() throws Exception {
    ExamUpgrade response = stubExamUpgrade("EXAM", "001");
    when(service.createExamUpgrade(any(ExamUpgradeCreateRequest.class))).thenReturn(response);

    mockMvc.perform(post("/exam-upgrades")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("001")));

    verify(service).createExamUpgrade(any(ExamUpgradeCreateRequest.class));
  }

  @Test
  void createExamUpgrade_serviceThrowsBadRequest_returns400() throws Exception {
    when(service.createExamUpgrade(any(ExamUpgradeCreateRequest.class)))
        .thenThrow(new BadRequestException("scalerTrainingClassCode is required"));

    mockMvc.perform(post("/exam-upgrades")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());
  }

  // ---------------------------------------------------------------------------
  // PUT /exam-upgrades/{classCode}/{typeId}
  // ---------------------------------------------------------------------------

  @Test
  void updateExamUpgrade_valid_returns200() throws Exception {
    ExamUpgradeUpdateRequest payload = new ExamUpgradeUpdateRequest();
    payload.setLicenceAccreditInd("Y");
    payload.setDescription("Test exam upgrade");
    payload.setEffectiveDate(LocalDate.of(2025, 1, 1));

    when(service.updateExamUpgrade(eq("EXAM"), eq("001"), any(ExamUpgradeUpdateRequest.class)))
        .thenReturn(stubExamUpgrade("EXAM", "001"));

    mockMvc.perform(put("/exam-upgrades/EXAM/001")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(payload))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("001")));

      verify(service).updateExamUpgrade(eq("EXAM"), eq("001"), any(ExamUpgradeUpdateRequest.class));
  }

  // ---------------------------------------------------------------------------
  // DELETE /exam-upgrades/{classCode}/{typeId}
  // ---------------------------------------------------------------------------

  @Test
  void deleteExamUpgrade_returns204() throws Exception {
    mockMvc.perform(delete("/exam-upgrades/EXAM/001"))
        .andDo(print())
        .andExpect(status().isNoContent());

    verify(service).deleteExamUpgrade("EXAM", "001");
  }
}
