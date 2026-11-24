package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.*;
import ca.bc.gov.nrs.scs.backend.service.LetterService;
import ca.bc.gov.nrs.scs.backend.service.ScalerAuthorizationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.ResourceHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScalerAuthorizationControllerTest {

  private ScalerAuthorizationService service;
  private LetterService letterService;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScalerAuthorizationService.class);
    letterService = mock(LetterService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScalerAuthorizationController(service, letterService))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter, new ResourceHttpMessageConverter())
        .build();
  }

  @Test
  void removeScalerAuthorizationFromWorkbench_returns204() throws Exception {
    mockMvc.perform(post("/scaler-authorizations/12345/workbench/remove")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    verify(service).removeScalerAuthorizationFromWorkbench(12345L);
  }

  @Test
  void removeScalerAuthorizationFromWorkbench_notFound_returns404() throws Exception {
    doThrow(new ResourceNotFoundException("No scaler authorization found with id 12345"))
        .when(service)
        .removeScalerAuthorizationFromWorkbench(12345L);

    mockMvc.perform(post("/scaler-authorizations/12345/workbench/remove")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  // ── list by scaler ──────────────────────────────────────────────────────────

  @Test
  void listScalerAuthorizations_returns200AndBody() throws Exception {
    ScalerAuthorizationListItem item = new ScalerAuthorizationListItem();
    item.setScalerAuthorizationId(4001L);
    item.setAuthorizationEffectiveDate(LocalDate.of(2025, 1, 15));
    item.setAuthorizationExpiryDate(LocalDate.of(2027, 1, 15));
    item.setDistrictWideInd("N");
    item.setOrgUnitNo(1234L);
    item.setAuthorizedSites(List.of("A12345"));
    item.setStatus("Active");
    item.setLetterExists(true);
    when(service.listScalerAuthorizations("1234")).thenReturn(List.of(item));

    mockMvc.perform(get("/scalers/1234/authorizations")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scalerAuthorizationId").value(4001))
        .andExpect(jsonPath("$[0].status").value("Active"))
        .andExpect(jsonPath("$[0].authorizedSites[0]").value("A12345"))
        .andExpect(jsonPath("$[0].letterExists").value(true));

    verify(service).listScalerAuthorizations("1234");
  }

  @Test
  void listScalerAuthorizations_scalerNotFound_returns404() throws Exception {
    when(service.listScalerAuthorizations("9999"))
        .thenThrow(new ResourceNotFoundException("No scaler found with licence number 9999"));

    mockMvc.perform(get("/scalers/9999/authorizations")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  // ── conditions search / template conditions ─────────────────────────────────

  @Test
  void searchActiveScaleAuthConditions_returns200_andPassesAllQueryParams() throws Exception {
    ScaleAuthCondition condition = new ScaleAuthCondition()
        .scaleAuthConditionId(102L)
        .scaleConditionClassCode("SCA")
        .scaleAuthConditionTitle("Title");
    when(service.searchActiveScaleAuthConditions("SCA", 102L, "Title", "Desc", "Y", 5))
        .thenReturn(List.of(condition));

    mockMvc.perform(get("/scaler-authorizations/conditions")
            .param("scaleConditionClassCode", "SCA")
            .param("scaleAuthConditionId", "102")
            .param("scaleAuthConditionTitle", "Title")
            .param("scaleAuthConditionDesc", "Desc")
            .param("ministryStandardInd", "Y")
            .param("sortOrderNo", "5")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scaleAuthConditionId").value(102))
        .andExpect(jsonPath("$[0].scaleConditionClassCode").value("SCA"));

    // Every query param is bound and forwarded to the service exactly.
    verify(service).searchActiveScaleAuthConditions("SCA", 102L, "Title", "Desc", "Y", 5);
  }

  @Test
  void searchActiveScaleAuthConditions_returns200_withNoParams() throws Exception {
    when(service.searchActiveScaleAuthConditions(null, null, null, null, null, null))
        .thenReturn(List.of());

    mockMvc.perform(get("/scaler-authorizations/conditions")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchActiveScaleAuthConditions(null, null, null, null, null, null);
  }

  @Test
  void getScaleAuthTemplateConditions_returns200_andBindsPathVar() throws Exception {
    ScaleAuthCondition condition = new ScaleAuthCondition().scaleAuthConditionId(200L);
    when(service.getScaleAuthTemplateConditions(443L)).thenReturn(List.of(condition));

    mockMvc.perform(get("/scaler-authorizations/templates/443/conditions")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scaleAuthConditionId").value(200));

    verify(service).getScaleAuthTemplateConditions(443L);
  }

  // ── create ────────────────────────────────────────────────────────────────

  @Test
  void createScalerAuthorization_returns201AndBody() throws Exception {
    ScalerAuthorizationSaveRequest req =
        new ScalerAuthorizationSaveRequest(
            "LIC001", 1L, "N",
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2026, 1, 1),
            List.of("C"));

    ScalerAuthorizationDetail detail =
        new ScalerAuthorizationDetail();
    detail.setScalerAuthorizationId(99L);
    detail.setScalerLicenceNo("LIC001");

    when(service.createScalerAuthorization(any())).thenReturn(detail);

    mockMvc.perform(MockMvcRequestBuilders
            .post("/scaler-authorizations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .writeValueAsString(req))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.scalerAuthorizationId").value(99))
        .andExpect(jsonPath("$.scalerLicenceNo").value("LIC001"));
  }

  @Test
  void createScalerAuthorization_serviceThrowsBadRequest_returns400() throws Exception {
    ScalerAuthorizationSaveRequest req =
        new ScalerAuthorizationSaveRequest(
            "LIC001", 1L, "N",
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2026, 1, 1),
            List.of("C"));

    when(service.createScalerAuthorization(any()))
        .thenThrow(new BadRequestException("Scale Site # does not exist."));

    mockMvc.perform(MockMvcRequestBuilders
            .post("/scaler-authorizations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .writeValueAsString(req))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }

  // ── get ───────────────────────────────────────────────────────────────────

  @Test
  void getScalerAuthorization_returns200() throws Exception {
    ScalerAuthorizationDetail detail =
        new ScalerAuthorizationDetail();
    detail.setScalerAuthorizationId(42L);
    when(service.getScalerAuthorization(42L)).thenReturn(detail);

    mockMvc.perform(get("/scaler-authorizations/42")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scalerAuthorizationId").value(42));
  }

  @Test
  void getScalerAuthorization_notFound_returns404() throws Exception {
    when(service.getScalerAuthorization(99L))
        .thenThrow(new ResourceNotFoundException("No scaler authorization found with id 99"));

    mockMvc.perform(get("/scaler-authorizations/99")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  // ── update ────────────────────────────────────────────────────────────────

  @Test
  void updateScalerAuthorization_returns200() throws Exception {
    ScalerAuthorizationSaveRequest req =
        new ScalerAuthorizationSaveRequest(
            "LIC001", 1L, "N",
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2026, 1, 1),
            List.of("C"));

    ScalerAuthorizationDetail detail =
        new ScalerAuthorizationDetail();
    detail.setScalerAuthorizationId(42L);
    when(service.updateScalerAuthorization(eq(42L), any())).thenReturn(detail);

    mockMvc.perform(MockMvcRequestBuilders
            .put("/scaler-authorizations/42")
            .contentType(MediaType.APPLICATION_JSON)
            .content(new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .writeValueAsString(req))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scalerAuthorizationId").value(42));
  }

  @Test
  void updateScalerAuthorization_notFound_returns404() throws Exception {
    ScalerAuthorizationSaveRequest req =
        new ScalerAuthorizationSaveRequest(
            "LIC001", 1L, "N",
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2026, 1, 1),
            List.of("C"));

    when(service.updateScalerAuthorization(eq(99L), any()))
        .thenThrow(new ResourceNotFoundException("No scaler authorization found with id 99"));

    mockMvc.perform(MockMvcRequestBuilders
            .put("/scaler-authorizations/99")
            .contentType(MediaType.APPLICATION_JSON)
            .content(new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .writeValueAsString(req))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  // ── delete ────────────────────────────────────────────────────────────────

  @Test
  void deleteScalerAuthorization_returns204() throws Exception {
    mockMvc.perform(MockMvcRequestBuilders
            .delete("/scaler-authorizations/42"))
        .andExpect(status().isNoContent());

    verify(service).deleteScalerAuthorization(42L);
  }

  @Test
  void deleteScalerAuthorization_letterExists_returns400() throws Exception {
    doThrow(new BadRequestException("Scaler authorization has an existing letter and cannot be deleted."))
        .when(service).deleteScalerAuthorization(42L);

    mockMvc.perform(MockMvcRequestBuilders
            .delete("/scaler-authorizations/42")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }

  // ── letter create ─────────────────────────────────────────────────────────

  @Test
  void createScalerAuthorizationLetter_delegates_to_letterService() throws Exception {
    ScalerAuthorizationLetterReportRequest req =
        new ScalerAuthorizationLetterReportRequest();
    req.setRegDist("");
    req.setScaleSignatoryBlockId(1L);
    req.setOutputFormat(ScalerAuthorizationLetterReportRequest.OutputFormatEnum.PDF);
    req.setPreview(true);

    when(letterService.createScalerAuthorizationLetter(eq(42L), any()))
        .thenReturn(ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .body(new ByteArrayResource(new byte[]{1})));

    mockMvc.perform(MockMvcRequestBuilders
            .post("/scaler-authorizations/42/letter")
            .contentType(MediaType.APPLICATION_JSON)
            .content(new ObjectMapper()
                .registerModule(new JsonNullableModule())
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .writeValueAsString(req)))
        .andExpect(status().isOk());

    verify(letterService).createScalerAuthorizationLetter(eq(42L), any());
  }

  @Test
  void createScalerAuthorizationLetter_notFound_returns404() throws Exception {
    ScalerAuthorizationLetterReportRequest req =
        new ScalerAuthorizationLetterReportRequest();
    req.setRegDist("");
    req.setScaleSignatoryBlockId(1L);
    req.setOutputFormat(ScalerAuthorizationLetterReportRequest.OutputFormatEnum.PDF);
    req.setPreview(true);

    when(letterService.createScalerAuthorizationLetter(eq(99L), any()))
        .thenThrow(new ResourceNotFoundException("No scaler authorization found with id 99"));

    mockMvc.perform(MockMvcRequestBuilders
            .post("/scaler-authorizations/99/letter")
            .contentType(MediaType.APPLICATION_JSON)
            .content(new ObjectMapper()
                .registerModule(new JsonNullableModule())
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .writeValueAsString(req))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  // ── letter get ────────────────────────────────────────────────────────────

  @Test
  void getScalerAuthorizationLetter_delegates_to_letterService() throws Exception {
    when(letterService.viewScalerAuthorizationLetter(42L))
        .thenReturn(ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .body(new ByteArrayResource(new byte[]{1})));

    mockMvc.perform(get("/scaler-authorizations/42/letter"))
        .andExpect(status().isOk());

    verify(letterService).viewScalerAuthorizationLetter(42L);
  }

  @Test
  void getScalerAuthorizationLetter_notFound_returns404() throws Exception {
    when(letterService.viewScalerAuthorizationLetter(99L))
        .thenThrow(new ResourceNotFoundException("Scaler authorization letter not found."));

    mockMvc.perform(get("/scaler-authorizations/99/letter")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }
}