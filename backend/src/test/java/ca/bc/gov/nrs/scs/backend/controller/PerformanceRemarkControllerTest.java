package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.PerformanceRemarkService;
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

class PerformanceRemarkControllerTest {

  private PerformanceRemarkService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(PerformanceRemarkService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new PerformanceRemarkController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  private ScalerPerformanceRemarkDetail detail() {
    ScalerPerformanceRemarkDetail detail = new ScalerPerformanceRemarkDetail();
    detail.setScalerPerformanceRemarkId(JsonNullable.of(1001L));
    detail.setScalerLicenceNo(JsonNullable.of("1234"));
    detail.setLoggedTimestamp(JsonNullable.of(LocalDate.of(2025, 1, 10)));
    detail.setScalerPerformanceActnDescription(JsonNullable.of("Warning"));
    return detail;
  }

  @Test
  void getScalerPerformanceRemarks_returns200AndBody() throws Exception {
    when(service.getScalerPerformanceRemarks("1234")).thenReturn(List.of(detail()));

    mockMvc.perform(get("/scalers/1234/performance-remarks").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("Warning")));

    verify(service).getScalerPerformanceRemarks("1234");
  }

  @Test
  void getScalerPerformanceRemarks_notFound_returns404() throws Exception {
    when(service.getScalerPerformanceRemarks("9999"))
        .thenThrow(new ResourceNotFoundException("No scaler found with licence number 9999"));

    mockMvc.perform(get("/scalers/9999/performance-remarks").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  void createScalerPerformanceRemark_returns201AndBody() throws Exception {
    when(service.createScalerPerformanceRemark(eq("1234"), any())).thenReturn(detail());

    ScalerPerformanceRemarkCreateRequest request =
        new ScalerPerformanceRemarkCreateRequest(LocalDate.of(2025, 1, 10), "Late submission");
    request.setScalerPerformanceActnCode(JsonNullable.of("W"));

    mockMvc.perform(post("/scalers/1234/performance-remarks")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("Warning")));

    verify(service).createScalerPerformanceRemark(eq("1234"), any());
  }

  @Test
  void createScalerPerformanceRemark_validationFailure_returns400() throws Exception {
    when(service.createScalerPerformanceRemark(eq("1234"), any()))
        .thenThrow(new BadRequestException(
            "Either an action or an outcome must be selected, but not both."));

    ScalerPerformanceRemarkCreateRequest request =
        new ScalerPerformanceRemarkCreateRequest(LocalDate.of(2025, 1, 10), "Late submission");

    mockMvc.perform(post("/scalers/1234/performance-remarks")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void updateScalerPerformanceRemark_returns200AndBody() throws Exception {
    when(service.updateScalerPerformanceRemark(eq("1234"), eq(1001L), any())).thenReturn(detail());

    ScalerPerformanceRemarkUpdateRequest request =
        new ScalerPerformanceRemarkUpdateRequest(LocalDate.of(2025, 1, 10), "Late submission");
    request.setScalerPerformanceActnCode(JsonNullable.of("W"));

    mockMvc.perform(put("/scalers/1234/performance-remarks/1001")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("Warning")));

    verify(service).updateScalerPerformanceRemark(eq("1234"), eq(1001L), any());
  }

  @Test
  void updateScalerPerformanceRemark_notFound_returns404() throws Exception {
    when(service.updateScalerPerformanceRemark(eq("1234"), eq(1001L), any()))
        .thenThrow(new ResourceNotFoundException(
            "No performance remark found with id 1001 for scaler 1234"));

    ScalerPerformanceRemarkUpdateRequest request =
        new ScalerPerformanceRemarkUpdateRequest(LocalDate.of(2025, 1, 10), "Late submission");
    request.setScalerPerformanceActnCode(JsonNullable.of("W"));

    mockMvc.perform(put("/scalers/1234/performance-remarks/1001")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isNotFound());
  }

  @Test
  void updateScalerPerformanceRemark_validationFailure_returns400() throws Exception {
    when(service.updateScalerPerformanceRemark(eq("1234"), eq(1001L), any()))
        .thenThrow(new BadRequestException(
            "Either an action or an outcome must be selected, but not both."));

    ScalerPerformanceRemarkUpdateRequest request =
        new ScalerPerformanceRemarkUpdateRequest(LocalDate.of(2025, 1, 10), "Late submission");

    mockMvc.perform(put("/scalers/1234/performance-remarks/1001")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void deleteScalerPerformanceRemark_returns204() throws Exception {
    doNothing().when(service).deleteScalerPerformanceRemark("1234", 1001L);

    mockMvc.perform(delete("/scalers/1234/performance-remarks/1001"))
        .andExpect(status().isNoContent());

    verify(service).deleteScalerPerformanceRemark("1234", 1001L);
  }

  @Test
  void deleteScalerPerformanceRemark_notFound_returns404() throws Exception {
    doThrow(new ResourceNotFoundException(
            "No performance remark found with id 1001 for scaler 1234"))
        .when(service).deleteScalerPerformanceRemark("1234", 1001L);

    mockMvc.perform(delete("/scalers/1234/performance-remarks/1001"))
        .andExpect(status().isNotFound());
  }
}
