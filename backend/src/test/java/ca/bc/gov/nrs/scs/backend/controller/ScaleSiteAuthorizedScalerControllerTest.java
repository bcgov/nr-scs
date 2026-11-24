package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.AuthorizedScalerSummary;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteAuthorizedScalerService;
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

class ScaleSiteAuthorizedScalerControllerTest {

  private ScaleSiteAuthorizedScalerService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = mock(ScaleSiteAuthorizedScalerService.class);

    ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleSiteAuthorizedScalerController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void getScaleSiteAuthorizedScalers_returns200AndBody() throws Exception {
    AuthorizedScalerSummary item = new AuthorizedScalerSummary();
    item.setScalerAuthorizationId(4001L);
    item.setScalerLicenceNo("1234");
    item.setClientName("DOE, JANE");
    item.setStatus("Active");
    item.setScalerAppointmentTypes("Owner, Acting");
    item.setAuthorizationEffectiveDate(LocalDate.of(2025, 1, 15));
    item.setAuthorizationExpiryDate(LocalDate.of(2027, 1, 15));
    item.setDistrictWideInd("N");
    when(service.getScaleSiteAuthorizedScalers("A12345")).thenReturn(List.of(item));

    mockMvc.perform(get("/scale-sites/A12345/authorized-scalers")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scalerAuthorizationId").value(4001))
        .andExpect(jsonPath("$[0].scalerLicenceNo").value("1234"))
        .andExpect(jsonPath("$[0].status").value("Active"));

    verify(service).getScaleSiteAuthorizedScalers("A12345");
  }

  @Test
  void getScaleSiteAuthorizedScalers_scaleSiteNotFound_returns404() throws Exception {
    when(service.getScaleSiteAuthorizedScalers("ZZZZZ"))
        .thenThrow(new ResourceNotFoundException("No scale site found with number ZZZZZ"));

    mockMvc.perform(get("/scale-sites/ZZZZZ/authorized-scalers")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }
}
