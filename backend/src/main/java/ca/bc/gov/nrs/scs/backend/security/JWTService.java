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
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class JWTService {

    private static final Logger LOGGER = LoggerFactory.getLogger(JWTService.class);

    static final String IDP_USERNAME_CLAIM = "custom:idp_username";
    // The IDIR euser GUID — not the Cognito `sub` (a different UUID that must not stand in as identity).
    static final String IDP_USER_GUID_CLAIM = "custom:idp_user_id";
    private static final String JWKS_PATH_SUFFIX = "/.well-known/jwks.json";

    @Value("${jwt.issuer.jwks-uri:}")
    private String jwksUri;

    /**
     * Expected token issuer ({@code iss}). When blank it is derived from the JWKS URI (Cognito's
     * issuer is the JWKS base URL), so issuer validation is always active whenever JWT auth is on.
     */
    @Value("${jwt.issuer:}")
    private String configuredIssuer;

    /** Expected token audience ({@code aud}) — the Cognito app client id. Enforced when set. */
    @Value("${jwt.audience:}")
    private String audience;

    // The JwkProvider will handle caching of public keys for us.
    private JwkProvider provider;

    @PostConstruct
    public void init() throws MalformedURLException {
        if (jwksUri == null || jwksUri.trim().isEmpty() || jwksUri.startsWith("${")) {
            LOGGER.warn("JWT JWKS URI is not configured. JWTService warmup skipped.");
            return;
        }

        if (expectedIssuer() == null) {
            LOGGER.warn("JWT issuer validation is DISABLED: neither 'jwt.issuer' nor a derivable "
                + "issuer from 'jwt.issuer.jwks-uri' is available. Tokens will not be checked against "
                + "an expected issuer.");
        }
        if (trimToNull(audience) == null) {
            LOGGER.warn("JWT audience validation is DISABLED: 'jwt.audience' is not set. Tokens minted "
                + "for a different app client (same user pool) will be accepted. Set 'jwt.audience' to "
                + "the Cognito app client id.");
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

            // 2. Initialize the JwkProvider using the configured jwt.issuer.jwks-uri.
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
        return URI.create(jwksUri).toURL();
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
     * The Cognito {@code sub} — a per-user-pool UUID, NOT the user's identity. Named {@code extractSubject}
     * (not {@code extractUsername}) deliberately: reading identity from {@code sub} was the original bug.
     * Use {@link #extractUserGuid} for identity and {@link #extractUserId} for the audit username.
     */
    public String extractSubject(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        return extractUserId(claims);
    }

    String extractUserId(Claims claims) {
        Object value = claims.get(IDP_USERNAME_CLAIM);
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    /**
     * The federated IdP user GUID ({@code custom:idp_user_id}) — the user's identity, not the Cognito
     * {@code sub}. The IDIR euser GUID for IDIR users; the BCeID GUID for BCeID users. Cognito's attribute
     * mapping populates it per IdP (confirmed for IDIR and BCeID Business); {@code null} if absent.
     */
    public String extractUserGuid(String token) {
        return extractUserGuid(extractAllClaims(token));
    }

    String extractUserGuid(Claims claims) {
        Object value = claims.get(IDP_USER_GUID_CLAIM);
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
                "JWKS provider is not initialized. Check jwt.issuer.jwks-uri configuration.",
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

        // Reject tokens minted for a different Cognito user pool (issuer) or app client (audience),
        // even if they are signed with a key this JWKS endpoint trusts.
        String expectedIssuer = expectedIssuer();
        if (expectedIssuer != null) {
            parserBuilder.requireIssuer(expectedIssuer);
        }
        String expectedAudience = trimToNull(audience);
        if (expectedAudience != null) {
            parserBuilder.requireAudience(expectedAudience);
        }

        return parserBuilder
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * The issuer to require on incoming tokens: the explicitly configured {@code jwt.issuer} if set,
     * otherwise the JWKS URI with its {@code /.well-known/jwks.json} suffix stripped (the Cognito
     * issuer). Returns {@code null} when neither is available, in which case issuer validation is
     * skipped (logged as a warning at startup).
     */
    String expectedIssuer() {
        String explicit = trimToNull(configuredIssuer);
        if (explicit != null) {
            return explicit;
        }
        String uri = trimToNull(jwksUri);
        if (uri != null && uri.endsWith(JWKS_PATH_SUFFIX)) {
            return uri.substring(0, uri.length() - JWKS_PATH_SUFFIX.length());
        }
        return null;
    }

    public Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractSubject(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    @SuppressWarnings("unchecked")
    public List<GrantedAuthority> extractAuthorities(String token) {
        final Claims claims = extractAllClaims(token);
        final List<GrantedAuthority> authorities = new ArrayList<>();

        final List<String> groups = claims.get("cognito:groups", List.class);
        LOGGER.debug("User with token has groups: {}", groups == null ? "null" : groups.toString());

        if (groups != null) {
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
     * True when a Cognito group grants the given role: an exact (case-insensitive) match, or — for an
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
     * Reads the same {@code cognito:groups} claim as {@link #extractAuthorities}, but is additive and
     * independent: the FAM forest-client-scoped groups have the shape {@code <role>_<clientNumber>}
     * (e.g. {@code SCS_OWNER_00001074}), so a group whose prefix is a recognised external role
     * contributes its (padded) numeric client-number suffix. Returns an empty set for internal users
     * (no such groups). Role gating stays in {@link #extractAuthorities} — this method never
     * contributes authorities.
     */
    public Set<String> extractForestClientNumbers(String token) {
        return extractForestClientNumbers(extractAllClaims(token));
    }

    @SuppressWarnings("unchecked")
    Set<String> extractForestClientNumbers(Claims claims) {
        final List<String> groups = claims.get("cognito:groups", List.class);
        if (groups == null || groups.isEmpty()) {
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


