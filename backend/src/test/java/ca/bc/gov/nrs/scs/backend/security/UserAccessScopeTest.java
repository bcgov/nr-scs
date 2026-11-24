package ca.bc.gov.nrs.scs.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("UserAccessScope tests")
class UserAccessScopeTest {

  @Test
  void internal_hasEmptyScopesAndIsUnrestricted() {
    UserAccessScope scope = UserAccessScope.internal();

    assertTrue(scope.clientNumbers().isEmpty());
    assertTrue(scope.orgUnits().isEmpty());
    assertFalse(scope.isClientRestricted());
    assertFalse(scope.isOrgUnitRestricted());
  }

  @Test
  void ofClients_isClientRestrictedButNotOrgUnitRestricted() {
    UserAccessScope scope = UserAccessScope.ofClients(Set.of("00001074", "00005821"));

    assertEquals(Set.of("00001074", "00005821"), scope.clientNumbers());
    assertTrue(scope.isClientRestricted());
    assertFalse(scope.isOrgUnitRestricted());
    assertTrue(scope.orgUnits().isEmpty());
  }

  @Test
  void constructor_nullSetsBecomeEmpty() {
    UserAccessScope scope = new UserAccessScope(null, null);

    assertTrue(scope.clientNumbers().isEmpty());
    assertTrue(scope.orgUnits().isEmpty());
    assertFalse(scope.isClientRestricted());
  }

  @Test
  void clientNumbers_areDefensivelyCopiedAndImmutable() {
    Set<String> source = new HashSet<>(Set.of("00001074"));
    UserAccessScope scope = UserAccessScope.ofClients(source);

    // Mutating the source after construction must not change the scope.
    source.add("99999999");
    assertEquals(Set.of("00001074"), scope.clientNumbers());

    // The exposed set is unmodifiable.
    assertThrows(UnsupportedOperationException.class, () -> scope.clientNumbers().add("00000001"));
  }
}
