package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteActivitySummary;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteActivityService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScaleSiteActivityControllerTest {

  private ScaleSiteActivityService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScaleSiteActivityService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleSiteActivityController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  private ScaleSiteActivitySummary stubSummary(String siteId) {
    ScaleSiteActivitySummary summary = new ScaleSiteActivitySummary();
    summary.setScaleSiteIdNmbr(siteId);
    summary.setLastScaleDate(JsonNullable.of(LocalDate.of(2024, 9, 15)));
    summary.setNumberOfSamples(JsonNullable.of(42L));
    summary.setSampleVolume(JsonNullable.of(new BigDecimal("1234.56")));
    summary.setScaledVolume(JsonNullable.of(new BigDecimal("98765.43")));
    return summary;
  }

  @Test
  void getScaleSiteActivitySummary_returns200WithSummary() throws Exception {
    when(service.getActivitySummary("1234")).thenReturn(stubSummary("1234"));

    mockMvc.perform(get("/scale-sites/1234/activity-summary").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("98765.43")))
        .andExpect(content().string(Matchers.containsString("2024-09-15")));
  }

  @Test
  void getScaleSiteActivitySummary_scaleSiteNotFound_returns404() throws Exception {
    when(service.getActivitySummary("9999"))
        .thenThrow(new ResourceNotFoundException("No scale site found with id 9999."));

    mockMvc.perform(get("/scale-sites/9999/activity-summary").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound())
        .andExpect(content().string(Matchers.containsString("No scale site found")));
  }
}
