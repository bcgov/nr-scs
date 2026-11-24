package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskRatingSummary;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteRiskRatingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.math.BigDecimal;
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

class ScaleSiteRiskRatingControllerTest {

  private ScaleSiteRiskRatingService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = mock(ScaleSiteRiskRatingService.class);

    ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleSiteRiskRatingController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  private ScaleSiteRiskRatingSummary summary() {
    ScaleSiteRiskRatingSummary row = new ScaleSiteRiskRatingSummary();
    row.setRiskQuestionnaireId(JsonNullable.of(12345L));
    row.setRiskRating(JsonNullable.of(new BigDecimal("24")));
    row.setCodeDescription(JsonNullable.of("High"));
    row.setRatingDescription(JsonNullable.of("2 checks every 12 months"));
    return row;
  }

  @Test
  void getScaleSiteRiskRatings_returns200AndBody() throws Exception {
    when(service.getScaleSiteRiskRatings("A12345")).thenReturn(List.of(summary()));

    mockMvc.perform(get("/scale-sites/A12345/risk-ratings").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("2 checks every 12 months")));

    verify(service).getScaleSiteRiskRatings("A12345");
  }

  @Test
  void getScaleSiteRiskRatings_notFound_returns404() throws Exception {
    when(service.getScaleSiteRiskRatings("9999"))
        .thenThrow(new ResourceNotFoundException("No scale site found with number 9999"));

    mockMvc.perform(get("/scale-sites/9999/risk-ratings").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }
}
