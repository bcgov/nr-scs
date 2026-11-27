package ca.bc.gov.nrs.scs.backend.security;

import com.auth0.jwk.Jwk;
import com.auth0.jwk.JwkProvider;
import com.auth0.jwk.JwkProviderBuilder;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtParserBuilder;
import jakarta.annotation.PostConstruct;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.padClientNumber;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.stereotype.Component;
import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.exception.JwtSigningKeyException;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Validates BC Gov SSO (Keycloak, standard realm) <strong>access tokens</strong> and reads the caller's
 * identity and roles from them. Follows the nr-cbr migration (its {@code Oauth2SecurityCustomizer} and
 * {@code JwtPrincipalUtil}), kept inside SCS's own filter so {@code RolePermissions} and the
 * forest-client scoping layer are unchanged.
 *
 * <h3>Why {@code azp}, not {@code aud}</h3>
 * The standard realm is shared by many BC Gov applications: all their tokens share this issuer and
 * verify against this JWKS, so signature + issuer alone do not prove a token was minted for SCS. The
 * {@code azp} (authorized party) check refuses tokens issued to another integration. Keycloak access
 * tokens carry {@code aud: "account"} (or nothing useful), so the Cognito-era audience check cannot
 * be kept.
 */
@Component
public class JWTService {

    private static final Logger LOGGER = LoggerFactory.getLogger(JWTService.class);

    /** The IdP usernames — the audit user id. Verbatim, never a GUID (see {@link #extractUserId}). */
    static final List<String> USERNAME_CLAIMS = List.of("idir_username", "bceid_username");
    /** The IdP user GUIDs — the identity used as principal. */
    static final List<String> USER_GUID_CLAIMS = List.of("idir_user_guid", "bceid_user_guid");
    /** CSS realm mappers put the integration's roles here. */
    static final String CLIENT_ROLES_CLAIM = "client_roles";
    /** Stock-Keycloak location for the same roles: {@code resource_access.<azp>.roles}. */
    static final String RESOURCE_ACCESS_CLAIM = "resource_access";
    /** FAM's per-grant expiry bookkeeping ({@code FAM:EXPIRES:...}) rides with the roles; never a role. */
    private static final String FAM_BOOKKEEPING_PREFIX = "FAM:";
    private static final String CERTS_PATH = "/protocol/openid-connect/certs";

    /** Realm issuer, e.g. {@code https://dev.loginproxy.gov.bc.ca/auth/realms/standard}. */
    @Value("${keycloak.issuer-uri:}")
    private String issuerUri;

    /** The CSS integration's client id, required as the token's {@code azp}. */
    @Value("${keycloak.client-id:}")
    private String clientId;

    // The JwkProvider will handle caching of public keys for us.
    private JwkProvider provider;

    @PostConstruct
    public void init() throws MalformedURLException {
        if (expectedIssuer() == null) {
            LOGGER.warn("Keycloak issuer URI is not configured. JWTService warmup skipped.");
            return;
        }
        if (expectedClientId() == null) {
            // Fail closed: without it any token the shared realm signs, for any application, would pass.
            throw new IllegalStateException("keycloak.client-id (KEYCLOAK_CLIENT_ID) must be set when "
                + "keycloak.issuer-uri is configured: it is checked as the token's azp, and without it "
                + "tokens issued to any other application on the shared realm would be accepted.");
        }

        long start = System.currentTimeMillis();
        LOGGER.info("Initializing JWTService and warming up JWKS provider...");
        try {
            URL url = toJwksUrl();

            // 1. Warm up the DNS and network connection with explicit timeouts.
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            try (InputStream is = conn.getInputStream()) {
                is.readAllBytes();
                LOGGER.info("Successfully reached JWKS endpoint in {}ms", System.currentTimeMillis() - start);
            }

            // 2. Initialize the JwkProvider against the realm JWKS (<issuer>/protocol/openid-connect/certs).
            // The provider handles fetching, caching, and rate limiting.
            this.provider = new JwkProviderBuilder(url).build();

            // 3. Force the provider to fetch and parse the JSON by requesting a dummy key.
            // This ensures the internal cache is populated BEFORE the first request.
            warmUpProviderFetch();

            LOGGER.info("JWTService initialization complete in {}ms", System.currentTimeMillis() - start);

        } catch (Exception e) {
            LOGGER.error("JWTService failed eager initialization: {}. Falling back to lazy loading.", e.getMessage());
            this.provider = new JwkProviderBuilder(toJwksUrl()).build();
        }
    }

