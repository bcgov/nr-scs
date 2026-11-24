package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.domain.scaler.Scaler;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceType;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerAddress;
import ca.bc.gov.nrs.scs.backend.model.ScalerResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentInput;
import ca.bc.gov.nrs.scs.backend.model.ScalerCreate;
import ca.bc.gov.nrs.scs.backend.model.ScalerCreate.LicenceTypesEnum;
import ca.bc.gov.nrs.scs.backend.model.ScalerCreate.OathTakenIndEnum;
import ca.bc.gov.nrs.scs.backend.model.ScalerLicenceCancelledDateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerSummary;
import ca.bc.gov.nrs.scs.backend.model.ScalerSummaryLicenceType;
import ca.bc.gov.nrs.scs.backend.service.ScalerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.LocalDate;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.MethodValidationInterceptor;

class ScalerControllerTest {

  private ScalerService service;
  private MockMvc mockMvc;
  // Same controller wrapped in the method-validation proxy the runtime MethodValidationPostProcessor
  // applies to every controller — needed so the generated @Pattern/@Size on the search parameters
  // actually fire (plain standaloneSetup leaves them inert).
  private MockMvc validatingMockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScalerService.class);

    // Mirror WebConfig's ObjectMapper so JsonNullable and LocalDate work in tests
    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScalerController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();

    ProxyFactory proxyFactory = new ProxyFactory(new ScalerController(service));
    proxyFactory.setProxyTargetClass(true);
    proxyFactory.addAdvice(new MethodValidationInterceptor());
    ScalerController validatingController = (ScalerController) proxyFactory.getProxy();
    validatingMockMvc = MockMvcBuilders
        .standaloneSetup(validatingController)
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private ScalerCreate minimalCreateRequest() {
    ScalerAppointmentInput appt = new ScalerAppointmentInput(
        "FORS", "BC",
        ScalerAppointmentInput.ProvinceWideIndEnum.Y,
        LocalDate.of(2025, 1, 15));

    ScalerCreate req = new ScalerCreate(
        "12345678", 1234L,
        LocalDate.of(2025, 1, 15),
        OathTakenIndEnum.Y,
        List.of(LicenceTypesEnum.SCS));
    req.setAppointment(appt);
    return req;
  }

  private Scaler stubScaler(String licNo) {
    return new Scaler(
        licNo, "12345678", 1234L, LocalDate.of(2025, 1, 15), null, YesNo.Y, null,
        List.of(ScalerLicenceType.SCS), null, null,
        null, null, null, null, null);
  }

  private ScalerSummary stubSummary(String licNo) {
    ScalerSummary s = new ScalerSummary();
    s.setScalerLicenceNo(JsonNullable.of(licNo));
    s.setClientNumber(JsonNullable.of("12345678"));
    s.setOrgUnitName(JsonNullable.of("Vancouver Forest District"));
    s.setIssuedDate(JsonNullable.of(LocalDate.of(2025, 1, 15)));
    s.setOathTakenInd(JsonNullable.of(ScalerSummary.OathTakenIndEnum.Y));
    s.setLicenceStatus(JsonNullable.of("ACTIVE"));
    s.setLicenceTypes(JsonNullable.of(List.of(
        new ScalerSummaryLicenceType().code("SCS").description("Scale Administration and Control System"))));
    return s;
  }

  private ScalerAddress stubAddress(String licNo) {
    ScalerAddress a = new ScalerAddress();
    a.setScalerLicenceNo(JsonNullable.of(licNo));
    a.setCompany(JsonNullable.of("Coastal Logging Ltd."));
    a.setBusinessPhone(JsonNullable.of("2505551234"));
    a.setCity(JsonNullable.of("Victoria"));
    a.setPostalCode(JsonNullable.of("V8V 1A1"));
    return a;
  }

  // ---------------------------------------------------------------------------
  // Minimal controller tests (HTTP contract + delegation)
  // ---------------------------------------------------------------------------

  @Test
  void createScaler_delegatesAndReturns201() throws Exception {
    when(service.createScaler(any(ScalerCreateCommand.class))).thenReturn(stubScaler("9999"));

    mockMvc.perform(post("/scalers")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("9999")));

    verify(service).createScaler(any(ScalerCreateCommand.class));
  }

  @Test
  void getScaler_found_returns200() throws Exception {
    when(service.getScaler("1234")).thenReturn(stubScaler("1234"));

    mockMvc.perform(get("/scalers/1234").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("1234")));
  }

  @Test
  void getScaler_notFound_returns404() throws Exception {
    when(service.getScaler("XXXX"))
        .thenThrow(new ResourceNotFoundException("No scaler found with licence number XXXX"));

    mockMvc.perform(get("/scalers/XXXX").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  @Test
  void getScalerSummary_found_returns200() throws Exception {
    when(service.getScalerSummary("1234")).thenReturn(stubSummary("1234"));

    mockMvc.perform(get("/scalers/1234/summary").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("1234")))
        .andExpect(content().string(Matchers.containsString("ACTIVE")));
  }

  @Test
  void getScalerSummary_notFound_returns404() throws Exception {
    when(service.getScalerSummary("XXXX"))
        .thenThrow(new ResourceNotFoundException("No scaler found with licence number XXXX"));

    mockMvc.perform(get("/scalers/XXXX/summary").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  @Test
  void getScalerAddress_found_returns200() throws Exception {
    when(service.getScalerAddress("1234")).thenReturn(stubAddress("1234"));

    mockMvc.perform(get("/scalers/1234/address").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("1234")))
        .andExpect(content().string(Matchers.containsString("Coastal Logging Ltd.")));
  }

  @Test
  void getScalerAddress_noAddress_returns204() throws Exception {
    when(service.getScalerAddress("XXXX")).thenReturn(null);

    mockMvc.perform(get("/scalers/XXXX/address").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNoContent())
        .andExpect(content().string(Matchers.emptyString()));
  }

  @Test
  void updateScaler_delegatesAndReturns200() throws Exception {
    when(service.updateScaler(any(ScalerUpdateCommand.class))).thenReturn(stubScaler("1234"));

    mockMvc.perform(put("/scalers/1234")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("1234")));

    // The mapper carries the path licence number into the command
    org.mockito.ArgumentCaptor<ScalerUpdateCommand> captor =
        org.mockito.ArgumentCaptor.forClass(ScalerUpdateCommand.class);
    verify(service).updateScaler(captor.capture());
    org.junit.jupiter.api.Assertions.assertEquals("1234", captor.getValue().scalerLicenceNo());
  }

  @Test
  void updateScaler_notFound_returns404() throws Exception {
    when(service.updateScaler(any(ScalerUpdateCommand.class)))
        .thenThrow(new ResourceNotFoundException("No scaler found with licence number XXXX"));

    mockMvc.perform(put("/scalers/XXXX")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(minimalCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  @Test
  void updateLicenceCancelledDate_delegatesAndReturns200() throws Exception {
    when(service.updateLicenceCancelledDate("1234", LocalDate.of(2026, 6, 30)))
        .thenReturn(stubScaler("1234"));
    ScalerLicenceCancelledDateRequest body = new ScalerLicenceCancelledDateRequest()
        .licenceCancelledDate(LocalDate.of(2026, 6, 30));

    mockMvc.perform(patch("/scalers/1234/licence-cancelled-date")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("1234")));

    verify(service).updateLicenceCancelledDate("1234", LocalDate.of(2026, 6, 30));
  }

  @Test
  void deleteScaler_delegatesAndReturns204() throws Exception {
    mockMvc.perform(delete("/scalers/1234").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNoContent());

    verify(service).deleteScaler("1234");
  }

  @Test
  void deleteScaler_notFound_returns404() throws Exception {
    org.mockito.Mockito.doThrow(new ResourceNotFoundException("No scaler found with licence number XXXX"))
        .when(service).deleteScaler("XXXX");

    mockMvc.perform(delete("/scalers/XXXX").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound());
  }

  @Test
  void deleteScaler_dependentRecords_returns400() throws Exception {
    org.mockito.Mockito.doThrow(new BadRequestException(
        "Database Exception: The record can not be deleted because there are associated records that exist."))
        .when(service).deleteScaler("1234");

    mockMvc.perform(delete("/scalers/1234").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("associated records that exist")));
  }

  @Test
  void searchScalers_smoke_returns200() throws Exception {
    when(service.searchScalers(
            eq("LIC%"), eq("12345%"), eq(100L), eq("%Smith%"), eq("John%"),
            eq("2"), eq("SCS"), eq("CS"), eq(1), eq(0)))
        .thenReturn(List.of(new ScalerResult().scalerLicenceNo("LIC12345").clientName("Smith Logging Ltd.")));

    mockMvc.perform(get("/scalers/search")
            .param("scalerLicenceNo", "LIC%")
            .param("clientNumber", "12345%")
            .param("orgUnitNo", "100")
            .param("clientName", "%Smith%")
            .param("legalFirstName", "John%")
            .param("scalarTrainingType", "2")
            .param("scalerLicenceTypeCode", "SCS")
            .param("scalerAppointmentType", "CS")
            .param("primarySort", "1")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("LIC12345")));
  }

  /**
   * The Exam / Upgrade filter carries a {@code SCALER_TRAINING_TYPE} LOV code, not a number:
   * {@code p_scalar_training_type} on {@code scs_queries_scalars_vw_pkg.search_recs} is a VARCHAR2
   * (legacy {@code QueriesScalarsVwMapper} binds it as a String). Declaring the parameter as a
   * {@code Long} made every selection in that dropdown a 500 — the frontend's {@code Number("E")}
   * produced {@code NaN}, which failed conversion before the handler even ran.
   */
  @Test
  void searchScalers_nonNumericTrainingTypeCode_reachesServiceAsString() throws Exception {
    when(service.searchScalers(
            any(), any(), any(), any(), any(), eq("E"), any(), any(), any(), any()))
        .thenReturn(List.of(new ScalerResult().scalerLicenceNo("LIC12345")));

    mockMvc.perform(get("/scalers/search")
            .param("scalarTrainingType", "E")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchScalers(
        any(), any(), any(), any(), any(), eq("E"), any(), any(), any(), any());
  }

  /**
   * The Scaler (Client / Loc) number filter is the same numeric forest-client number as the Client
   * query screen, so it carries the identical {@code ^[0-9%_]{1,8}$} constraint. A non-numeric value
   * used to pass validation and silently match nothing; it now 400s with a clear error.
   */
  @Test
  void searchScalers_nonNumericClientNumber_returns400() throws Exception {
    validatingMockMvc.perform(get("/scalers/search")
            .param("clientNumber", "aaaaaaaa")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  @Test
  void searchScalers_overLengthClientNumber_returns400() throws Exception {
    validatingMockMvc.perform(get("/scalers/search")
            .param("clientNumber", "123456789") // 9 digits, exceeds the 8-char limit
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  @Test
  void searchScalers_numericClientNumber_reachesService() throws Exception {
    when(service.searchScalers(any(), eq("00021855"), any(), any(), any(), any(), any(), any(), any(), any()))
        .thenReturn(List.of());

    validatingMockMvc.perform(get("/scalers/search")
            .param("clientNumber", "00021855")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }

  /** The `%` wildcard is still accepted for partial matching, matching the Client query screen. */
  @Test
  void searchScalers_wildcardClientNumber_reachesService() throws Exception {
    when(service.searchScalers(any(), eq("12345%"), any(), any(), any(), any(), any(), any(), any(), any()))
        .thenReturn(List.of());

    validatingMockMvc.perform(get("/scalers/search")
            .param("clientNumber", "12345%")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }

  /**
   * The legacy single-character `_` wildcard is accepted too, matching the Client query screen:
   * "25_0" must reach the LIKE search rather than 400 at binding.
   */
  @Test
  void searchScalers_singleCharWildcardClientNumber_reachesService() throws Exception {
    when(service.searchScalers(any(), eq("25_0"), any(), any(), any(), any(), any(), any(), any(), any()))
        .thenReturn(List.of());

    validatingMockMvc.perform(get("/scalers/search")
            .param("clientNumber", "25_0")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }
}
