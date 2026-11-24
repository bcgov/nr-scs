package ca.bc.gov.nrs.scs.backend.security;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.padClientNumber;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;

import java.util.Comparator;
import java.util.Set;

/**
 * Resolves the single forest client a request acts as. Exactly one of a multi-client user's clients is
 * in scope per request; the frontend's switcher names it in {@value #ACTIVE_CLIENT_HEADER}.
 *
 * <p>Entitlement comes from the token — the header only selects within it, so it can widen nothing.
 */
public final class ActiveClientResolver {

  /** Names the client the caller is acting as. Ignored unless it selects one the token granted. */
  public static final String ACTIVE_CLIENT_HEADER = "X-Active-Client";

  private ActiveClientResolver() {
  }

  /** Raised when the requested client is not one the caller's token entitles them to. */
  public static final class ClientNotEntitledException extends RuntimeException {
    ClientNotEntitledException(String message) {
      super(message);
    }
  }

  /**
   * @param entitledClientNumbers every client the token grants; empty for an internal user
   * @param requestedClientNumber the {@value #ACTIVE_CLIENT_HEADER} value, or null/blank if absent
   * @return internal scope for an internal user, else exactly one client — the requested one when
   *     entitled, otherwise the lowest-numbered
   * @throws ClientNotEntitledException when a client is requested that the token does not grant
   */
  public static UserAccessScope resolve(
      Set<String> entitledClientNumbers, String requestedClientNumber) {
    if (entitledClientNumbers == null || entitledClientNumbers.isEmpty()) {
      // Ignored for internal users: honouring it would silently narrow their admin screens.
      return UserAccessScope.internal();
    }

    String requested = trimToNull(requestedClientNumber);
    if (requested == null) {
      return UserAccessScope.ofClients(Set.of(lowestNumbered(entitledClientNumbers)));
    }

    // Padded like the token's own values, so a switcher sending "1074" matches stored "00001074".
    String padded = padClientNumber(requested);
    if (!entitledClientNumbers.contains(padded)) {
      // Refused rather than downgraded to an entitled client: a silent fallback would let a caller
      // probe which clients are theirs by watching whether the response changed.
      throw new ClientNotEntitledException(
          "Requested client is not one this user is entitled to act as");
    }
    return UserAccessScope.ofClients(Set.of(padded));
  }

  /**
   * The default active client. Sorted rather than first-of-set so the default cannot vary between
   * requests; client numbers are zero-padded, so a string sort orders them numerically.
   */
  static String lowestNumbered(Set<String> clientNumbers) {
    return clientNumbers.stream().sorted(Comparator.naturalOrder()).findFirst().orElseThrow();
  }

}
