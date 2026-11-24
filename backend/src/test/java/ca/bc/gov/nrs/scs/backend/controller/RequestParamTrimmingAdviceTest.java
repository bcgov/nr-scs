package ca.bc.gov.nrs.scs.backend.controller;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.ScsApiApplication;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.service.AppointmentTypeService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * The advice's contract, independent of any one endpoint: a {@code String} query parameter or path
 * variable arrives trimmed, and one that is only whitespace arrives as {@code null} (no filter).
 *
 * <p>This matters beyond tidiness because the OpenAPI generator turns the contract's
 * {@code pattern}/{@code maxLength} into {@code @Pattern}/{@code @Size} on the generated {@code *Api}
 * parameters, which {@code MethodValidationPostProcessor} enforces before the handler runs — so
 * untrimmed whitespace surfaced to the user as a 400 rather than a search result. See
 * {@link ClientControllerTest} for the reported case ({@code clientNumber}/{@code clientLocnCode}).
 */
class RequestParamTrimmingAdviceTest {

  private AppointmentTypeService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = mock(AppointmentTypeService.class);
    when(service.getAppointmentTypes(any(), any(), any(), any(), any())).thenReturn(List.of());

    mockMvc = MockMvcBuilders
        .standaloneSetup(new AppointmentTypeController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler(), new RequestParamTrimmingAdvice())
        .build();
  }

  @Test
  void surroundingWhitespaceIsTrimmed() throws Exception {
    mockMvc.perform(get("/appointment-types")
            .param("code", "  ABCD  ")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).getAppointmentTypes(eq("ABCD"), any(), any(), any(), any());
  }

  @Test
  void whitespaceOnlyBecomesNull() throws Exception {
    mockMvc.perform(get("/appointment-types")
            .param("code", "   ")
            .param("description", "\t")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).getAppointmentTypes(isNull(), isNull(), any(), any(), any());
  }

  @Test
  void emptyStringBecomesNull() throws Exception {
    mockMvc.perform(get("/appointment-types")
            .param("code", "")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).getAppointmentTypes(isNull(), any(), any(), any(), any());
  }

  @Test
  void interiorWhitespaceIsPreserved() throws Exception {
    mockMvc.perform(get("/appointment-types")
            .param("description", "  Acting Scaler  ")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(service).getAppointmentTypes(any(), eq("Acting Scaler"), any(), any(), any());
  }

  /**
   * Wiring guard: the advice only takes effect if Spring Boot's component scan, rooted at
   * {@link ScsApiApplication}'s package, covers the package it lives in, since that is what makes it
   * a bean for {@code RequestMappingHandlerAdapter} to find. Moving the class out from under that
   * package would silently switch trimming off everywhere.
   */
  @Test
  void adviceLivesInAComponentScannedPackage() {
    assertNotNull(
        ScsApiApplication.class.getAnnotation(SpringBootApplication.class),
        "ScsApiApplication must be the @SpringBootApplication whose package roots the scan");

    String scanRoot = ScsApiApplication.class.getPackageName();
    String advicePackage = RequestParamTrimmingAdvice.class.getPackageName();
    assertTrue(
        advicePackage.equals(scanRoot) || advicePackage.startsWith(scanRoot + "."),
        "Component scan rooted at " + scanRoot + " must cover " + advicePackage);
  }
}
