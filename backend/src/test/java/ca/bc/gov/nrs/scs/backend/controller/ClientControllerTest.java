package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.service.ClientService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.MethodValidationInterceptor;

/**
 * Query-parameter validation on {@code GET /clients/search}.
 *
 * <p>The client number and location code filters accept both the {@code %} (multi-character) and
 * {@code _} (single-character) wildcards, matching the legacy {@code clientSearch.do} form
 * (free-text inputs, no validation rules in {@code validation.xml}).
 * {@code ClientRepository.searchClients} already passes a wildcard value straight through to
 * {@code scs_client_vw_pkg.search_recs}, which matches with LIKE — so the OpenAPI {@code pattern}
 * on these two parameters must not reject {@code %} or {@code _}, or the search 400s before reaching
 * the package.
 *
 * <p>The controller is wrapped in a method-validation proxy, which is what the runtime
 * {@code MethodValidationPostProcessor} does to every controller — without it the generated
 * {@code @Pattern}/{@code @Size} constraints on the {@code ClientApi} parameters are inert.
 * See {@link MethodValidationProxyWiringTest}.
 */
class ClientControllerTest {

  private ClientService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = mock(ClientService.class);
    when(service.searchClients(
            any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
        .thenReturn(List.of());

    ClientController target = new ClientController(service);
    ProxyFactory proxyFactory = new ProxyFactory(target);
    proxyFactory.setProxyTargetClass(true);
    proxyFactory.addAdvice(new MethodValidationInterceptor());
    ClientController validatingController = (ClientController) proxyFactory.getProxy();

    mockMvc = MockMvcBuilders
        .standaloneSetup(validatingController)
        .setControllerAdvice(new GlobalApiExceptionHandler(), new RequestParamTrimmingAdvice())
        .build();
  }

  @Test
  void searchClients_clientNumberWildcard_reachesService() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", "00021%")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), any(), any(), any(), any(), any(), any(), any(), eq("00021%"), any(), any(), any());
  }

  @Test
  void searchClients_clientNumberWildcardOnly_reachesService() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", "%")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), any(), any(), any(), any(), any(), any(), any(), eq("%"), any(), any(), any());
  }

  @Test
  void searchClients_clientLocnCodeWildcard_reachesService() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientLocnCode", "0%")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), any(), any(), any(), any(), any(), any(), any(), any(), eq("0%"), any(), any());
  }

  /** Legacy single-character wildcard: "25_0" must reach the LIKE search, not 400 at binding. */
  @Test
  void searchClients_clientNumberSingleCharWildcard_reachesService() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", "25_0")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), any(), any(), any(), any(), any(), any(), any(), eq("25_0"), any(), any(), any());
  }

  @Test
  void searchClients_clientLocnCodeSingleCharWildcard_reachesService() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientLocnCode", "0_")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), any(), any(), any(), any(), any(), any(), any(), any(), eq("0_"), any(), any());
  }

  @Test
  void searchClients_plainClientNumber_reachesService() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", "21")
            .param("clientLocnCode", "00")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), any(), any(), any(), any(), any(), any(), any(), eq("21"), eq("00"), any(), any());
  }

  /** Widening for % must not open the filters to arbitrary text. */
  @Test
  void searchClients_nonNumericClientNumber_returns400() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", "ABC")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  @Test
  void searchClients_nonNumericClientLocnCode_returns400() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientLocnCode", "AB")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  @Test
  void searchClients_overLengthClientNumber_returns400() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", "123456789")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  @Test
  void searchClients_overLengthClientLocnCode_returns400() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientLocnCode", "000")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  /**
   * Whitespace around a filter value is a copy/paste artefact, not input: the {@code @Pattern} on
   * these two parameters rejects it, so a pasted " 21 " used to 400 before the search ever ran.
   * {@link RequestParamTrimmingAdvice} trims at binding time, ahead of method validation.
   */
  @Test
  void searchClients_paddedClientNumber_isTrimmedAndReachesService() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", "  21  ")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), any(), any(), any(), any(), any(), any(), any(), eq("21"), any(), any(), any());
  }

  @Test
  void searchClients_paddedClientLocnCode_isTrimmedAndReachesService() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientLocnCode", " 00 ")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), any(), any(), any(), any(), any(), any(), any(), any(), eq("00"), any(), any());
  }

  /** A full-width client number plus surrounding spaces exceeds {@code @Size(max = 8)} untrimmed. */
  @Test
  void searchClients_paddedFullLengthClientNumber_isTrimmedAndReachesService() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", " 00000021 ")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), any(), any(), any(), any(), any(), any(), any(), eq("00000021"), any(), any(), any());
  }

  @Test
  void searchClients_paddedWildcard_isTrimmedAndReachesService() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", " 00021% ")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), any(), any(), any(), any(), any(), any(), any(), eq("00021%"), any(), any(), any());
  }

  /** Whitespace-only is an empty filter, not a value to match — it must not 400 either. */
  @Test
  void searchClients_blankFilters_areTreatedAsAbsent() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", "   ")
            .param("clientLocnCode", "  ")
            .param("companyName", " ")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).searchClients(
        any(), isNull(), any(), any(), any(), any(), any(), any(), isNull(), isNull(), any(), any());
  }

  /** Trimming must not widen the filters: interior whitespace is still not a legal client number. */
  @Test
  void searchClients_interiorWhitespaceClientNumber_returns400() throws Exception {
    mockMvc.perform(get("/clients/search")
            .param("clientNumber", "12 34")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }
}
