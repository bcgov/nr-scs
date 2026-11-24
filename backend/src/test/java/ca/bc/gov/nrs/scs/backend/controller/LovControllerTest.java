package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictLov;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictRollupLov;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodTypeLov;
import ca.bc.gov.nrs.scs.backend.model.SpeciesProductGradeXref;
import ca.bc.gov.nrs.scs.backend.model.StaticLov;
import ca.bc.gov.nrs.scs.backend.service.LovService;
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

class LovControllerTest {

  private LovService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = org.mockito.Mockito.mock(LovService.class);

    ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders.standaloneSetup(new LovController(service))
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void getRegionDistrictLov_returns200AndBody() throws Exception {
    when(service.getRegionDistrictLov("DCC", "%Coast%"))
        .thenReturn(List.of(new RegionDistrictLov().code("DCC").description("Coast Area - Campbell River")));

    mockMvc.perform(get("/region-district-lov")
            .param("code", "DCC")
            .param("description", "%Coast%")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].code").value("DCC"))
        .andExpect(jsonPath("$[0].description").value("Coast Area - Campbell River"));

    verify(service).getRegionDistrictLov("DCC", "%Coast%");
  }

  @Test
  void getRegionDistrictRollupLov_returns200AndBody() throws Exception {
    when(service.getRegionDistrictRollupLov(171L, "%Island%", 1L))
        .thenReturn(List.of(new RegionDistrictRollupLov()
            .code(171L)
            .description("South Island District")
            .rollupRegionNo(1L)
            .orgUnitCode("DSI")));

    mockMvc.perform(get("/region-district-rollup-lov")
            .param("orgUnitNo", "171")
            .param("description", "%Island%")
            .param("rollupRegionNo", "1")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].code").value(171))
        .andExpect(jsonPath("$[0].description").value("South Island District"))
        .andExpect(jsonPath("$[0].rollupRegionNo").value(1))
        .andExpect(jsonPath("$[0].orgUnitCode").value("DSI"));

    verify(service).getRegionDistrictRollupLov(171L, "%Island%", 1L);
  }

  @Test
  void getAppointmentTypeLov_returns200AndBody() throws Exception {
    when(service.getAppointmentTypeLov("CS", "%Check%"))
        .thenReturn(List.of(new AppointmentTypeLov().code("CS").description("Check Scaler")));

    mockMvc.perform(get("/appointment-type-lov")
            .param("code", "CS")
            .param("description", "%Check%")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].code").value("CS"))
        .andExpect(jsonPath("$[0].description").value("Check Scaler"));

    verify(service).getAppointmentTypeLov("CS", "%Check%");
  }

  @Test
  void getScaleMethodTypeLov_returns200AndBody() throws Exception {
    when(service.getScaleMethodTypeLov("W", "%Weight%"))
        .thenReturn(List.of(new ScaleMethodTypeLov().code("W").description("Weight Scale")));

    mockMvc.perform(get("/scale-method-type-lov")
            .param("code", "W")
            .param("description", "%Weight%")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].code").value("W"))
        .andExpect(jsonPath("$[0].description").value("Weight Scale"));

    verify(service).getScaleMethodTypeLov("W", "%Weight%");
  }

  @Test
  void getStaticLov_forwardsTableKeyAndReturnsBody() throws Exception {
    when(service.getStaticLov("SCALE_GRADING_SYSTEM_CODE"))
        .thenReturn(List.of(new StaticLov()
            .tableKey("SCALE_GRADING_SYSTEM_CODE")
            .code("C")
            .description("Coastal")));

    mockMvc.perform(get("/static-lov")
            .param("tableKey", "SCALE_GRADING_SYSTEM_CODE")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].tableKey").value("SCALE_GRADING_SYSTEM_CODE"))
        .andExpect(jsonPath("$[0].code").value("C"))
        .andExpect(jsonPath("$[0].description").value("Coastal"));

    verify(service).getStaticLov("SCALE_GRADING_SYSTEM_CODE");
  }

  @Test
  void getSpeciesProductGradeXref_returns200AndBody() throws Exception {
    when(service.getSpeciesProductGradeXref())
        .thenReturn(List.of(new SpeciesProductGradeXref()
            .scaleSpeciesCode("FI")
            .scaleProductCode("XM")
            .scaleGradeCode("xmFI")));

    mockMvc.perform(get("/species-product-grade-xref-lov")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scaleSpeciesCode").value("FI"))
        .andExpect(jsonPath("$[0].scaleProductCode").value("XM"))
        .andExpect(jsonPath("$[0].scaleGradeCode").value("xmFI"));

    verify(service).getSpeciesProductGradeXref();
  }
}

