package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSummary;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteMarkSiteDesignationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScaleSiteMarkSiteDesignationControllerTest {

  private ScaleSiteMarkSiteDesignationService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = mock(ScaleSiteMarkSiteDesignationService.class);

    ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleSiteMarkSiteDesignationController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void getScaleSiteMarkSiteDesignations_returns200AndBody() throws Exception {
    MarkSiteDesignationSummary item = new MarkSiteDesignationSummary();
    item.setTimberMark("AB1234");
    item.setScaleSiteIdNmbr("A12345");
    item.setOwnerCliNumber("00012345");
    when(service.getScaleSiteMarkSiteDesignations("A12345")).thenReturn(List.of(item));

    mockMvc.perform(get("/scale-sites/A12345/mark-site-designations")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].timberMark").value("AB1234"))
        .andExpect(jsonPath("$[0].ownerCliNumber").value("00012345"));

    verify(service).getScaleSiteMarkSiteDesignations("A12345");
  }

  @Test
  void getScaleSiteMarkSiteDesignations_scaleSiteNotFound_returns404() throws Exception {
    when(service.getScaleSiteMarkSiteDesignations("ZZZZZ"))
        .thenThrow(new ResourceNotFoundException("No scale site found with number ZZZZZ"));

    mockMvc.perform(get("/scale-sites/ZZZZZ/mark-site-designations")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }
}
