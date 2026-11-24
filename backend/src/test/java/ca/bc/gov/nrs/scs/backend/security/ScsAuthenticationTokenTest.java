package ca.bc.gov.nrs.scs.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.constants.Roles;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@DisplayName("ScsAuthenticationToken tests")
class ScsAuthenticationTokenTest {

  @Test
  void preservesPrincipalDetailsAndAuthoritiesLikeTheStockToken() {
    // getName() must return the principal (the subject/GUID) so currentUserGuidOrNull keeps working,
    // and details must remain the idp_username string the audit readers expect.
    var token = new ScsAuthenticationToken(
        "the-subject",
        List.of(new SimpleGrantedAuthority(Roles.SCS_SYS_ADMIN)),
        UserAccessScope.internal());
    token.setDetails("JSMITH");

    assertEquals("the-subject", token.getPrincipal());
    assertEquals("the-subject", token.getName());
    assertEquals("JSMITH", token.getDetails());
    assertNull(token.getCredentials());
    assertTrue(token.isAuthenticated());
    assertEquals(1, token.getAuthorities().size());
  }

  @Test
  void carriesTheAccessScope() {
    UserAccessScope scope = UserAccessScope.ofClients(Set.of("00001074"));
    var token = new ScsAuthenticationToken("sub", List.of(), scope);

    assertSame(scope, token.scope());
    assertEquals(Set.of("00001074"), token.scope().clientNumbers());
  }

  @Test
  void nullScopeDefaultsToInternal() {
    var token = new ScsAuthenticationToken("sub", List.of(), null);

    assertEquals(UserAccessScope.internal(), token.scope());
    assertTrue(token.scope().clientNumbers().isEmpty());
  }
}
