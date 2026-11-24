package ca.bc.gov.nrs.scs.backend.filter;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.service.SystemStatusService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@DisplayName("SystemStatusFilter tests")
class SystemStatusFilterTest {

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  private HttpServletRequest request(String method, String uri) {
    return request(method, uri, "");
  }

  private HttpServletRequest request(String method, String uri, String contextPath) {
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getRequestURI()).thenReturn(uri);
    when(request.getContextPath()).thenReturn(contextPath);
    when(request.getMethod()).thenReturn(method);
    return request;
  }

  private void authenticateAs(String... authorities) {
    List<SimpleGrantedAuthority> granted =
        List.of(authorities).stream().map(SimpleGrantedAuthority::new).toList();
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken("user", null, granted));
  }

  @Test
  void passesThroughWhenSystemEnabled() throws Exception {
    SystemStatusFilter filter = new SystemStatusFilter(new SystemStatusService(true));
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = request("GET", "/api/scalers/search");
    HttpServletResponse response = mock(HttpServletResponse.class);

    filter.doFilterInternal(request, response, chain);

    verify(chain).doFilter(request, response);
  }

  @Test
  void blocksNonAdminApiCallWhenDisabled() throws Exception {
    SystemStatusFilter filter = new SystemStatusFilter(new SystemStatusService(false));
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = request("GET", "/api/scalers/search");
    HttpServletResponse response = mock(HttpServletResponse.class);
    StringWriter body = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(body));
    authenticateAs("SOME_OTHER_ROLE");

    filter.doFilterInternal(request, response, chain);

    verify(chain, never()).doFilter(any(), any());
    verify(response).setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
    assertTrue(body.toString().contains("SCS has been temporarily disabled."));
  }

  @Test
  void allowsAdminApiCallWhenDisabled() throws Exception {
    SystemStatusFilter filter = new SystemStatusFilter(new SystemStatusService(false));
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = request("GET", "/api/scalers/search");
    HttpServletResponse response = mock(HttpServletResponse.class);
    authenticateAs(Roles.SCS_SYS_ADMIN);

    filter.doFilterInternal(request, response, chain);

    verify(chain).doFilter(request, response);
  }

  @Test
  void allowsStatusEndpointWhenDisabled() throws Exception {
    SystemStatusFilter filter = new SystemStatusFilter(new SystemStatusService(false));
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = request("GET", "/api/system-status");
    HttpServletResponse response = mock(HttpServletResponse.class);

    filter.doFilterInternal(request, response, chain);

    verify(chain).doFilter(request, response);
  }

  @Test
  void allowsNonApiRequestWhenDisabled() throws Exception {
    SystemStatusFilter filter = new SystemStatusFilter(new SystemStatusService(false));
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = request("GET", "/index.html");
    HttpServletResponse response = mock(HttpServletResponse.class);

    filter.doFilterInternal(request, response, chain);

    verify(chain).doFilter(request, response);
  }

  @Test
  void allowsPreflightWhenDisabled() throws Exception {
    SystemStatusFilter filter = new SystemStatusFilter(new SystemStatusService(false));
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = request("OPTIONS", "/api/scalers/search");
    HttpServletResponse response = mock(HttpServletResponse.class);

    filter.doFilterInternal(request, response, chain);

    verify(chain).doFilter(request, response);
  }

  @Test
  @DisplayName("strips deployed context path before blocking a non-admin API call")
  void blocksNonAdminApiCallUnderDeployedContextPath() throws Exception {
    SystemStatusFilter filter = new SystemStatusFilter(new SystemStatusService(false));
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = request("GET", "/pub/scs/api/scalers/search", "/pub/scs");
    HttpServletResponse response = mock(HttpServletResponse.class);
    StringWriter body = new StringWriter();
    when(response.getWriter()).thenReturn(new PrintWriter(body));
    authenticateAs("SOME_OTHER_ROLE");

    filter.doFilterInternal(request, response, chain);

    verify(chain, never()).doFilter(any(), any());
    verify(response).setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
    assertTrue(body.toString().contains("SCS has been temporarily disabled."));
  }

  @Test
  @DisplayName("strips deployed context path so the status endpoint passes through")
  void allowsStatusEndpointUnderDeployedContextPath() throws Exception {
    SystemStatusFilter filter = new SystemStatusFilter(new SystemStatusService(false));
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = request("GET", "/pub/scs/api/system-status", "/pub/scs");
    HttpServletResponse response = mock(HttpServletResponse.class);

    filter.doFilterInternal(request, response, chain);

    verify(chain).doFilter(request, response);
  }
}
