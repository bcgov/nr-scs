package ca.bc.gov.nrs.scs.backend.filter;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.padClientNumber;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;

import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.security.ActiveClientResolver;
import ca.bc.gov.nrs.scs.backend.security.RolePermissions;
import ca.bc.gov.nrs.scs.backend.security.ScsAuthenticationToken;
import ca.bc.gov.nrs.scs.backend.security.UserAccessScope;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Filter that injects a mock user into the SecurityContext, only used when security.jwt.enabled=false.
 *
 * <p>Two optional dev-only request headers, sent by the frontend mock picker, shape the mock user so
 * both authorization and client scoping can be exercised locally without a real BCeID:
 * <ul>
 *   <li>{@code X-Mock-Roles} — comma-separated role names that become the granted authorities. A
 *       missing header keeps the default full {@link Roles#SCS_SYS_ADMIN} access (preserving tools and
 *       direct API calls); a present-but-blank header (or the {@code none} sentinel) grants no
 *       authorities, yielding a 403 exactly as a real non-privileged user would.</li>
 *   <li>{@code X-Mock-Client} — comma-separated forest client numbers that make the mock a
 *       client-restricted external user; absent/blank leaves it internal.</li>
 * </ul>
 * Honouring client-supplied headers is safe here because this filter is only wired in local/dev mock
 * mode (see {@code SecurityConfig.assertMockAuthAllowedForEnvironment}); it never runs on a deployed
 * instance.
 */
public class MockRequestFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(MockRequestFilter.class);

    /** Dev-only header the frontend mock sends to drive the backend authorities. */
    static final String MOCK_ROLES_HEADER = "X-Mock-Roles";

    /**
     * Sentinel value the frontend sends for an explicit "no role" selection (kept in sync with the
     * frontend {@code mockRolesHeader.MOCK_ROLES_NONE}). Treated as no authorities, so a proxy that
     * strips an empty header value cannot turn "no role" into the default full-access fallback.
     */
    static final String MOCK_ROLES_NONE = "none";

    /** Dev-only header the frontend mock sends to drive the backend client scope. */
    static final String MOCK_CLIENT_HEADER = "X-Mock-Client";

    private final String mockUserName;
    private final String mockUserGuid;

    public MockRequestFilter(String mockUserName, String mockUserGuid) {
        this.mockUserName = trimToNull(mockUserName) == null ? "MOCK_CLERICAL" : mockUserName.trim();
        this.mockUserGuid = trimToNull(mockUserGuid);
        if (this.mockUserGuid == null) {
            // Logged once at startup (not per request) so a local dev sees WHY inspection creates 400.
            // The mock principal falls back to the non-GUID "MOCK_ID", which currentUserGuidOrNull() can't
            // use, so the create-init inspector prefill is empty and the create is rejected as "…inspector
            // user GUID is required." Set security.mock.user-guid to a real GUID from scs_user_info_vw.
            LOGGER.warn("Mock auth: 'security.mock.user-guid' is not set — the mock principal will be the "
                + "non-GUID 'MOCK_ID', so any flow needing the current user's GUID (e.g. creating a site "
                + "inspection) will fail. Set security.mock.user-guid to a real user_guid for local dev.");
        }
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            // Same expansion as the real JWT path, so the mock exercises the same rules rather than a
            // parallel set — including withholding a client-scoped role picked without a client.
            Collection<? extends GrantedAuthority> roles =
                resolveAuthorities(request.getHeader(MOCK_ROLES_HEADER));
            Set<String> clientNumbers = resolveClientNumbers(request.getHeader(MOCK_CLIENT_HEADER));
            Collection<GrantedAuthority> authorities =
                RolePermissions.expandAuthorities(roles, clientNumbers);

            Set<String> deniedRoles =
                RolePermissions.rolesDeniedForMissingClient(roles, clientNumbers);
            if (!deniedRoles.isEmpty()) {
                LOGGER.warn(
                    "Mock role(s) {} are client-scoped but no client is selected, so those roles were "
                        + "withheld entirely and /api/** will refuse at the URL gate. Pick a client in "
                        + "the mock switcher.",
                    deniedRoles);
            }

            // Mirror JwtRequestFilter: principal = user GUID (like the token subject), details = the
            // username for audit fields (like idir_username). X-Mock-Client stands in for the
            // token's entitled set, and the same resolver narrows it to one active client — so the
            // switcher can be exercised locally by giving the mock several clients.
            UserAccessScope scope;
            try {
                scope = ActiveClientResolver.resolve(
                    clientNumbers, request.getHeader(ActiveClientResolver.ACTIVE_CLIENT_HEADER));
            } catch (ActiveClientResolver.ClientNotEntitledException e) {
                LOGGER.warn("Rejected mock active-client header: {}", e.getMessage());
                response.sendError(
                    HttpServletResponse.SC_FORBIDDEN, "Client not available to this user.");
                return;
            }
            ScsAuthenticationToken authToken =
                new ScsAuthenticationToken(
                    mockUserGuid == null ? "MOCK_ID" : mockUserGuid, authorities, scope);

            authToken.setDetails(mockUserName);
            SecurityContextHolder.getContext().setAuthentication(authToken);

            LOGGER.debug(
                "Injected mock user: {} guid={} authorities={} clientNumbers={}",
                mockUserName,
                mockUserGuid == null ? "<not-configured>" : mockUserGuid,
                authorities,
                clientNumbers);
        }

        chain.doFilter(request, response);
    }

    /**
     * Builds the mock user's authorities from the optional {@code X-Mock-Roles} header. A missing
     * header (null) preserves the default full-access behaviour ({@link Roles#SCS_SYS_ADMIN}); a
     * present header — even one that is blank — uses exactly the roles it lists, so an empty value
     * intentionally grants no authorities.
     */
    private static List<SimpleGrantedAuthority> resolveAuthorities(String rolesHeader) {
        if (rolesHeader == null) {
            return List.of(new SimpleGrantedAuthority(Roles.SCS_SYS_ADMIN));
        }
        String trimmed = rolesHeader.trim();
        if (trimmed.isEmpty() || trimmed.equalsIgnoreCase(MOCK_ROLES_NONE)) {
            return List.of();
        }
        return Arrays.stream(rolesHeader.split(","))
            .map(String::trim)
            .filter(role -> !role.isEmpty())
            .filter(role -> !role.equalsIgnoreCase(MOCK_ROLES_NONE))
            .distinct()
            .map(SimpleGrantedAuthority::new)
            .toList();
    }

    /**
     * Builds the mock user's client scope from the optional {@code X-Mock-Client} header. Missing or
     * blank yields an empty set (internal mock); otherwise the comma-separated client numbers, padded
     * to the canonical forest-client width so they match stored records — mirroring the real
     * {@code JWTService.extractForestClientNumbers} path.
     */
    private static Set<String> resolveClientNumbers(String clientHeader) {
        String trimmed = clientHeader == null ? null : clientHeader.trim();
        if (trimmed == null || trimmed.isEmpty()) {
            return Set.of();
        }
        return Arrays.stream(trimmed.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .filter(value -> value.chars().allMatch(Character::isDigit))
            .map(value -> padClientNumber(value))
            .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
