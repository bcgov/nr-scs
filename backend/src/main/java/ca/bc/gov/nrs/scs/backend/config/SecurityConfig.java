package ca.bc.gov.nrs.scs.backend.config;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.sanitizeForLog;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;

import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.AndRequestMatcher;
import org.springframework.security.web.util.matcher.NegatedRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RegexRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import ca.bc.gov.nrs.scs.backend.constants.ApiConstants;
import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.filter.JwtRequestFilter;
import ca.bc.gov.nrs.scs.backend.filter.MockRequestFilter;
import ca.bc.gov.nrs.scs.backend.filter.SystemStatusFilter;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import ca.bc.gov.nrs.scs.backend.service.SystemStatusService;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;

/**
 * URL-level security and the filter chain.
 *
 * <p>Method security is deliberately <b>not</b> enabled here — see
 * {@link MethodSecurityConfig}, which must sit in the same context as the controllers.
 */
@Configuration
@EnableWebSecurity
@Order(1) // Give this configuration a high precedence
public class SecurityConfig {

    private static final Logger LOGGER = LoggerFactory.getLogger(SecurityConfig.class);

    @Value("${security.jwt.enabled:true}")
    private boolean jwtEnabled;

    @Value("${cors.allowed-origins:}")
    private String corsAllowedOrigins;

    @Value("${jwt.issuer.jwks-uri:}")
    private String jwksUri;

    @Value("${security.mock.user-name:MOCK_CLERICAL}")
    private String mockUserName;

    @Value("${security.mock.user-guid:}")
    private String mockUserGuid;

    @Value("${csp.policy:}")
    private String cspPolicy;

    @Value("${scs.app.environment:}")
    private String appEnvironment;

    /**
     * Environments in which mock authentication (JWT disabled) is permitted. Any other value —
     * including blank/unknown — fails closed and prevents startup, so a deployed instance can never
     * silently run in mock mode.
     */
    private static final Set<String> MOCK_PERMITTED_ENVIRONMENTS = Set.of("LOCAL", "DEV");

    /**
     * Generic, environment-agnostic Content-Security-Policy used only as a fallback when
     * {@code csp.policy} is not configured, so CSP is never silently absent. It is intentionally
     * same-origin only — the operational, environment-specific policy (e.g. allowing Cognito auth
     * endpoints) lives in the {@code csp.policy} property / deployment template, which is the single
     * source of truth and overrides this baseline.
     */
    private static final String DEFAULT_CSP_POLICY =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        + "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; "
        + "frame-ancestors 'none'; form-action 'self'; object-src 'none'; base-uri 'self';";

    @PostConstruct
    public void logSecurityConfig() {
        if (isJwtEffectivelyEnabled()) {
            LOGGER.info("JWT security is enabled.");
        } else {
            LOGGER.warn("JWT security is DISABLED. Falling back to MOCK mode (Clerical user).");
        }

        boolean corsEnabled = corsAllowedOrigins != null && !corsAllowedOrigins.trim().isEmpty();
        if (corsEnabled) {
            LOGGER.info("CORS enabled. Allowed origins: {}", corsAllowedOrigins);
        } else if (isLocalEnvironment()) {
            LOGGER.info("CORS disabled. Property 'cors.allowed-origins' not set or blank.");
        } else {
            LOGGER.warn("CORS is DISABLED in a deployed environment ('{}'): 'cors.allowed-origins' is "
                + "not set. Cross-origin browser requests from the frontend will be blocked. Set "
                + "'cors.allowed-origins' unless the frontend is served same-origin.", appEnvironment);
        }
        if (cspPolicy != null && !cspPolicy.trim().isEmpty()) {
            LOGGER.info("Content Security Policy enabled (configured). Policy: {}", cspPolicy);
        } else {
            LOGGER.info("Content Security Policy enabled (built-in default; 'csp.policy' not set).");
        }
    }

    private boolean isJwtEffectivelyEnabled() {
        return jwtEnabled && jwksUri != null && !jwksUri.trim().isEmpty() && !jwksUri.startsWith("${");
    }

    /** True when {@code scs.app.environment} denotes a local/dev environment (see {@link #MOCK_PERMITTED_ENVIRONMENTS}). */
    private boolean isLocalEnvironment() {
        String env = trimToNull(appEnvironment);
        String normalized = env == null ? "" : env.toUpperCase(Locale.ROOT);
        return MOCK_PERMITTED_ENVIRONMENTS.contains(normalized);
    }

