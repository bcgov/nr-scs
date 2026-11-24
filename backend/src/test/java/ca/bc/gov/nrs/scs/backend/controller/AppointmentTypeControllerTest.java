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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.AppointmentType;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.AppointmentTypeService;
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

class AppointmentTypeControllerTest {

  private AppointmentTypeService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(AppointmentTypeService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new AppointmentTypeController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void getAppointmentTypes_returns200AndDelegatesParams() throws Exception {
    AppointmentType row = stubAppointmentType();
    when(service.getAppointmentTypes(
        eq("ABCD"),
        eq("Acting"),
        eq("Y"),
        eq(LocalDate.of(2026, 1, 1)),
        eq(LocalDate.of(2026, 12, 31))))
        .thenReturn(List.of(row));

    mockMvc.perform(get("/appointment-types")
            .param("code", "ABCD")
            .param("description", "Acting")
            .param("actingInd", "Y")
            .param("effectiveDate", "2026-01-01")
            .param("expiryDate", "2026-12-31")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].code").value("ABCD"));

    verify(service).getAppointmentTypes(
        "ABCD",
        "Acting",
        "Y",
        LocalDate.of(2026, 1, 1),
        LocalDate.of(2026, 12, 31));
  }

  @Test
  void createAppointmentType_returns201() throws Exception {
    AppointmentTypeCreateRequest request = new AppointmentTypeCreateRequest();
    request.setCode("ABCD");
    request.setDescription("Acting");
    request.setActingInd(AppointmentTypeCreateRequest.ActingIndEnum.Y);
    request.setEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setExpiryDate(LocalDate.of(2026, 12, 31));

    AppointmentType created = stubAppointmentType();
    when(service.createAppointmentType(any(AppointmentTypeCreateRequest.class))).thenReturn(created);

    mockMvc.perform(post("/appointment-types")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.code").value("ABCD"));

    verify(service).createAppointmentType(any(AppointmentTypeCreateRequest.class));
  }

  @Test
  void createAppointmentType_overLengthDescription_surfacesSpecificServiceMessage() throws Exception {
    // Guards the fix end-to-end: the description schema carries NO maxLength, so a 121-char body
    // must pass bean validation and reach the service, letting its specific message surface as a
    // BAD_REQUEST — not the generic "One or more fields are invalid." VALIDATION_ERROR that a
    // re-added @Size(max=...) on the generated model would produce (which never calls the service).
    AppointmentTypeCreateRequest request = new AppointmentTypeCreateRequest();
    request.setCode("ABCD");
    request.setDescription("A".repeat(121));
    request.setActingInd(AppointmentTypeCreateRequest.ActingIndEnum.Y);
    request.setEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setExpiryDate(LocalDate.of(2026, 12, 31));

    when(service.createAppointmentType(any(AppointmentTypeCreateRequest.class)))
        .thenThrow(new BadRequestException("Appointment Description can not be greater than 120 characters."));

    mockMvc.perform(post("/appointment-types")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
        .andExpect(jsonPath("$.message").value("Appointment Description can not be greater than 120 characters."));

    verify(service).createAppointmentType(any(AppointmentTypeCreateRequest.class));
  }

  @Test
  void updateAppointmentType_returns200() throws Exception {
    AppointmentTypeUpdateRequest request = new AppointmentTypeUpdateRequest();
    request.setDescription("Updated");
    request.setActingInd(AppointmentTypeUpdateRequest.ActingIndEnum.N);
    request.setEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setExpiryDate(LocalDate.of(2026, 12, 31));

    when(service.updateAppointmentType(eq("ABCD"), any(AppointmentTypeUpdateRequest.class)))
        .thenReturn(stubAppointmentType());

    mockMvc.perform(put("/appointment-types/ABCD")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.code").value("ABCD"));

    verify(service).updateAppointmentType(eq("ABCD"), any(AppointmentTypeUpdateRequest.class));
  }

  @Test
  void updateAppointmentType_notFound_returns404() throws Exception {
    AppointmentTypeUpdateRequest request = new AppointmentTypeUpdateRequest();
    request.setDescription("Updated");
    request.setActingInd(AppointmentTypeUpdateRequest.ActingIndEnum.N);
    request.setEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setExpiryDate(LocalDate.of(2026, 12, 31));

    when(service.updateAppointmentType(eq("ABCD"), any(AppointmentTypeUpdateRequest.class)))
        .thenThrow(new ResourceNotFoundException("No appointment type found with code ABCD"));

    mockMvc.perform(put("/appointment-types/ABCD")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  void deleteAppointmentType_returns204() throws Exception {
    doNothing().when(service).deleteAppointmentType("ABCD");

    mockMvc.perform(delete("/appointment-types/ABCD"))
        .andExpect(status().isNoContent());

    verify(service).deleteAppointmentType("ABCD");
  }

  @Test
  void deleteAppointmentType_notFound_returns404() throws Exception {
    doThrow(new ResourceNotFoundException("No appointment type found with code ABCD"))
        .when(service).deleteAppointmentType("ABCD");

    mockMvc.perform(delete("/appointment-types/ABCD"))
        .andExpect(status().isNotFound());
  }

  private AppointmentType stubAppointmentType() {
    AppointmentType out = new AppointmentType();
    out.setCode("ABCD");
    out.setDescription("Acting");
    out.setActingInd(AppointmentType.ActingIndEnum.Y);
    out.setEffectiveDate(LocalDate.of(2026, 1, 1));
    out.setExpiryDate(LocalDate.of(2026, 12, 31));
    return out;
  }
}
