package ca.bc.gov.nrs.scs.backend.security;

import java.util.Collection;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

/**
 * {@link org.springframework.security.core.Authentication} that additionally carries the user's
 * {@link UserAccessScope} (data-scoping / L4), kept deliberately separate from authorities (role
 * gating / RBAC — owned by a different effort).
 *
 * <p>Principal = the federated IdP user GUID ({@code idir_user_guid} — the IDIR euser GUID for IDIR;
 * {@code bceid_user_guid} for BCeID), so {@code getName()} returns it; details = the audit IdP username.
 * This is the contract {@code SecurityContextUtils.currentUserGuidOrNull()} depends on — the principal is
 * the identity GUID, NOT the token {@code sub}. (It previously was the subject; resolving identity from
 * {@code sub} was the bug this token's principal now fixes — keep principal = the IdP GUID.) The scope is
 * purely additive.
 */
public class ScsAuthenticationToken extends AbstractAuthenticationToken {

  private static final long serialVersionUID = 1L;

  private final Object principal;
  private final UserAccessScope scope;

  public ScsAuthenticationToken(
      Object principal,
      Collection<? extends GrantedAuthority> authorities,
      UserAccessScope scope) {
    super(authorities);
    this.principal = principal;
    this.scope = scope == null ? UserAccessScope.internal() : scope;
    setAuthenticated(true);
  }

  @Override
  public Object getCredentials() {
    return null;
  }

  @Override
  public Object getPrincipal() {
    return principal;
  }

  /** The current user's data-access scope (client numbers / org units). Never null. */
  public UserAccessScope scope() {
    return scope;
  }
}
