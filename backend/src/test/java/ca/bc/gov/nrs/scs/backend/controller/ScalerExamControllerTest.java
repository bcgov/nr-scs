package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamCommand;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamRequest;
import ca.bc.gov.nrs.scs.backend.service.ScalerExamService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.LocalDate;
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

class ScalerExamControllerTest {

  private ScalerExamService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScalerExamService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScalerExamController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  private ScalerExamRequest request() {
    return new ScalerExamRequest("SCEX").completionDate(LocalDate.of(2025, 1, 10));
  }

  private ScalerExamDetail detail(String licenceNo, String typeId) {
    ScalerExamDetail detail = new ScalerExamDetail();
    detail.setScalerLicenceNo(JsonNullable.of(licenceNo));
    detail.setScalerTrainingTypeId(JsonNullable.of(typeId));
    detail.setScalerTrainingClassCode(JsonNullable.of("SC"));
    detail.setCompletionDate(JsonNullable.of(LocalDate.of(2025, 1, 10)));
    return detail;
  }

  @Test
  void getScalerExams_returns200AndBody() throws Exception {
    when(service.getScalerExams("1234")).thenReturn(List.of(detail("1234", "SCEX")));

    mockMvc.perform(get("/scalers/1234/exams").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("SCEX")));

    verify(service).getScalerExams("1234");
  }

  @Test
  void createScalerExam_returns201() throws Exception {
    when(service.createScalerExam(eq("1234"), any(ScalerExamCommand.class)))
        .thenReturn(detail("1234", "SCEX"));

    mockMvc.perform(post("/scalers/1234/exams")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request()))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("SCEX")));

    verify(service).createScalerExam(eq("1234"), any(ScalerExamCommand.class));
  }

  @Test
  void updateScalerExam_returns200() throws Exception {
    when(service.updateScalerExam(eq("1234"), eq("SCEX"), any(ScalerExamCommand.class)))
        .thenReturn(detail("1234", "SCEX"));

    mockMvc.perform(put("/scalers/1234/exams/SCEX")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request()))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("SCEX")));

    verify(service).updateScalerExam(eq("1234"), eq("SCEX"), any(ScalerExamCommand.class));
  }

  @Test
  void deleteScalerExam_returns204() throws Exception {
    mockMvc.perform(delete("/scalers/1234/exams/SCEX").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    verify(service).deleteScalerExam("1234", "SCEX");
  }

  @Test
  void getScalerExams_notFound_returns404() throws Exception {
    when(service.getScalerExams("9999"))
        .thenThrow(new ResourceNotFoundException("No scaler found with licence number 9999"));

    mockMvc.perform(get("/scalers/9999/exams").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }
}
