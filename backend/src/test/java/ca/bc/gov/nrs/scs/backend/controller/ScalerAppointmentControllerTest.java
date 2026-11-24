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

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentCommand;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ScalerAppointmentService;
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

class ScalerAppointmentControllerTest {

  private ScalerAppointmentService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScalerAppointmentService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScalerAppointmentController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  private ScalerAppointmentCreateRequest createRequest() {
    return new ScalerAppointmentCreateRequest(
        "O",
        "BC",
        ScalerAppointmentCreateRequest.ProvinceWideIndEnum.Y,
        LocalDate.of(2025, 1, 15));
  }

  private ScalerAppointmentUpdateRequest updateRequest() {
    ScalerAppointmentUpdateRequest request = new ScalerAppointmentUpdateRequest(
        "A",
        "BC",
        ScalerAppointmentUpdateRequest.ProvinceWideIndEnum.N,
        LocalDate.of(2025, 1, 15));
    request.setOrgUnitNo(JsonNullable.of(1234L));
    request.setExpiryDate(JsonNullable.of(LocalDate.of(2026, 1, 15)));
    request.setCancellationDate(JsonNullable.of(LocalDate.of(2025, 11, 1)));
    request.setCancellationReasonTxt(JsonNullable.of("Appointment superseded"));
    return request;
  }

  private ScalerAppointmentDetail detail(String licenceNo, long attributeId) {
    ScalerAppointmentDetail detail = new ScalerAppointmentDetail();
    detail.setScalerLicenceAttributeId(JsonNullable.of(attributeId));
    detail.setScalerLicenceNo(JsonNullable.of(licenceNo));
    detail.setScalerAppointmentType(JsonNullable.of("O"));
    detail.setScaleGradingSystemCode(JsonNullable.of("BC"));
    detail.setProvinceWideInd(JsonNullable.of(ScalerAppointmentDetail.ProvinceWideIndEnum.Y));
    detail.setIssuedDate(JsonNullable.of(LocalDate.of(2025, 1, 15)));
    return detail;
  }

  @Test
  void getScalerAppointments_returns200AndBody() throws Exception {
    when(service.getScalerAppointments("1234")).thenReturn(List.of(detail("1234", 5001L)));

    mockMvc.perform(get("/scalers/1234/appointments").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("5001")));

    verify(service).getScalerAppointments("1234");
  }

  @Test
  void createScalerAppointment_returns201() throws Exception {
    when(service.createScalerAppointment(eq("1234"), any(ScalerAppointmentCommand.class)))
        .thenReturn(detail("1234", 5001L));

    mockMvc.perform(post("/scalers/1234/appointments")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(createRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("5001")));

    verify(service).createScalerAppointment(eq("1234"), any(ScalerAppointmentCommand.class));
  }

  @Test
  void updateScalerAppointment_returns200() throws Exception {
    when(service.updateScalerAppointment(eq("1234"), eq(5001L), any(ScalerAppointmentCommand.class)))
        .thenReturn(detail("1234", 5001L));

    mockMvc.perform(put("/scalers/1234/appointments/5001")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(updateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("5001")));

    verify(service).updateScalerAppointment(eq("1234"), eq(5001L), any(ScalerAppointmentCommand.class));
  }

  @Test
  void deleteScalerAppointment_returns204() throws Exception {
    mockMvc.perform(delete("/scalers/1234/appointments/5001").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    verify(service).deleteScalerAppointment("1234", 5001L);
  }

  @Test
  void getScalerAppointments_notFound_returns404() throws Exception {
    when(service.getScalerAppointments("9999"))
        .thenThrow(new ResourceNotFoundException("No scaler found with licence number 9999"));

    mockMvc.perform(get("/scalers/9999/appointments").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }
}

