package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.repository.HaulingAuthorityRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TimberMarkServiceTest {

  @Mock private HaulingAuthorityRepository haulingAuthorityRepository;

  @InjectMocks private TimberMarkService service;

  @Test
  void timberMarkExists_trueWhenHaulingAuthorityHoldsTheMark() {
    when(haulingAuthorityRepository.timberMarkExists("ABC123")).thenReturn(true);

    assertTrue(service.timberMarkExists("ABC123"));
  }

  /**
   * Regression for UC-RPT-012 #4 / UC-RPT-005 #3 / UC-CHK-005 #1: existence is decided by
   * {@code HAULING_AUTHORITY} alone, as in legacy. A real mark with no hauling-mark authorization (no
   * designation yet) still exists — {@link TimberMarkService} has no dependency on the authorization view to
   * consult, which is the point of keeping it separate from {@link HaulMarkAuthorizationService}.
   */
  @Test
  void timberMarkExists_trueForAMarkWithNoHaulingMarkAuthorization() {
    when(haulingAuthorityRepository.timberMarkExists("AB6633")).thenReturn(true);

    assertTrue(service.timberMarkExists("AB6633"));
  }

  @Test
  void timberMarkExists_upperCasesMarkBeforeLookup() {
    // A lower-case-but-real mark must resolve: marks are stored upper-case, so the lookup is folded
    // rather than falsely reporting "does not exist".
    when(haulingAuthorityRepository.timberMarkExists("ABC123")).thenReturn(true);

    assertTrue(service.timberMarkExists("abc123"));

    verify(haulingAuthorityRepository).timberMarkExists("ABC123");
  }

  @Test
  void timberMarkExists_falseWhenHaulingAuthorityLacksTheMark() {
    when(haulingAuthorityRepository.timberMarkExists("NONE")).thenReturn(false);

    assertFalse(service.timberMarkExists("NONE"));
  }

  @Test
  void timberMarkExists_falseAndSkipsLookup_whenBlank() {
    assertFalse(service.timberMarkExists("   "));
    assertFalse(service.timberMarkExists(null));

    verify(haulingAuthorityRepository, never()).timberMarkExists(any());
  }

  /** The procedure's LIKE can't escape a wildcard, so "%" would otherwise match every hauling authority. */
  @Test
  void timberMarkExists_falseAndSkipsLookup_whenTheMarkHoldsALikeWildcard() {
    assertFalse(service.timberMarkExists("%"));
    assertFalse(service.timberMarkExists("AB%"));
    assertFalse(service.timberMarkExists("AB_633"));

    verify(haulingAuthorityRepository, never()).timberMarkExists(any());
  }
}
