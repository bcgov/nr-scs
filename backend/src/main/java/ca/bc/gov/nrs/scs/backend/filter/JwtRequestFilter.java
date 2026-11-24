package ca.bc.gov.nrs.scs.backend.filter;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.sanitizeForLog;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import ca.bc.gov.nrs.scs.backend.exception.JwtSigningKeyException;
import ca.bc.gov.nrs.scs.backend.security.ActiveClientResolver;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import ca.bc.gov.nrs.scs.backend.security.RolePermissions;
import ca.bc.gov.nrs.scs.backend.security.ScsAuthenticationToken;
import ca.bc.gov.nrs.scs.backend.security.UserAccessScope;

import java.io.IOException;
import java.util.Collection;
import java.util.Set;

public class JwtRequestFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(JwtRequestFilter.class);

    private final JWTService jwtService;

    public JwtRequestFilter(JWTService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String jwt = authorizationHeader.substring(7);
        String userGuid;
        String userId = null;

        try {
            // Principal = the federated IdP user GUID (custom:idp_user_id — IDIR euser GUID for IDIR, BCeID
            // GUID for BCeID); details = idp_username for audit.
            userGuid = jwtService.extractUserGuid(jwt);
            userId = jwtService.extractUserId(jwt);

            // If the user GUID is present and there's no existing authentication in the context
            var existingAuth = SecurityContextHolder.getContext().getAuthentication();
            if (userGuid != null && (existingAuth == null || existingAuth instanceof AnonymousAuthenticationToken)) {
                // The token is valid, so its contents are trusted. Roles drive RBAC; the client
                // numbers are the separate data-scoping layer.
                Collection<? extends GrantedAuthority> roles = jwtService.extractAuthorities(jwt);
                Set<String> clientNumbers = jwtService.extractForestClientNumbers(jwt);
                // Client scope first: a client-scoped role grants no permissions without it.
                Collection<GrantedAuthority> authorities =
                    RolePermissions.expandAuthorities(roles, clientNumbers);
                UserAccessScope scope = ActiveClientResolver.resolve(
                    clientNumbers, request.getHeader(ActiveClientResolver.ACTIVE_CLIENT_HEADER));
                // Roles, not expanded authorities: an administrator would dump ~100 entries per
                // request. Entitled and active scope both, since they differ for a multi-client user.
                LOGGER.info(
                    "Authenticated user '{}' with GUID '{}', roles: {}, entitled clients: {}, "
                        + "active client scope: {}",
                    sanitizeForLog(userId), sanitizeForLog(userGuid), sanitizeForLog(roles),
                    sanitizeForLog(clientNumbers), sanitizeForLog(scope.clientNumbers()));
                LOGGER.debug("Granted authorities for '{}': {}", sanitizeForLog(userId), authorities);

                Set<String> deniedRoles =
                    RolePermissions.rolesDeniedForMissingClient(roles, clientNumbers);
                if (!deniedRoles.isEmpty()) {
                    LOGGER.warn(
                        "User '{}' holds client-scoped role(s) {} with no forest client number, so "
                            + "they were granted no permissions and every endpoint will deny. The FAM "
                            + "group must be <role>_<clientNumber>.",
                        userId, deniedRoles);
                }

                ScsAuthenticationToken authToken = new ScsAuthenticationToken(userGuid, authorities, scope);
                authToken.setDetails(userId);
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } else if (userGuid == null) {
                // The token parsed and passed issuer/audience checks, but carries no custom:idp_user_id — so
                // no principal is set and the request falls through as unauthenticated, surfacing downstream
                // as an opaque 401/403. Log it: this is the one non-exception path that leaves nothing to
                // grep for, and it means the Cognito attribute mapping isn't populating the claim for this
                // IdP (verified present for IDIR and BCeID Business — check any newly-added IdP here).
                LOGGER.warn("Valid JWT for idp_username '{}' carried no 'custom:idp_user_id' claim; no "
                    + "principal set — request treated as unauthenticated. Check the Cognito attribute "
                    + "mapping for this IdP.", sanitizeForLog(userId));
            }
        } catch (JwtSigningKeyException e) {
            LOGGER.error("JWT Error: Failed to resolve signing key.", e);
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token signature.");
            return; // Stop the filter chain
        } catch (ExpiredJwtException e) {
            LOGGER.warn("JWT Error: Token has expired. {}", e.getMessage());
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token has expired.");
            return; // Stop the filter chain
        } catch (JwtException e) {
            // This will catch other JWT-related issues like malformed tokens, signature errors, etc.
            LOGGER.warn("JWT Error: {}", e.getMessage());
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token.");
            return; // Stop the filter chain
        } catch (ActiveClientResolver.ClientNotEntitledException e) {
            LOGGER.warn("Rejected active-client header for user '{}': {}", sanitizeForLog(userId), e.getMessage());
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Client not available to this user.");
            return; // Stop the filter chain
        }

        chain.doFilter(request, response);
    }
}
