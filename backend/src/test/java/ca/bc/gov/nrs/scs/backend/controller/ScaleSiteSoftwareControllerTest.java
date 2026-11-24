package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSoftwareSummary;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteSoftwareService;
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

class ScaleSiteSoftwareControllerTest {

  private ScaleSiteSoftwareService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = mock(ScaleSiteSoftwareService.class);

    ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleSiteSoftwareController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void getScaleSiteSoftware_returns200AndBody() throws Exception {
    ScaleSiteSoftwareSummary item = new ScaleSiteSoftwareSummary();
    item.setScalingProgram("HarvestPro");
    item.setVersion("12");
    item.setRevision("3");
    item.setReturnType("Weight");
    item.setReturnCount(42L);
    item.setLastUsedDate(LocalDate.of(2026, 6, 30));
    when(service.getScaleSiteSoftware("A12345")).thenReturn(List.of(item));

    mockMvc.perform(get("/scale-sites/A12345/software")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scalingProgram").value("HarvestPro"))
        .andExpect(jsonPath("$[0].returnCount").value(42))
        .andExpect(jsonPath("$[0].lastUsedDate").value("2026-06-30"));

    verify(service).getScaleSiteSoftware("A12345");
  }

  @Test
  void getScaleSiteSoftware_scaleSiteNotFound_returns404() throws Exception {
    when(service.getScaleSiteSoftware("ZZZZZ"))
        .thenThrow(new ResourceNotFoundException("No scale site found with number ZZZZZ"));

    mockMvc.perform(get("/scale-sites/ZZZZZ/software")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }
}
