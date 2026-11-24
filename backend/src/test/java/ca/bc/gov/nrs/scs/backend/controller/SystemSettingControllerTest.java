package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.SystemSetting;
import ca.bc.gov.nrs.scs.backend.model.SystemSettingUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.SystemSettingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SystemSettingControllerTest {

  private SystemSettingService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(SystemSettingService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new SystemSettingController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void getSystemSetting_returns200() throws Exception {
    when(service.getSystemSetting("WMSG")).thenReturn(stubSystemSetting());

    mockMvc.perform(get("/system-settings/WMSG")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.settingKey").value("WMSG"))
        .andExpect(jsonPath("$.systemSettingValue")
            .value("<p>System maintenance scheduled for April 30.</p>"));

    verify(service).getSystemSetting("WMSG");
  }

  @Test
  void updateSystemSetting_returns200() throws Exception {
    SystemSettingUpdateRequest request = new SystemSettingUpdateRequest();
    request.setSystemSettingValue("<p>System maintenance scheduled for April 30.</p>");

    when(service.updateSystemSetting(eq("WMSG"), any(SystemSettingUpdateRequest.class)))
        .thenReturn(stubSystemSetting());

    mockMvc.perform(put("/system-settings/WMSG")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.settingKey").value("WMSG"))
        .andExpect(jsonPath("$.systemSettingValue")
            .value("<p>System maintenance scheduled for April 30.</p>"));

    verify(service).updateSystemSetting(eq("WMSG"), any(SystemSettingUpdateRequest.class));
  }

  @Test
  void updateSystemSetting_blank_returns400CleanBody() throws Exception {
    SystemSettingUpdateRequest request = new SystemSettingUpdateRequest();
    request.setSystemSettingValue("   ");

    when(service.updateSystemSetting(eq("WMSG"), any(SystemSettingUpdateRequest.class)))
        .thenThrow(new BadRequestException("Current News is required."));

    mockMvc.perform(put("/system-settings/WMSG")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
        .andExpect(jsonPath("$.message").value(Matchers.containsString("is required")));
  }

  @Test
  void updateSystemSetting_overLength_returns400CleanBody() throws Exception {
    SystemSettingUpdateRequest request = new SystemSettingUpdateRequest();
    request.setSystemSettingValue("<p>too long</p>");

    when(service.updateSystemSetting(eq("WMSG"), any(SystemSettingUpdateRequest.class)))
        .thenThrow(new BadRequestException(
            "Current News can not be greater than 4000 characters."));

    mockMvc.perform(put("/system-settings/WMSG")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
        .andExpect(jsonPath("$.message").value(Matchers.containsString("4000")));
  }

  @Test
  void getSystemSetting_notFound_returns404() throws Exception {
    when(service.getSystemSetting("WMSG"))
        .thenThrow(new ResourceNotFoundException("No system setting found for key WMSG"));

    mockMvc.perform(get("/system-settings/WMSG")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void updateSystemSetting_missingBody_returns400() throws Exception {
    mockMvc.perform(put("/system-settings/WMSG")
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
        .andExpect(jsonPath("$.message").value("Request body is required."));
  }

  private SystemSetting stubSystemSetting() {
    SystemSetting out = new SystemSetting();
    out.setSettingKey("WMSG");
    out.setDescription("Current News - Welcome Message for SCS Home Page");
    out.setSystemSettingValue("<p>System maintenance scheduled for April 30.</p>");
    return out;
  }
}