    /**
     * Guards against running mock authentication mode outside local development. Mock mode injects a
     * synthetic user with {@link Roles#SCS_SYS_ADMIN} on every request, so it must never be active on
     * a deployed instance. Throws — refusing application startup — when mock mode is active and
     * {@code scs.app.environment} is not a recognised local/dev value. Fails closed: a blank or
     * unknown environment is treated as "deployed".
     */
    static void assertMockAuthAllowedForEnvironment(String appEnvironment) {
        String env = trimToNull(appEnvironment);
        String normalized = env == null ? "" : env.toUpperCase(Locale.ROOT);
        if (!MOCK_PERMITTED_ENVIRONMENTS.contains(normalized)) {
            throw new IllegalStateException(String.format(
                "FATAL: mock authentication mode is active (security.jwt.enabled=false or "
                + "jwt.issuer.jwks-uri is unset) but scs.app.environment='%s' is not one of %s. "
                + "Refusing to start because mock mode grants unauthenticated %s access to every "
                + "request. Set security.jwt.enabled=true and a valid jwt.issuer.jwks-uri for any "
                + "non-local environment.",
                env, MOCK_PERMITTED_ENVIRONMENTS, Roles.SCS_SYS_ADMIN));
        }
        LOGGER.warn("SECURITY: mock authentication is ACTIVE for environment '{}'. Every request is "
            + "granted {}. This must never run outside local development.", env, Roles.SCS_SYS_ADMIN);
    }

    /**
     * Builds a {@link PathPatternRequestMatcher} for the given path pattern — the non-deprecated
     * replacement for {@code AntPathRequestMatcher}. Uses the default (context-relative) settings.
     */
    private static RequestMatcher pathMatcher(String pattern) {
        return PathPatternRequestMatcher.withDefaults().matcher(pattern);
    }

