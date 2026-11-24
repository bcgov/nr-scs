package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.domain.workbench.MarkSiteDesignationSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.workbench.ScaleSiteAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.workbench.ScalerAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.AuthorizationRenewResult;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.service.WorkbenchService;
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

class WorkbenchControllerTest {

  private WorkbenchService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = mock(WorkbenchService.class);

    ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new WorkbenchController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  // ─── Renewal ─────────────────────────────────────────────────────────────────

  @Test
  void renewScalerAuthorization_returns200AndBody() throws Exception {
    when(service.renewScalerAuthorization(12345L))
        .thenReturn(new AuthorizationRenewResult().newAuthorizationId(98765L));

    mockMvc.perform(post("/scaler-authorizations/12345/renew")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.newAuthorizationId").value(98765));
  }

  @Test
  void renewScaleSiteAuthorization_returns200AndBody() throws Exception {
    when(service.renewScaleSiteAuthorization(12345L))
        .thenReturn(new AuthorizationRenewResult().newAuthorizationId(98765L));

    mockMvc.perform(post("/scale-site-authorizations/12345/renew")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.newAuthorizationId").value(98765));
  }

  @Test
  void renewMarkSiteDesignation_returns200AndBody() throws Exception {
    when(service.renewMarkSiteDesignation(12345L))
        .thenReturn(new AuthorizationRenewResult().newAuthorizationId(98765L));

    mockMvc.perform(post("/mark-site-designations/12345/renew")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.newAuthorizationId").value(98765));
  }

  @Test
  void renewScalerAuthorization_noNewId_returns200WithEmptyBody() throws Exception {
    when(service.renewScalerAuthorization(12345L))
        .thenReturn(new AuthorizationRenewResult());

    mockMvc.perform(post("/scaler-authorizations/12345/renew")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.newAuthorizationId").doesNotExist());
  }

  @Test
  void renewScaleSiteAuthorization_notFound_returns404() throws Exception {
    when(service.renewScaleSiteAuthorization(9999L))
        .thenThrow(new ResourceNotFoundException("No scale site authorization found with id 9999"));

    mockMvc.perform(post("/scale-site-authorizations/9999/renew")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  // ─── Scaler grid ─────────────────────────────────────────────────────────────

  @Test
  void searchScalerAuthorizations_returns200AndBody() throws Exception {
    when(service.searchScalerAuthorizations(
        new ScalerAuthorizationWorkbenchSearchCriteria(
            12345L, LocalDate.of(2025, 1, 1), LocalDate.of(2025, 12, 31),
            "SC1234", 1L, 10L, "Jane Doe", 1, 0)))
        .thenReturn(List.of(new ScalerAuthorizationWorkbenchResult()
            .scalerAuthorizationId(12345L)
            .scalerLicenceNumber("SC1234")
            .scalerName("Jane Doe")));

    mockMvc.perform(get("/scaler-authorizations/workbench")
            .param("scalerAuthorizationId", "12345")
            .param("effectiveDate", "2025-01-01")
            .param("expiryDate", "2025-12-31")
            .param("scalerLicenceNumber", "SC1234")
            .param("regionId", "1")
            .param("districtId", "10")
            .param("scalerName", "Jane Doe")
            .param("primarySort", "1")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scalerAuthorizationId").value(12345))
        .andExpect(jsonPath("$[0].scalerLicenceNumber").value("SC1234"))
        .andExpect(jsonPath("$[0].scalerName").value("Jane Doe"));
  }

  @Test
  void searchScalerAuthorizations_withoutSortParams_delegatesNullSorts() throws Exception {
    when(service.searchScalerAuthorizations(
            new ScalerAuthorizationWorkbenchSearchCriteria(
                null, null, null, null, null, null, null, null, null)))
        .thenReturn(List.of());

    mockMvc.perform(get("/scaler-authorizations/workbench")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchScalerAuthorizations(
        new ScalerAuthorizationWorkbenchSearchCriteria(
            null, null, null, null, null, null, null, null, null));
  }

  @Test
  void searchScalerAuthorizations_badRequest_returns400() throws Exception {
    when(service.searchScalerAuthorizations(
            new ScalerAuthorizationWorkbenchSearchCriteria(
                null, null, null, null, null, null, null, 99, 0)))
        .thenThrow(new BadRequestException("Invalid sort value: 99"));

    mockMvc.perform(get("/scaler-authorizations/workbench")
            .param("primarySort", "99")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }

  // ─── Scale-site grid ─────────────────────────────────────────────────────────

  @Test
  void searchScaleSiteAuthorizations_returns200AndBody() throws Exception {
    when(service.searchScaleSiteAuthorizations(
            new ScaleSiteAuthorizationWorkbenchSearchCriteria(
                12345L, LocalDate.of(2025, 1, 1), LocalDate.of(2025, 12, 31),
                "SITE001", "Main Yard", 1L, 10L, 1, 0)))
        .thenReturn(List.of(new ScaleSiteAuthorizationWorkbenchResult()
            .scaleSiteAuthorizationId(12345L)
            .scaleSiteNumber("SITE001")
            .scaleSiteName("Main Yard")));

    mockMvc.perform(get("/scale-site-authorizations/workbench")
            .param("scaleSiteAuthorizationId", "12345")
            .param("effectiveDate", "2025-01-01")
            .param("expiryDate", "2025-12-31")
            .param("scaleSiteNumber", "SITE001")
            .param("scaleSiteName", "Main Yard")
            .param("regionId", "1")
            .param("districtId", "10")
            .param("primarySort", "1")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scaleSiteAuthorizationId").value(12345))
        .andExpect(jsonPath("$[0].scaleSiteNumber").value("SITE001"))
        .andExpect(jsonPath("$[0].scaleSiteName").value("Main Yard"));
  }

  @Test
  void searchScaleSiteAuthorizations_badRequest_returns400() throws Exception {
    when(service.searchScaleSiteAuthorizations(
            new ScaleSiteAuthorizationWorkbenchSearchCriteria(
                null, null, null, null, null, null, null, 99, 0)))
        .thenThrow(new BadRequestException("Invalid sort value: 99"));

    mockMvc.perform(get("/scale-site-authorizations/workbench")
            .param("primarySort", "99")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }

  @Test
  void searchScaleSiteAuthorizations_withoutSortParams_delegatesDefaultSorts() throws Exception {
    when(service.searchScaleSiteAuthorizations(
            new ScaleSiteAuthorizationWorkbenchSearchCriteria(
                null, null, null, null, null, null, null, 1, 0)))
        .thenReturn(List.of());

    mockMvc.perform(get("/scale-site-authorizations/workbench")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchScaleSiteAuthorizations(
        new ScaleSiteAuthorizationWorkbenchSearchCriteria(
            null, null, null, null, null, null, null, 1, 0));
  }

  // ─── Mark-site grid ──────────────────────────────────────────────────────────

  @Test
  void searchMarkSiteDesignations_returns200AndBody() throws Exception {
    when(service.searchMarkSiteDesignations(new MarkSiteDesignationSearchCriteria(
            12345L, LocalDate.of(2025, 1, 1), LocalDate.of(2025, 12, 31), "TM123", 1L, 10L, 1, 0)))
        .thenReturn(List.of(new MarkSiteDesignationWorkbenchResult()
            .haulingMarkAuthorizationId(12345L)
            .timberMark("TM123")
            .regionId(1L)));

    mockMvc.perform(get("/mark-site-designations/workbench")
            .param("haulingMarkAuthorizationId", "12345")
            .param("effectiveDate", "2025-01-01")
            .param("expiryDate", "2025-12-31")
            .param("timberMark", "TM123")
            .param("regionId", "1")
            .param("districtId", "10")
            .param("primarySort", "1")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].haulingMarkAuthorizationId").value(12345))
        .andExpect(jsonPath("$[0].timberMark").value("TM123"))
        .andExpect(jsonPath("$[0].regionId").value(1));
  }

  @Test
  void searchMarkSiteDesignations_badRequest_returns400() throws Exception {
    when(service.searchMarkSiteDesignations(new MarkSiteDesignationSearchCriteria(
            null, null, null, null, null, null, 99, 0)))
        .thenThrow(new BadRequestException("Invalid sort value: 99"));

    mockMvc.perform(get("/mark-site-designations/workbench")
            .param("primarySort", "99")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }
}
