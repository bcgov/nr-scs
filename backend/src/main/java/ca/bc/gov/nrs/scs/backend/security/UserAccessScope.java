package ca.bc.gov.nrs.scs.backend.security;

import java.io.Serializable;
import java.util.Set;

/**
 * Immutable data-scoping (L4) descriptor for the current user: which rows they may see. Carried on
 * {@link ScsAuthenticationToken} and read at the service layer via {@link SecurityContextUtils}.
 *
 * <p>Two independent dimensions: {@code clientNumbers} (forest-client scope) and
 * {@code orgUnits} (org-unit scope, populated by a later feature). An empty scope denotes an
 * internal/unrestricted user, so no data filtering is applied.
 */
public record UserAccessScope(Set<String> clientNumbers, Set<String> orgUnits) implements Serializable {

  private static final UserAccessScope INTERNAL = new UserAccessScope(Set.of(), Set.of());

  public UserAccessScope {
    clientNumbers = clientNumbers == null ? Set.of() : Set.copyOf(clientNumbers);
    orgUnits = orgUnits == null ? Set.of() : Set.copyOf(orgUnits);
  }

  /** Scope for an internal/unrestricted user — no client or org-unit filtering. */
  public static UserAccessScope internal() {
    return INTERNAL;
  }

  /** Client-scoped external user; the org-unit dimension is empty. */
  public static UserAccessScope ofClients(Set<String> clientNumbers) {
    return new UserAccessScope(clientNumbers, Set.of());
  }

  public boolean isClientRestricted() {
    return !clientNumbers.isEmpty();
  }

  public boolean isOrgUnitRestricted() {
    return !orgUnits.isEmpty();
  }
}