    private URL toJwksUrl() throws MalformedURLException {
        return URI.create(jwksUri()).toURL();
    }

    /** The realm's JWKS endpoint, derived from the issuer (Keycloak publishes keys under /certs). */
    String jwksUri() {
        return expectedIssuer() + CERTS_PATH;
    }

    private void warmUpProviderFetch() {
        try {
            this.provider.get("startup-warmup");
        } catch (Exception ignored) {
            // Expected to fail, but the fetch has happened.
            LOGGER.debug("JwkProvider warmed up.");
        }
    }

    /**
     * The token {@code sub} — a realm-internal id, NOT the user's identity. Named {@code extractSubject}
     * (not {@code extractUsername}) deliberately: reading identity from {@code sub} was an earlier bug.
     * Use {@link #extractUserGuid} for identity and {@link #extractUserId} for the audit username.
     */
    public String extractSubject(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        return extractUserId(claims);
    }

    /**
     * The audit user id: {@code idir_username} or {@code bceid_username}, verbatim. Deliberately no GUID
     * fallback (unlike nr-cbr): SCS's audit columns hold usernames, and a GUID there would silently stop
     * matching rows written by the legacy application. {@code null} when neither claim is present — which
     * means the CSS integration is not adding the username mappers to the <em>access</em> token.
     */
    String extractUserId(Claims claims) {
        return USERNAME_CLAIMS.stream()
            .map(name -> claimText(claims, name))
            .filter(value -> value != null)
            .findFirst()
            .orElse(null);
    }

    /**
     * The federated IdP user GUID — the user's identity, not the token {@code sub}: {@code idir_user_guid}
     * or {@code bceid_user_guid}, else the GUID the standard realm puts before the {@code @} in
     * {@code preferred_username} ({@code <guid>@azureidir}). Upper-cased: the two sources can differ in
     * case within one token, and the legacy tables store the GUID upper-case. {@code null} if absent.
     */
    public String extractUserGuid(String token) {
        return extractUserGuid(extractAllClaims(token));
    }

    String extractUserGuid(Claims claims) {
        return Stream.concat(
                USER_GUID_CLAIMS.stream().map(name -> claimText(claims, name)),
                Stream.of(guidFromPreferredUsername(claims)))
            .filter(value -> value != null)
            .map(value -> value.toUpperCase(Locale.ROOT))
            .findFirst()
            .orElse(null);
    }

    private static String guidFromPreferredUsername(Claims claims) {
        String preferred = claimText(claims, "preferred_username");
        if (preferred == null) {
            return null;
        }
        int at = preferred.indexOf('@');
        return at > 0 ? preferred.substring(0, at) : null;
    }

    private static String claimText(Claims claims, String name) {
        Object value = claims.get(name);
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        if (provider == null) {
            throw new JwtSigningKeyException(
                "JWKS provider is not initialized. Check keycloak.issuer-uri configuration.",
                new IllegalStateException("JWTService has not been initialized with a JWKS provider.")
            );
        }

        JwtParserBuilder parserBuilder = Jwts.parser()
                .keyLocator(header -> {
                    try {
                        String kid = (header instanceof io.jsonwebtoken.ProtectedHeader ph) ? ph.getKeyId() : null;
                        Jwk jwk = provider.get(kid);
                        return jwk.getPublicKey();
                    } catch (Exception e) {
                        throw new JwtSigningKeyException("Failed to resolve signing key", e);
                    }
                });

        // Reject tokens minted by another realm (issuer), even if signed with a key this JWKS trusts.
        String expectedIssuer = expectedIssuer();
        if (expectedIssuer != null) {
            parserBuilder.requireIssuer(expectedIssuer);
        }

        Claims claims = parserBuilder
                .build()
                .parseSignedClaims(token)
                .getPayload();

        // ...and tokens the shared realm issued to another application (authorized party).
        String expectedClientId = expectedClientId();
        String authorizedParty = claimText(claims, "azp");
        if (expectedClientId == null || !expectedClientId.equals(authorizedParty)) {
            throw new io.jsonwebtoken.JwtException(
                "Token was not issued to this application (azp=" + authorizedParty + ")");
        }
        return claims;
    }

