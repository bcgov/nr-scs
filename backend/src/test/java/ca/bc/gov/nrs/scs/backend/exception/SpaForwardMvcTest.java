package ca.bc.gov.nrs.scs.backend.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.servlet.view.InternalResourceViewResolver;

/**
 * Verifies the SPA deep-link fallback end-to-end through Spring MVC's view resolution: that the
 * {@code @ControllerAdvice} handler returning {@code "forward:/index.html"} is actually resolved as a
 * servlet forward (not serialized as a response body). The companion {@link GlobalApiExceptionHandlerTest}
 * only asserts the handler's return value; this test exercises the real MVC dispatch that production
 * relies on after the per-depth view controllers were removed from WebConfig.
 *
 * <p>A trigger controller raises {@link NoResourceFoundException} (the exception Spring itself raises
 * for an unmatched, non-resource path) so the real handler runs against a real request.
 */
@DisplayName("SPA forward (NoResourceFoundException) MVC dispatch tests")
class SpaForwardMvcTest {

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(new TriggerController())
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setViewResolvers(new InternalResourceViewResolver())
        .build();
  }

  @Test
  @DisplayName("deep non-API extensionless GET is forwarded to /index.html")
  void deepSpaRouteForwardsToIndexHtml() throws Exception {
    mockMvc.perform(get("/trigger")
            .param("path", "scale-sites/123/inspections/view/9/deeper/still"))
        .andExpect(status().isOk())
        .andExpect(forwardedUrl("/index.html"));
  }

  @Test
  @DisplayName("API miss returns 404 and is not forwarded")
  void apiMissReturns404() throws Exception {
    mockMvc.perform(get("/trigger").param("path", "api/v1/unknown"))
        .andExpect(status().isNotFound())
        .andExpect(forwardedUrl(null));
  }

  @Test
  @DisplayName("missing static file (has extension) returns 404 and is not forwarded")
  void missingFileReturns404() throws Exception {
    mockMvc.perform(get("/trigger").param("path", "assets/missing.js"))
        .andExpect(status().isNotFound())
        .andExpect(forwardedUrl(null));
  }

  @Test
  @DisplayName("non-GET to a would-be-404 is not treated as navigation")
  void nonGetReturns404() throws Exception {
    mockMvc.perform(post("/trigger").param("path", "scale-sites/123"))
        .andExpect(status().isNotFound())
        .andExpect(forwardedUrl(null));
  }

  /** Raises {@link NoResourceFoundException} to stand in for Spring's own unmatched-path handling. */
  @RestController
  static class TriggerController {

    @GetMapping("/trigger")
    public String triggerGet(@RequestParam String path) throws NoResourceFoundException {
      throw new NoResourceFoundException(HttpMethod.GET, path);
    }

    @PostMapping("/trigger")
    public String triggerPost(@RequestParam String path) throws NoResourceFoundException {
      throw new NoResourceFoundException(HttpMethod.POST, path);
    }
  }
}
