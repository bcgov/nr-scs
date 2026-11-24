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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeDetail;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ValidLicenceAttributeService;
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

class ValidLicenceAttributeControllerTest {

  private ValidLicenceAttributeService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ValidLicenceAttributeService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ValidLicenceAttributeController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  private ValidLicenceAttributeDetail detail(String gradingCode, String appointmentType) {
    ValidLicenceAttributeDetail d = new ValidLicenceAttributeDetail();
    d.setScaleGradingSystemCode(JsonNullable.of(gradingCode));
    d.setScalerAppointmentType(JsonNullable.of(appointmentType));
    d.setEffectiveDate(JsonNullable.of(LocalDate.of(2024, 1, 1)));
    d.setDependentChildExists(JsonNullable.of(false));
    return d;
  }

  private ValidLicenceAttributeCreateRequest createRequest() {
    ValidLicenceAttributeCreateRequest req = new ValidLicenceAttributeCreateRequest(
        "BC",
        "O",
        LocalDate.of(2024, 1, 1));
    return req;
  }

  private ValidLicenceAttributeUpdateRequest updateRequest() {
    ValidLicenceAttributeUpdateRequest req = new ValidLicenceAttributeUpdateRequest(
        LocalDate.of(2024, 1, 1));
    req.setExpiryDate(JsonNullable.of(LocalDate.of(2026, 12, 31)));
    return req;
  }

  @Test
  void searchValidLicenceAttributes_returns200() throws Exception {
    when(service.searchValidLicenceAttributes(null, null))
        .thenReturn(List.of(detail("BC", "O")));

    mockMvc.perform(get("/valid-licence-attributes").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("BC")));

    verify(service).searchValidLicenceAttributes(null, null);
  }

  @Test
  void searchValidLicenceAttributes_withFilter_returns200() throws Exception {
    when(service.searchValidLicenceAttributes("BC", null))
        .thenReturn(List.of(detail("BC", "O")));

    mockMvc.perform(get("/valid-licence-attributes")
            .param("scaleGradingSystemCode", "BC")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("BC")));

    verify(service).searchValidLicenceAttributes("BC", null);
  }

  @Test
  void createValidLicenceAttribute_returns201() throws Exception {
    when(service.createValidLicenceAttribute(any(ValidLicenceAttributeCreateRequest.class)))
        .thenReturn(detail("BC", "O"));

    mockMvc.perform(post("/valid-licence-attributes")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(createRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("BC")));

    verify(service).createValidLicenceAttribute(any(ValidLicenceAttributeCreateRequest.class));
  }

  @Test
  void getValidLicenceAttribute_returns200() throws Exception {
    when(service.getValidLicenceAttribute("BC", "O"))
        .thenReturn(detail("BC", "O"));

    mockMvc.perform(get("/valid-licence-attributes/BC/O").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("BC")));

    verify(service).getValidLicenceAttribute("BC", "O");
  }

  @Test
  void getValidLicenceAttribute_notFound_returns404() throws Exception {
    when(service.getValidLicenceAttribute("XX", "Y"))
        .thenThrow(new ResourceNotFoundException("No valid licence attribute found for grading system 'XX' and appointment type 'Y'."));

    mockMvc.perform(get("/valid-licence-attributes/XX/Y").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  void updateValidLicenceAttribute_returns200() throws Exception {
    when(service.updateValidLicenceAttribute(eq("BC"), eq("O"), any(ValidLicenceAttributeUpdateRequest.class)))
        .thenReturn(detail("BC", "O"));

    mockMvc.perform(put("/valid-licence-attributes/BC/O")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(updateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("BC")));

    verify(service).updateValidLicenceAttribute(eq("BC"), eq("O"), any(ValidLicenceAttributeUpdateRequest.class));
  }

  @Test
  void updateValidLicenceAttribute_notFound_returns404() throws Exception {
    when(service.updateValidLicenceAttribute(eq("XX"), eq("Y"), any(ValidLicenceAttributeUpdateRequest.class)))
        .thenThrow(new ResourceNotFoundException("No valid licence attribute found for grading system 'XX' and appointment type 'Y'."));

    mockMvc.perform(put("/valid-licence-attributes/XX/Y")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(updateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  void deleteValidLicenceAttribute_returns204() throws Exception {
    doNothing().when(service).deleteValidLicenceAttribute("BC", "O");

    mockMvc.perform(delete("/valid-licence-attributes/BC/O").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    verify(service).deleteValidLicenceAttribute("BC", "O");
  }

  @Test
  void deleteValidLicenceAttribute_notFound_returns404() throws Exception {
    doThrow(new ResourceNotFoundException("No valid licence attribute found for grading system 'XX' and appointment type 'Y'."))
        .when(service).deleteValidLicenceAttribute("XX", "Y");

    mockMvc.perform(delete("/valid-licence-attributes/XX/Y").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  void deleteValidLicenceAttribute_withDependents_returns400() throws Exception {
    doThrow(new BadRequestException("The current record has been associated to a Scaler and cannot be deleted."))
        .when(service).deleteValidLicenceAttribute("BC", "O");

    mockMvc.perform(delete("/valid-licence-attributes/BC/O").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }
}
