package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScale;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScaleSide;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleEntry;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ReturnType;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest.CheckReplacesOriginalIndEnum;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest.FollowedGoodPracticeIndEnum;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest.OriginalWithinStandardIndEnum;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleSpgRow;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.SummaryCheckScaleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SummaryCheckScaleControllerTest {

  private SummaryCheckScaleService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(SummaryCheckScaleService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new SummaryCheckScaleController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void getScalerSummaryCheckScales_returns200WithRows() throws Exception {
    SummaryCheckScaleEntry entry =
        new SummaryCheckScaleEntry(
            146943L, "SFPSCS", "1234", "5678",
            LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 3),
            null, null, null, YesNo.N, "FIRST", YesNo.Y, YesNo.Y);
    when(service.getScalerSummaryCheckScales("1234")).thenReturn(List.of(entry));

    mockMvc.perform(get("/scalers/1234/summary-check-scales").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.summaryCheckScales[0].checkScaleId").value(146943))
        .andExpect(jsonPath("$.summaryCheckScales[0].ckscType").value("SFPSCS"))
        .andExpect(jsonPath("$.summaryCheckScales[0].primOrigLicenceNo").value("5678"))
        .andExpect(jsonPath("$.summaryCheckScales[0].replacedInd").value("N"));

    verify(service).getScalerSummaryCheckScales("1234");
  }

  @Test
  void createSummaryCheckScale_returns201WithId() throws Exception {
    when(service.createSummaryCheckScale(any())).thenReturn(55L);

    mockMvc.perform(post("/summary-check-scales/create")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(validRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.checkScaleId").value(55));

    verify(service).createSummaryCheckScale(any());
  }

  @Test
  void createSummaryCheckScale_returns400_whenSpgRowsEmpty() throws Exception {
    SummaryCheckScaleCreateRequest request = validRequest();
    request.setSpgRows(new ArrayList<>()); // violates @Size(min = 1)

    mockMvc.perform(post("/summary-check-scales/create")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());

    verify(service, never()).createSummaryCheckScale(any());
  }

  @Test
  void updateSummaryCheckScale_returns200WithUpdatedRecord() throws Exception {
    when(service.updateSummaryCheckScale(eq(77L), any())).thenReturn(loadedSummary("LTSCS"));

    mockMvc.perform(put("/summary-check-scales/77")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(validUpdateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.checkScaleId").value(77))
        .andExpect(jsonPath("$.ckscType").value("LTSCS"))
        .andExpect(jsonPath("$.checkScaleTypeCode").value("FRST"));

    verify(service).updateSummaryCheckScale(eq(77L), any());
  }

  @Test
  void addSummaryCheckScaleSpgRow_returns200WithRecord() throws Exception {
    when(service.addSpgRow(eq(77L), any())).thenReturn(loadedSummary("LTSCS"));

    mockMvc.perform(post("/summary-check-scales/77/spg-rows")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(
                new SummaryCheckScaleSpgRow("FI", 10, 12.5, 100.0, 9, 11.0, 95.0)))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.checkScaleId").value(77));

    verify(service).addSpgRow(eq(77L), any());
  }

  /**
   * The composite key travels in the body. The blanked product (a single SPACE) is the whole point:
   * it must reach the service intact. As query parameters it did not — `RequestParamTrimmingAdvice`
   * trimmed it to null, which threw `MissingServletRequestParameterException` before the handler
   * ran and surfaced as a 500 (`GlobalApiExceptionHandler` maps no handler to it, so it fell to the
   * catch-all `Exception` handler rather than the Spring-default 400). These tests did not catch
   * that, because standalone MockMvc registers no `@ControllerAdvice`; the body form removes the
   * binder from the path entirely, so unit and production behaviour cannot diverge here again.
   */
  @Test
  void deleteSummaryCheckScaleSpgRow_returns200WithRecord() throws Exception {
    when(service.deleteSpgRow(77L, "FI", " ", "1")).thenReturn(loadedSummary("LTSCS"));

    mockMvc.perform(delete("/summary-check-scales/77/spg-rows")
            .contentType(MediaType.APPLICATION_JSON)
            .content(spgRowKeyJson("FI", " ", "1"))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.checkScaleId").value(77));

    verify(service).deleteSpgRow(77L, "FI", " ", "1");
  }

  /** The blanked GRADE arm (SFP, non-XM product) — the shape that was failing in production. */
  @Test
  void deleteSummaryCheckScaleSpgRow_passesABlankGradeThrough() throws Exception {
    when(service.deleteSpgRow(77L, "AL", "CA", " ")).thenReturn(loadedSummary("SFPSCS"));

    mockMvc.perform(delete("/summary-check-scales/77/spg-rows")
            .contentType(MediaType.APPLICATION_JSON)
            .content(spgRowKeyJson("AL", "CA", " "))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).deleteSpgRow(77L, "AL", "CA", " ");
  }

  @Test
  void deleteSummaryCheckScaleSpgRow_returns400_whenServiceRejectsLastRow() throws Exception {
    when(service.deleteSpgRow(any(), any(), any(), any()))
        .thenThrow(new BadRequestException("Cannot delete the last remaining species product grade row."));

    mockMvc.perform(delete("/summary-check-scales/77/spg-rows")
            .contentType(MediaType.APPLICATION_JSON)
            .content(spgRowKeyJson("FI", " ", "1"))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  @Test
  void deleteSummaryCheckScale_returns204() throws Exception {
    mockMvc.perform(delete("/summary-check-scales/77")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    verify(service).deleteSummaryCheckScale(77L);
  }

  @Test
  void deleteSummaryCheckScale_returns404_whenServiceThrowsNotFound() throws Exception {
    doThrow(new ResourceNotFoundException("not found"))
        .when(service).deleteSummaryCheckScale(anyLong());

    mockMvc.perform(delete("/summary-check-scales/77")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  private static SummaryCheckScaleUpdateRequest validUpdateRequest() {
    return new SummaryCheckScaleUpdateRequest(
        ReturnType.LOG_TALLY,
        "FRST",
        "AAAA",
        "BBBB",
        "ABC123",
        "0001",
        SummaryCheckScaleUpdateRequest.FollowedGoodPracticeIndEnum.Y,
        SummaryCheckScaleUpdateRequest.OriginalWithinStandardIndEnum.Y,
        SummaryCheckScaleUpdateRequest.CheckReplacesOriginalIndEnum.N,
        LocalDate.of(2024, 1, 1),
        100,
        LocalDate.of(2024, 1, 2),
        101);
  }

  /** Minimal loaded summary record for the update response projection. */
  private static CheckScale loadedSummary(String ckscType) {
    return new CheckScale(
        77L, "FRST", ckscType, "Y", YesNo.Y, YesNo.Y, YesNo.N, null, null, null,
        null, null, null, null,
        "AAAA", "BBBB", null, "0001", "ABC123", "LD1", null,
        null, null, null,
        ScaleSide.EMPTY, ScaleSide.EMPTY,
        null, null, null, null, null,
        List.of());
  }

  @Test
  void createSummaryCheckScale_returns400WithFieldErrors_whenReferenceMissing() throws Exception {
    when(service.createSummaryCheckScale(any())).thenThrow(new FieldValidationException(
        java.util.List.of(new FieldErrorDetail("checkScalerLicenceNo", "A Scaler # could not be found for BBBB."))));

    mockMvc.perform(post("/summary-check-scales/create")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(validRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors[0].field").value("checkScalerLicenceNo"))
        .andExpect(jsonPath("$.fieldErrors[0].message").value("A Scaler # could not be found for BBBB."));
  }

  private static SummaryCheckScaleCreateRequest validRequest() {
    SummaryCheckScaleSpgRow row =
        new SummaryCheckScaleSpgRow("FI", 10, 12.5, 100.0, 9, 11.0, 95.0);
    return new SummaryCheckScaleCreateRequest(
        ReturnType.LOG_TALLY,
        "FRST",
        "AAAA",
        "BBBB",
        "ABC123",
        "0001",
        FollowedGoodPracticeIndEnum.Y,
        OriginalWithinStandardIndEnum.Y,
        CheckReplacesOriginalIndEnum.N,
        LocalDate.of(2024, 1, 1),
        100,
        LocalDate.of(2024, 1, 2),
        101,
        List.of(row));
  }

  /** The SPG composite-key request body. Values are embedded verbatim so a single space stays one. */
  private static String spgRowKeyJson(String species, String product, String grade) {
    return "{\"scaleSpeciesCode\":\"" + species + "\",\"scaleProductCode\":\"" + product
        + "\",\"scaleGradeCode\":\"" + grade + "\"}";
  }

}
