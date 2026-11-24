package ca.bc.gov.nrs.scs.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.security.ActiveClientResolver.ClientNotEntitledException;
import java.util.LinkedHashSet;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("ActiveClientResolver — which client a request acts as")
class ActiveClientResolverTest {

  private static final Set<String> THREE_CLIENTS =
      Set.of("00001074", "00002000", "00003111");

  @Nested
  @DisplayName("internal users")
  class Internal {

    /**
     * The header is ignored rather than honoured for an internal user. Honouring it would let an
     * administrator silently scope themselves to one client, narrowing admin screens with no
     * indication why — and the switcher exists to choose among *entitlements*, which they have none.
     */
    @Test
    @DisplayName("an internal user stays unrestricted even if a client is requested")
    void internalUserIgnoresTheHeader() {
      assertEquals(UserAccessScope.internal(), ActiveClientResolver.resolve(Set.of(), null));
      assertEquals(UserAccessScope.internal(), ActiveClientResolver.resolve(Set.of(), "00001074"));
      assertEquals(UserAccessScope.internal(), ActiveClientResolver.resolve(null, "00001074"));
      assertFalse(ActiveClientResolver.resolve(Set.of(), "00001074").isClientRestricted());
    }
  }

  @Nested
  @DisplayName("exactly one client is active")
  class SingleActiveClient {

    @Test
    @DisplayName("a single-client user resolves to that client")
    void singleClient() {
      UserAccessScope scope = ActiveClientResolver.resolve(Set.of("00001074"), null);

      assertEquals(Set.of("00001074"), scope.clientNumbers());
      assertTrue(scope.isClientRestricted());
    }

    @Test
    @DisplayName("with no header, a multi-client user gets the lowest-numbered client")
    void defaultsToLowestNumbered() {
      assertEquals(
          Set.of("00001074"), ActiveClientResolver.resolve(THREE_CLIENTS, null).clientNumbers());
      assertEquals(
          Set.of("00001074"), ActiveClientResolver.resolve(THREE_CLIENTS, "  ").clientNumbers());
    }

    /**
     * The default must not vary between requests, or a multi-client user's scope would drift with set
     * iteration order — the same request returning different rows each time. Asserted against an
     * insertion-ordered set whose first element is deliberately *not* the lowest.
     */
    @Test
    @DisplayName("the default is deterministic, not set-iteration order")
    void defaultIsDeterministic() {
      Set<String> worstCaseOrder = new LinkedHashSet<>();
      worstCaseOrder.add("00003111");
      worstCaseOrder.add("00002000");
      worstCaseOrder.add("00001074");

      assertEquals(
          Set.of("00001074"), ActiveClientResolver.resolve(worstCaseOrder, null).clientNumbers());
      assertEquals("00001074", ActiveClientResolver.lowestNumbered(worstCaseOrder));
    }

    @Test
    @DisplayName("a requested entitled client wins over the default")
    void requestedClientIsHonoured() {
      assertEquals(
          Set.of("00003111"),
          ActiveClientResolver.resolve(THREE_CLIENTS, "00003111").clientNumbers());
    }

    @Test
    @DisplayName("only ever one client is in scope, never the union")
    void neverTheUnion() {
      for (String requested : new String[] {null, "00001074", "00002000", "00003111"}) {
        assertEquals(1, ActiveClientResolver.resolve(THREE_CLIENTS, requested).clientNumbers().size());
      }
    }

    /** A switcher sending an unpadded number still selects the stored, padded client. */
    @Test
    @DisplayName("an unpadded request matches the padded entitlement")
    void unpaddedRequestIsPadded() {
      assertEquals(
          Set.of("00001074"), ActiveClientResolver.resolve(THREE_CLIENTS, "1074").clientNumbers());
    }
  }

  @Nested
  @DisplayName("entitlement comes from the token, never the header")
  class Entitlement {

    /**
     * The core security property: the header selects among what the token granted, it cannot add to
     * it. Rejecting rather than falling back also matters — a silent fallback would let a caller
     * enumerate which clients are theirs by watching whether the response changed.
     */
    @Test
    @DisplayName("requesting a client the token does not grant is refused")
    void unentitledClientIsRefused() {
      assertThrows(
          ClientNotEntitledException.class,
          () -> ActiveClientResolver.resolve(THREE_CLIENTS, "00009999"));
    }

    @Test
    @DisplayName("a single-client user cannot switch to someone else's client")
    void singleClientUserCannotEscape() {
      assertThrows(
          ClientNotEntitledException.class,
          () -> ActiveClientResolver.resolve(Set.of("00001074"), "00002000"));
    }

    @Test
    @DisplayName("a non-numeric or garbage header value is refused, not ignored")
    void garbageIsRefused() {
      assertThrows(
          ClientNotEntitledException.class,
          () -> ActiveClientResolver.resolve(THREE_CLIENTS, "not-a-client"));
      assertThrows(
          ClientNotEntitledException.class,
          () -> ActiveClientResolver.resolve(THREE_CLIENTS, "00001074,00002000"),
          "a comma-separated list is not a single active client and must not widen scope");
    }
  }
}
