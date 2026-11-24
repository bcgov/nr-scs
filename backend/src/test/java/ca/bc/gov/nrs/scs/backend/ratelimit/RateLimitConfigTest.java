package ca.bc.gov.nrs.scs.backend.ratelimit;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.constants.ApiConstants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;

@DisplayName("RateLimitConfig")
class RateLimitConfigTest {

  @Test
  @DisplayName("registers the rate-limit interceptor for the whole API base path")
  void registersInterceptorUnderTheApiBasePath() {
    RateLimitConfig config = new RateLimitConfig();
    ReflectionTestUtils.setField(config, "enabled", true);
    ReflectionTestUtils.setField(config, "reportsCapacity", 10);
    ReflectionTestUtils.setField(config, "reportsRefillSeconds", 60L);
    ReflectionTestUtils.setField(config, "searchCapacity", 60);
    ReflectionTestUtils.setField(config, "searchRefillSeconds", 60L);

    InterceptorRegistry registry = mock(InterceptorRegistry.class);
    InterceptorRegistration registration = mock(InterceptorRegistration.class);
    when(registry.addInterceptor(any(HandlerInterceptor.class))).thenReturn(registration);

    config.addInterceptors(registry);

    ArgumentCaptor<HandlerInterceptor> captor = ArgumentCaptor.forClass(HandlerInterceptor.class);
    verify(registry).addInterceptor(captor.capture());
    assertInstanceOf(RateLimitInterceptor.class, captor.getValue());
    verify(registration).addPathPatterns(ApiConstants.API_BASE_PATH + "/**");
  }
}
