package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.api.AppointmentTypeApi;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.service.AppointmentTypeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.MethodValidationInterceptor;

/**
 * Confirms that wrapping a {@code @Validated} controller in a method-validation proxy (what a
 * {@code MethodValidationPostProcessor} bean does to every controller at runtime) makes an
 * over-length query parameter fail with a constraint violation that {@link GlobalApiExceptionHandler}
 * maps to 400. Uses a programmatic AOP proxy so the assertion is deterministic and independent of
 * full {@code @EnableWebMvc} context wiring.
 */
class MethodValidationProxyWiringTest {

  private AppointmentTypeService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = mock(AppointmentTypeService.class);

    AppointmentTypeController target = new AppointmentTypeController(service);
    ProxyFactory proxyFactory = new ProxyFactory(target);
    proxyFactory.setProxyTargetClass(true);
    proxyFactory.addAdvice(new MethodValidationInterceptor());
    AppointmentTypeController validatingController = (AppointmentTypeController) proxyFactory.getProxy();

    mockMvc = MockMvcBuilders
        .standaloneSetup(validatingController)
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .build();
  }

  @Test
  void overLengthQueryParam_returns400() throws Exception {
    mockMvc.perform(get("/appointment-types")
            .param("code", "ABCDEFGHIJK") // 11 chars, exceeds @Size(max = 10) on AppointmentTypeApi
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  void overLengthQueryParam_returnsPlainLanguageMessage() throws Exception {
    // The mapped banner text must read in plain language: no "method.parameter" property path and no
    // raw constraint wording (the developer-facing detail the exception's own message carries).
    mockMvc.perform(get("/appointment-types")
            .param("code", "ABCDEFGHIJK")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message",
            org.hamcrest.Matchers.containsString("Please check your entries and try again.")))
        .andExpect(jsonPath("$.message",
            org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("must"))))
        .andExpect(jsonPath("$.message",
            org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("getAppointmentTypes"))));
  }

  @Test
  void validQueryParam_returns200() throws Exception {
    mockMvc.perform(get("/appointment-types")
            .param("code", "ABCD")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }

  @Test
  void proxyStillImplementsApiInterface() {
    AppointmentTypeController target = new AppointmentTypeController(service);
    ProxyFactory proxyFactory = new ProxyFactory(target);
    proxyFactory.setProxyTargetClass(true);
    proxyFactory.addAdvice(new MethodValidationInterceptor());
    Object proxy = proxyFactory.getProxy();
    org.junit.jupiter.api.Assertions.assertInstanceOf(AppointmentTypeApi.class, proxy);
  }
}
