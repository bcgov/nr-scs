package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSite;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSitePriorityCode;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSearchCriteria;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.exception.UnprocessableEntityException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSummary;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSummarySiteType;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteTombstone;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScaleSiteControllerTest {

  private ScaleSiteService scaleSiteService;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    scaleSiteService = mock(ScaleSiteService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleSiteController(scaleSiteService))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void searchScaleSites_returns200() throws Exception {
    when(scaleSiteService.searchScaleSites(any(ScaleSiteSearchCriteria.class)))
        .thenReturn(List.of(new ScaleSiteSearchResult()
            .scaleSiteIdNmbr("SITE001")
            .siteName("MAIN YARD")
            .region("South Coast Natural Resource Region")));

    mockMvc.perform(get("/scale-sites/search")
            .param("scaleSiteIdNmbr", "SITE001")
            .param("orgUnitNo", "100")
            .param("siteName", "%MAIN%")
            .param("ownerClientNumber", "12345678")
            .param("ownerClientLocnCode", "00")
            .param("methodTypes", "W", "P")
            .param("primarySort", "1")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("SITE001")));
  }

  @Test
  void getScaleSiteTombstone_returns200() throws Exception {
    when(scaleSiteService.getScaleSiteTombstone("SITE001"))
        .thenReturn(new ScaleSiteTombstone("SITE001")
            .siteName("MAIN YARD")
            .regionName("South Coast Natural Resource Region")
            .districtName("South Island District"));

    mockMvc.perform(get("/scale-sites/SITE001/tombstone")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("MAIN YARD")))
        .andExpect(content().string(Matchers.containsString("South Island District")));
  }

  @Test
  void getScaleSiteSummary_returns200() throws Exception {
    when(scaleSiteService.getScaleSiteSummary("SITE001"))
        .thenReturn(new ScaleSiteSummary()
            .scaleSiteIdNmbr("SITE001")
            .siteName("MAIN YARD")
            .ownerClientNumber("12345678")
            .ownerClientLocnCode("00")
            .orgUnitNo(100L)
            .timberBrand("TB-123")
            .siteLocation("Nanaimo")
            .latitudeDegrees(49)
            .latitudeMinutes(10)
            .latitudeSeconds(22)
            .longitudeDegrees(123)
            .longitudeMinutes(56)
            .longitudeSeconds(31)
            .siteTypes(List.of(new ScaleSiteSummarySiteType()
                .priorityCode(ScaleSitePriorityCode.PRIMARY)
                .scaleMethodTypeCode("W"))));

    mockMvc.perform(get("/scale-sites/SITE001/summary")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("TB-123")))
        .andExpect(content().string(Matchers.containsString("\"scaleMethodTypeCode\":\"W\"")));
  }

  @Test
  void getScaleSiteTombstone_notFound_returns404() throws Exception {
    when(scaleSiteService.getScaleSiteTombstone("SITE001"))
        .thenThrow(new ResourceNotFoundException("No scale site tombstone found with scale site number SITE001"));

    mockMvc.perform(get("/scale-sites/SITE001/tombstone")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  void createScaleSite_returns201WithBody() throws Exception {
    when(scaleSiteService.createScaleSite(any(ScaleSite.class)))
        .thenReturn(new ScaleSiteSummary()
            .scaleSiteIdNmbr("SITE001")
            .siteName("MAIN YARD")
            .ownerClientNumber("12345678")
            .ownerClientLocnCode("00")
            .orgUnitNo(100L)
            .siteLocation("Nanaimo, BC")
            .siteTypes(List.of(new ScaleSiteSummarySiteType()
                .priorityCode(ScaleSitePriorityCode.PRIMARY)
                .scaleMethodTypeCode("W"))));

    mockMvc.perform(post("/scale-sites")
            .contentType(MediaType.APPLICATION_JSON)
            .content(VALID_CREATE_REQUEST_JSON)
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("\"scaleSiteIdNmbr\":\"SITE001\"")))
        .andExpect(content().string(Matchers.containsString("\"scaleMethodTypeCode\":\"W\"")));
  }

  @Test
  void createScaleSite_validationFailure_returns400() throws Exception {
    when(scaleSiteService.createScaleSite(any(ScaleSite.class)))
        .thenThrow(new BadRequestException("Site name is required."));

    mockMvc.perform(post("/scale-sites")
            .contentType(MediaType.APPLICATION_JSON)
            .content(VALID_CREATE_REQUEST_JSON)
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("\"code\":\"BAD_REQUEST\"")))
        .andExpect(content().string(Matchers.containsString("Site name is required.")));
  }

  @Test
  void createScaleSite_unprocessable_returns422() throws Exception {
    when(scaleSiteService.createScaleSite(any(ScaleSite.class)))
        .thenThrow(new UnprocessableEntityException("Owner client 12345678 / 00 does not exist."));

    mockMvc.perform(post("/scale-sites")
            .contentType(MediaType.APPLICATION_JSON)
            .content(VALID_CREATE_REQUEST_JSON)
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(content().string(Matchers.containsString("\"code\":\"UNPROCESSABLE_ENTITY\"")))
        .andExpect(content().string(Matchers.containsString("Owner client 12345678 / 00 does not exist.")));
  }

  @Test
  void createScaleSite_nullBody_returns400() throws Exception {
    mockMvc.perform(post("/scale-sites")
            .contentType(MediaType.APPLICATION_JSON)
            .content("null")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("Request body is required.")));
  }

  @Test
  void updateScaleSite_returns200WithBody() throws Exception {
    when(scaleSiteService.updateScaleSite(any(ScaleSite.class)))
        .thenReturn(new ScaleSiteSummary()
            .scaleSiteIdNmbr("SITE001")
            .siteName("MAIN YARD")
            .ownerClientNumber("12345678")
            .ownerClientLocnCode("00")
            .orgUnitNo(100L)
            .siteLocation("Nanaimo, BC")
            .siteTypes(List.of(new ScaleSiteSummarySiteType()
                .priorityCode(ScaleSitePriorityCode.PRIMARY)
                .scaleMethodTypeCode("W"))));

    mockMvc.perform(put("/scale-sites/SITE001")
            .contentType(MediaType.APPLICATION_JSON)
            .content(VALID_UPDATE_REQUEST_JSON)
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("\"scaleSiteIdNmbr\":\"SITE001\"")))
        .andExpect(content().string(Matchers.containsString("\"scaleMethodTypeCode\":\"W\"")));
  }

  @Test
  void updateScaleSite_validationFailure_returns400() throws Exception {
    when(scaleSiteService.updateScaleSite(any(ScaleSite.class)))
        .thenThrow(new BadRequestException("Site name is required."));

    mockMvc.perform(put("/scale-sites/SITE001")
            .contentType(MediaType.APPLICATION_JSON)
            .content(VALID_UPDATE_REQUEST_JSON)
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("\"code\":\"BAD_REQUEST\"")))
        .andExpect(content().string(Matchers.containsString("Site name is required.")));
  }

  @Test
  void updateScaleSite_notFound_returns404() throws Exception {
    when(scaleSiteService.updateScaleSite(any(ScaleSite.class)))
        .thenThrow(new ResourceNotFoundException("No scale site found with scale site number SITE001"));

    mockMvc.perform(put("/scale-sites/SITE001")
            .contentType(MediaType.APPLICATION_JSON)
            .content(VALID_UPDATE_REQUEST_JSON)
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(content().string(Matchers.containsString("No scale site found with scale site number SITE001")));
  }

  @Test
  void updateScaleSite_nullBody_returns400() throws Exception {
    mockMvc.perform(put("/scale-sites/SITE001")
            .contentType(MediaType.APPLICATION_JSON)
            .content("null")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("Request body is required.")));
  }

  @Test
  void updateScaleSite_unprocessable_returns422() throws Exception {
    when(scaleSiteService.updateScaleSite(any(ScaleSite.class)))
        .thenThrow(new UnprocessableEntityException("Owner client 12345678 / 00 does not exist."));

    mockMvc.perform(put("/scale-sites/SITE001")
            .contentType(MediaType.APPLICATION_JSON)
            .content(VALID_UPDATE_REQUEST_JSON)
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(content().string(Matchers.containsString("\"code\":\"UNPROCESSABLE_ENTITY\"")))
        .andExpect(content().string(Matchers.containsString("Owner client 12345678 / 00 does not exist.")));
  }

  private static final String VALID_UPDATE_REQUEST_JSON = ("""
      {
        "siteName": "MAIN YARD",
        "ownerClientNumber": "12345678",
        "ownerClientLocnCode": "00",
        "orgUnitNo": 100,
        "siteLocation": "Nanaimo, BC",
        "timberBrand": "ABC123",
        "latitude": { "degrees": 49, "minutes": 10, "seconds": 22 },
        "longitude": { "degrees": -123, "minutes": 56, "seconds": 31 },
        "scalingMethods": [
          { "scaleMethodTypeCode": "W", "scaleSitePriorityCode": "%s" },
          { "scaleMethodTypeCode": "P", "scaleSitePriorityCode": "%s" }
        ]
      }
      """).formatted(ScaleSitePriorityCode.PRIMARY, ScaleSitePriorityCode.SECONDARY);

  private static final String VALID_CREATE_REQUEST_JSON = ("""
      {
        "siteName": "MAIN YARD",
        "ownerClientNumber": "12345678",
        "ownerClientLocnCode": "00",
        "orgUnitNo": 100,
        "siteLocation": "Nanaimo, BC",
        "timberBrand": "ABC123",
        "latitude": { "degrees": 49, "minutes": 10, "seconds": 22 },
        "longitude": { "degrees": -123, "minutes": 56, "seconds": 31 },
        "scalingMethods": [
          { "scaleMethodTypeCode": "W", "scaleSitePriorityCode": "%s" },
          { "scaleMethodTypeCode": "P", "scaleSitePriorityCode": "%s" }
        ]
      }
      """).formatted(ScaleSitePriorityCode.PRIMARY, ScaleSitePriorityCode.SECONDARY);
}


