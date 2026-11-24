package ca.bc.gov.nrs.scs.backend.security;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isUuidLike;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;

import ca.bc.gov.nrs.scs.backend.exception.ForbiddenException;
import java.util.Set;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityContextUtils {

  private SecurityContextUtils() {
  }

  public static String currentUserIdOrSystem() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null) {
      return "SYSTEM";
    }

    Object details = auth.getDetails();
    String userId = (details instanceof String detailValue) ? trimToNull(detailValue) : null;
    if (userId == null) {
      throw new IllegalStateException(
          "Authenticated request is missing the idp_username required for audit fields");
    }
    return userId;
  }

  public static String currentUserGuidOrNull() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null) {
      return null;
    }

    String principalName = trimToNull(auth.getName());
    if (isUuidLike(principalName)) {
      return principalName;
    }

    Object details = auth.getDetails();
    if (details instanceof String detailValue) {
      String normalizedDetailValue = trimToNull(detailValue);
      if (isUuidLike(normalizedDetailValue)) {
        return normalizedDetailValue;
      }
    }

    return null;
  }

  /**
   * The forest client number(s) that scope the current user's data access (padded to the SCS
   * {@code client_number} format). Empty for internal/unrestricted users — the data layer applies
   * no client filtering in that case. Populated only for external (BCeID) users authenticated via a
   * {@link ScsAuthenticationToken}.
   */
  public static Set<String> currentUserClientNumbers() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth instanceof ScsAuthenticationToken scsAuth) {
      return scsAuth.scope().clientNumbers();
    }
    return Set.of();
  }

  /**
   * True when the current user is restricted to one or more forest clients (an external user), so
   * the data layer must scope reads and searches to {@link #currentUserClientNumbers()}. False for
   * internal users.
   */
  public static boolean isClientRestricted() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    return auth instanceof ScsAuthenticationToken scsAuth && scsAuth.scope().isClientRestricted();
  }

  /**
   * The single forest client the current request acts as. One client at a time (legacy WebADE
   * selected-org parity), but a multi-client user chooses which via the client switcher: both
   * authentication filters run entitlement through {@link ActiveClientResolver}, which narrows the
   * scope to exactly one client before authentication completes. Call only after
   * {@link #isClientRestricted()} is true.
   */
  public static String currentUserClientNumber() {
    Set<String> clientNumbers = currentUserClientNumbers();
    if (clientNumbers.isEmpty()) {
      // Programming error, not a client decision: this must only be called for a client-restricted
      // user (guard with isClientRestricted()).
      throw new IllegalStateException(
          "currentUserClientNumber() requires a client-restricted user; guard the call with "
          + "isClientRestricted().");
    }
    if (clientNumbers.size() > 1) {
      // Unreachable through either authentication filter; kept so a future path that builds a token
      // without the resolver fails closed rather than scoping to an arbitrary one of the clients.
      throw new ForbiddenException("Request scope was not narrowed to a single forest client.");
    }
    return clientNumbers.iterator().next();
  }

  /**
   * Whether the current request carries the given role authority. Both authentication filters add the
   * canonical role name as an authority of its own (alongside the permissions it expands to), so this
   * matches exactly the names in {@code Roles}.
   *
   * <p>Used where two client-restricted roles need <i>different data scopes</i> rather than different
   * permissions — see {@link ClientScopeGuard}, where the owner reaches scalers authorized at a site it
   * owns and the industry scaler reaches sites its own scalers are authorized at. A permission cannot
   * express that: both roles hold {@code SCALER_READ}, and it is the reachable rows that differ.
   */
  public static boolean hasRole(String role) {
    if (role == null) {
      return false;
    }
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null) {
      return false;
    }
    return auth.getAuthorities().stream()
        .anyMatch(authority -> role.equals(authority.getAuthority()));
  }

  /**
   * Per-record access guard for detail/summary reads: refuses with 403 when the current user is
   * client-restricted and {@code recordClientNumber} is not their forest client. A no-op for
   * internal users. Port of legacy {@code SecurityUtils.hasScalerAccess}; call after the record is
   * loaded (so a genuinely missing record still 404s first).
   *
   * <p><b>Ownership equality only — no role knows anything here.</b> For a scaler or a scale site, use
   * {@link ClientScopeGuard} instead ({@code assertScalerRecordInScope} /
   * {@code assertScaleSiteInScope}): those honour the per-role bridges, and this one silently does not.
   * Using it on a scaler is how a Scale Site Owner's §4 access to "scalers authorized to scale at their
   * sites" came to be admitted by the interceptor and then refused by the service. It has no production
   * callers left for exactly that reason; it survives as the primitive those guards are built on.
   */
  public static void assertClientAccess(String recordClientNumber) {
    if (isClientRestricted() && !currentUserClientNumber().equals(recordClientNumber)) {
      throw new ForbiddenException("You do not have access to records for this client.");
    }
  }
}