    /** Method-scoped variant of {@link #pathMatcher(String)}. */
    private static RequestMatcher pathMatcher(HttpMethod method, String pattern) {
        return PathPatternRequestMatcher.withDefaults().matcher(method, pattern);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectProvider<JWTService> jwtServiceProvider,
            SystemStatusService systemStatusService) throws Exception {
        boolean jwtEffectivelyEnabled = isJwtEffectivelyEnabled();

        if (jwtEffectivelyEnabled) {
            JWTService jwtService = jwtServiceProvider.getIfAvailable();
            if (jwtService == null) {
                throw new IllegalStateException(
                    "JWT security is enabled but JWTService is unavailable. Check jwt.issuer.jwks-uri configuration."
                );
            }
            http.addFilterBefore(new JwtRequestFilter(jwtService), UsernamePasswordAuthenticationFilter.class);
        } else {
            // Mock mode grants SCS_SYS_ADMIN to every request — refuse to start unless this is a
            // recognised local/dev environment.
            assertMockAuthAllowedForEnvironment(appEnvironment);
            // In local/dev mock mode, inject a mock user for all requests. Authorities and client
            // scope come from the frontend mock picker via the X-Mock-Roles / X-Mock-Client headers;
            // the default (no headers) is a full-access internal SCS_SYS_ADMIN user.
            http.addFilterBefore(
                new MockRequestFilter(mockUserName, mockUserGuid),
                UsernamePasswordAuthenticationFilter.class);
        }

        // WebADE-style enable/disable enforcement: runs after authentication has populated the
        // SecurityContext (both filters above sit before UsernamePasswordAuthenticationFilter) and
        // before authorization, so it can let administrators through and block everyone else when
        // scs.app.enabled=false.
        http.addFilterBefore(new SystemStatusFilter(systemStatusService), AuthorizationFilter.class);

        boolean corsEnabled = corsAllowedOrigins != null && !corsAllowedOrigins.trim().isEmpty();
        if (corsEnabled) {
            http.cors(cors -> cors.configurationSource(corsConfigurationSource()));
        } else {
            http.cors(AbstractHttpConfigurer::disable);
        }

        // CSRF protection is intentionally disabled: this is a stateless REST API whose callers are
        // authenticated on every request from the Authorization bearer header (JwtRequestFilter) or,
        // in local/dev mock mode only, from the X-Mock-* request headers (MockRequestFilter). Sessions
        // are STATELESS (below) and no cookie or other ambient browser credential ever establishes
        // authentication, so a forged cross-site request cannot ride on a victim's credentials and a
        // CSRF token would have nothing to protect. Cross-origin browser access is governed by the
        // CORS configuration above instead.
        http
            .csrf(AbstractHttpConfigurer::disable) // NOSONAR java:S4502 — stateless bearer-token API, see above
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    LOGGER.warn("401 UNAUTHORIZED: {} {} - Reason: {}",
                        sanitizeForLog(request.getMethod()),
                        sanitizeForLog(request.getRequestURI()),
                        authException.getMessage());
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                })
                .accessDeniedHandler(accessDeniedLoggingHandler())
            )
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers(pathMatcher(HttpMethod.OPTIONS, "/**")).permitAll();

                // Error dispatches (response.sendError -> /error) render the status already decided
                // by the original request. Under the WAR, Tomcat's container error page did this
                // outside the filter chain; under Boot it is a dispatch to /error, which must not be
                // re-authorized or a 403/500 is rewritten as a 401.
                auth.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll();

                // Kubernetes probes and the Prometheus scrape (openshift.deploy.yml). Anonymous;
                // only health and prometheus are exposed (application.yml, management.endpoints).
                auth.requestMatchers(
                    pathMatcher(HttpMethod.GET, "/actuator/health/**"),
                    pathMatcher(HttpMethod.GET, "/actuator/prometheus")
                ).permitAll();

                auth.requestMatchers(
                    pathMatcher("/swagger-ui/**"),
                    pathMatcher("/v3/api-docs/**"),
                    pathMatcher("/swagger-ui.html")
                ).permitAll();

                // Permit access to the frontend static assets and client-side routing
                auth.requestMatchers(
                    pathMatcher("/"),
                    pathMatcher("/index.html"),
                    pathMatcher("/assets/**"),
                    pathMatcher("/icons/**"),
                    pathMatcher("/screenshots/**"),
                    pathMatcher("/*.js"),
                    pathMatcher("/*.css"),
                    pathMatcher("/*.json"),
                    pathMatcher("/*.ico"),
                    pathMatcher("/*.png"),
                    pathMatcher("/*.svg"),
                    pathMatcher("/*.webmanifest"),
                    pathMatcher("/*.txt"),
                    // SPA client-side routes: GET/HEAD, no file extension in path, not under /api/
                    new AndRequestMatcher(
                        new OrRequestMatcher(
                            pathMatcher(HttpMethod.GET, "/**"),
                            pathMatcher(HttpMethod.HEAD, "/**")
                        ),
                        new NegatedRequestMatcher(pathMatcher(ApiConstants.API_BASE_PATH + "/**")),
                        new RegexRequestMatcher("^/[^.]*(/[^.]*)*$", null)
                    )
                ).permitAll();

                // Public system-availability probe: reachable by anyone (even unauthenticated) so the
                // SPA can render the disabled interstitial when scs.app.enabled=false.
                auth.requestMatchers(pathMatcher(ApiConstants.API_BASE_PATH + "/system-status")).permitAll();

                // Secure API endpoints — a coarse gate only. Holding any recognized SCS role gets a
                // request past this rule; what the caller may actually do is decided per handler by
                // @RequiresPermission (method security, enabled by MethodSecurityConfig in the servlet
                // child context) against the permissions RolePermissions grants their
                // role. That is deliberately *not* a widening: an un-annotated handler would be, so
                // ControllerAuthorizationConventionTest fails the build unless every controller
                // endpoint carries one of those annotations.
                auth.requestMatchers(pathMatcher(ApiConstants.API_BASE_PATH + "/**"))
                    .hasAnyAuthority(Roles.ALL_ROLES.toArray(new String[0]))
                    .anyRequest().authenticated();
            });

        // Never create or rely on an HTTP session: authentication is re-established from request
        // headers on every call in both JWT and mock mode. This is also what makes disabling CSRF
        // above safe, so it is unconditional rather than tied to JWT being enabled.
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.headers(headers -> {
            // Defense-in-depth: deny framing via both X-Frame-Options and CSP frame-ancestors
            headers.frameOptions(frame -> frame.deny());
            // Enforce HTTPS for 1 year, include sub-domains (WAVA: HSTS)
            headers.httpStrictTransportSecurity(hsts -> hsts
                .maxAgeInSeconds(31536000)
                .includeSubDomains(true));
            // Prevent MIME-type sniffing (WAVA: X-Content-Type-Options)
            headers.contentTypeOptions(contentTypeOptions -> {});
            // Always apply CSP: the configured policy if set, otherwise a safe built-in default.
            String policy = (cspPolicy != null && !cspPolicy.trim().isEmpty())
                ? cspPolicy : DEFAULT_CSP_POLICY;
            headers.contentSecurityPolicy(csp -> csp.policyDirectives(policy));
        });

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        String raw = corsAllowedOrigins;
        if (raw == null || raw.trim().isEmpty()) {
            return request -> null;
        }

        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = java.util.Arrays.stream(raw.split(","))
            .map(String::trim)
            .filter(s -> !s.isBlank())
            .toList();

        // Fail closed: a wildcard origin combined with allowCredentials=true (below) would let any
        // site make credentialed requests. Spring would also reject this per-request; refuse to
        // start so the misconfiguration is caught immediately rather than 500ing in production.
        if (origins.contains("*")) {
            throw new IllegalStateException(
                "cors.allowed-origins must not contain '*' because credentials are allowed. "
                + "List the exact frontend origins instead.");
        }

        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"));
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of("Location"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AccessDeniedHandler accessDeniedLoggingHandler() {
        return (request, response, accessDeniedException) -> {
            LOGGER.warn(
                "Access denied: {} {} - {}",
                sanitizeForLog(request.getMethod()),
                sanitizeForLog(request.getRequestURI()),
                accessDeniedException.getMessage()
            );
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden");
        };
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
