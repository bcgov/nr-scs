package ca.bc.gov.nrs.scs.backend.filter;

import ca.bc.gov.nrs.scs.backend.constants.ApiConstants;
import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.service.SystemStatusService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Enforces the system-wide enable/disable flag, the modern analogue of the legacy
 * {@code WebADEFilter} that forwarded non-privileged users to the "SCS temporarily disabled" page.
 *
 * <p>When {@link SystemStatusService#isEnabled()} is {@code false}:
 * <ul>
 *   <li>Non-API requests (static assets, the SPA shell) pass through so the frontend can load and
 *       render the disabled interstitial.</li>
 *   <li>The public {@code /api/system-status} endpoint and CORS pre-flight ({@code OPTIONS}) pass
 *       through so the SPA can still read the flag.</li>
 *   <li>Administrators ({@link Roles#SCS_SYS_ADMIN}) pass through, so they can still use the app —
 *       e.g. to re-enable the system.</li>
 *   <li>Every other API request from a non-administrator is rejected with {@code 503 Service
 *       Unavailable} and a JSON error body.</li>
 * </ul>
 *
 * <p>When the system is enabled the filter is a no-op.
 */
public class SystemStatusFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(SystemStatusFilter.class);

    private static final String API_PREFIX = ApiConstants.API_BASE_PATH + "/";
    private static final String STATUS_PATH = ApiConstants.API_BASE_PATH + "/system-status";
    private static final String DISABLED_BODY =
        "{\"code\":\"SERVICE_UNAVAILABLE\",\"message\":\"SCS has been temporarily disabled.\"}";

    private final SystemStatusService systemStatusService;

    public SystemStatusFilter(SystemStatusService systemStatusService) {
        this.systemStatusService = systemStatusService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws ServletException, IOException {

        if (systemStatusService.isEnabled()) {
            chain.doFilter(request, response);
            return;
        }

        String path = pathWithinApplication(request);
        boolean isApiRequest = path.equals(ApiConstants.API_BASE_PATH) || path.startsWith(API_PREFIX);

        // Let the SPA shell/static assets, the status endpoint, and pre-flight through so the
        // frontend can load and show the interstitial even while the system is disabled.
        if (!isApiRequest
                || path.equals(STATUS_PATH)
                || HttpMethod.OPTIONS.matches(request.getMethod())
                || isAdministrator()) {
            chain.doFilter(request, response);
            return;
        }

        LOGGER.warn("System disabled: blocking {} {} for non-administrator user.",
            request.getMethod(), path);
        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        response.setContentType("application/json");
        response.getWriter().write(DISABLED_BODY);
    }

    /** Request path relative to the application context (so it works under any deployed context path). */
    private String pathWithinApplication(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && uri.startsWith(contextPath)) {
            return uri.substring(contextPath.length());
        }
        return uri;
    }

    private boolean isAdministrator() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        for (GrantedAuthority authority : auth.getAuthorities()) {
            if (Roles.SCS_SYS_ADMIN.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