    /**
     * The realm issuer to require ({@code keycloak.issuer-uri}), with all whitespace and any trailing
     * slash removed. Whitespace matters: the JWKS URI is composed from it, so a trailing space on the
     * variable would land mid-URI and take the API down (nr-cbr hit exactly this). {@code null} when
     * not configured.
     */
    String expectedIssuer() {
        String uri = trimToNull(issuerUri);
        if (uri == null || uri.startsWith("${")) {
            return null;
        }
        String compact = uri.replaceAll("\\s+", "");
        return compact.endsWith("/") ? compact.substring(0, compact.length() - 1) : compact;
    }

    String expectedClientId() {
        return trimToNull(clientId);
    }

    public Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractSubject(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    public List<GrantedAuthority> extractAuthorities(String token) {
        final Claims claims = extractAllClaims(token);
        final List<GrantedAuthority> authorities = new ArrayList<>();

        final List<String> groups = extractRoleClaims(claims);
        LOGGER.debug("User with token has roles: {}", groups);

        if (!groups.isEmpty()) {
            // Map every defined role present in the token to a granted authority, using the canonical
            // role name so downstream authorization rules match it exactly. Matching is case-insensitive
            // and exact, except external roles which FAM delivers client-scoped as <role>_<clientNumber>
            // (e.g. SCS_OWNER_00001074) — those grant the base role authority; the client number is data
            // scope, read separately by extractForestClientNumbers.
            // Note: what each role reaches beyond the welcome page is decided by RolePermissions, which
            // is being filled in one role at a time; a role not yet enabled holds WELCOME_READ alone.
            for (String role : Roles.ALL_ROLES) {
                if (groups.stream().anyMatch(group -> groupGrantsRole(group, role))) {
                    authorities.add(new SimpleGrantedAuthority(role));
                }
            }
            LOGGER.debug("Assigned authorities from token groups: {}", authorities);
        }
        return authorities;
    }

    /**
     * True when a role claim grants the given role: an exact (case-insensitive) match, or — for an
     * external role FAM delivers client-scoped as {@code <role>_<clientNumber>} — the prefixed form
     * with an all-digits client suffix (e.g. {@code SCS_OWNER_00001074} grants {@code SCS_OWNER}).
     */
    private static boolean groupGrantsRole(String group, String role) {
        if (role.equalsIgnoreCase(group)) {
            return true;
        }
        if (Roles.isClientScoped(role)) {
            String prefix = role + "_";
            if (group.regionMatches(true, 0, prefix, 0, prefix.length())) {
                String suffix = group.substring(prefix.length());
                return !suffix.isEmpty() && suffix.chars().allMatch(Character::isDigit);
            }
        }
        return false;
    }

    /**
     * Extracts the set of forest client numbers that scope an external (BCeID) user's data access.
     * Reads the same role claims as {@link #extractAuthorities}, but is additive and
     * independent: the FAM forest-client-scoped groups have the shape {@code <role>_<clientNumber>}
     * (e.g. {@code SCS_OWNER_00001074}), so a group whose prefix is a recognised external role
     * contributes its (padded) numeric client-number suffix. Returns an empty set for internal users
     * (no such groups). Role gating stays in {@link #extractAuthorities} — this method never
     * contributes authorities.
     */
    public Set<String> extractForestClientNumbers(String token) {
        return extractForestClientNumbers(extractAllClaims(token));
    }

    Set<String> extractForestClientNumbers(Claims claims) {
        final List<String> groups = extractRoleClaims(claims);
        if (groups.isEmpty()) {
            return Set.of();
        }
        final Set<String> clientNumbers = new LinkedHashSet<>();
        for (String group : groups) {
            String clientNumber = clientNumberFromGroup(group);
            if (clientNumber != null) {
                clientNumbers.add(clientNumber);
            }
        }
        return clientNumbers;
    }

    /**
     * The caller's role strings: {@code client_roles} (CSS realm mappers) plus
     * {@code resource_access.<client-id>.roles} (stock Keycloak), trimmed, de-duplicated, with FAM's
     * {@code FAM:} bookkeeping entries dropped. Both locations are read because which one is populated
     * depends on how the integration is configured, and a switch would otherwise silently leave every
     * user with no roles. FAM delivers external roles client-scoped ({@code SCS_OWNER_00001074}) in the
     * same list; {@link #extractAuthorities} and {@link #extractForestClientNumbers} parse them as before.
     */
    List<String> extractRoleClaims(Claims claims) {
        List<String> roles = new ArrayList<>(asStringList(claims.get(CLIENT_ROLES_CLAIM)));
        Object resourceAccess = claims.get(RESOURCE_ACCESS_CLAIM);
        String expectedClientId = expectedClientId();
        if (resourceAccess instanceof Map<?, ?> byClient && expectedClientId != null
                && byClient.get(expectedClientId) instanceof Map<?, ?> forThisClient) {
            roles.addAll(asStringList(forThisClient.get("roles")));
        }
        return roles.stream()
            .filter(role -> role != null && !role.isBlank())
            .map(String::trim)
            .filter(role -> !role.toUpperCase(Locale.ROOT).startsWith(FAM_BOOKKEEPING_PREFIX))
            .distinct()
            .toList();
    }

    private static List<String> asStringList(Object claim) {
        if (!(claim instanceof Collection<?> values)) {
            return List.of();
        }
        return values.stream().filter(String.class::isInstance).map(String.class::cast).toList();
    }

    /**
     * Parses a single FAM forest-client-scoped group of the form {@code <role>_<clientNumber>}
     * (e.g. {@code SCS_OWNER_00001074}). Returns the padded client number when the group starts with a
     * recognised external role followed by an underscore and an all-digits client number; otherwise
     * {@code null} (unrecognised role, or a non-numeric / empty suffix). Requiring a numeric suffix
     * keeps a longer role that shares the prefix (e.g. {@code SCS_OWNER_MANAGER_…}) from being
     * mistaken for a client number.
     */
    private static String clientNumberFromGroup(String group) {
        if (group == null) {
            return null;
        }
        for (String role : Roles.CLIENT_SCOPED_ROLES) {
            String prefix = role + "_";
            if (group.regionMatches(true, 0, prefix, 0, prefix.length())) {
                String value = group.substring(prefix.length());
                if (!value.isEmpty() && value.chars().allMatch(Character::isDigit)) {
                    return padClientNumber(value);
                }
            }
        }
        return null;
    }

    public String getAuthenticatedUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        if (authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        Object details = authentication.getDetails();
        if (details instanceof String detailValue && !detailValue.isBlank() && !"anonymousUser".equalsIgnoreCase(detailValue)) {
            return detailValue;
        }
        return null;
    }

    /**
     * The user to attribute work to: the authenticated user, otherwise the identity in a {@code Bearer} token on
     * the given {@code Authorization} header value — its IdP username claim, then its subject. {@code null} when
     * none of them yields a non-blank value (including a missing or non-Bearer header).
     *
     * <p>Lives here, with the other token parsing, rather than in the services that need a username (it was
     * {@code ReportService.resolveUsername}). Callers pass the raw header value and get a name back.
     */
    public String resolveUsername(String authorizationHeader) {
        String username = getAuthenticatedUsername();
        if (!isBlank(username)) {
            return username;
        }
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        String token = authorizationHeader.substring(7);
        String tokenUserId = extractUserId(token);
        if (!isBlank(tokenUserId)) {
            return tokenUserId;
        }
        String tokenSubject = extractSubject(token);
        return !isBlank(tokenSubject) ? tokenSubject : null;
    }

}


