package ca.bc.gov.nrs.scs.backend.util;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;

@DisplayName("SCSUtils tests")
class SCSUtilsTest {

  @Test
  void trimToNull_returnsNullForNullAndBlankValues() {
    assertNull(SCSUtils.trimToNull(null));
    assertNull(SCSUtils.trimToNull("   "));
  }

  @Test
  void trimToNull_trimsNonBlankValues() {
    assertEquals("abc", SCSUtils.trimToNull("  abc  "));
  }

  @Test
  void upperOrNull_trimsAndUppercasesValues() {
    assertEquals("ABC123", SCSUtils.upperOrNull("  abc123  "));
    assertNull(SCSUtils.upperOrNull("\t  \n"));
  }

  @Test
  void isUuidLike_acceptsHyphenatedAndLegacyHexGuids() {
    assertTrue(SCSUtils.isUuidLike("11111111-1111-1111-1111-111111111111"));
    assertTrue(SCSUtils.isUuidLike("F5E59074276C40558FF6A17CF1AB3EC2"));
    assertTrue(SCSUtils.isUuidLike("  f5e59074276c40558ff6a17cf1ab3ec2  "));
  }

  @Test
  void isUuidLike_rejectsBlankAndNonGuidValues() {
    assertFalse(SCSUtils.isUuidLike(null));
    assertFalse(SCSUtils.isUuidLike("   "));
    assertFalse(SCSUtils.isUuidLike("not-a-guid"));
    assertFalse(SCSUtils.isUuidLike("Z5E59074276C40558FF6A17CF1AB3EC2"));
  }

  @Test
  void isBlank_matchesTrimToNullSemantics() {
    assertTrue(SCSUtils.isBlank(null));
    assertTrue(SCSUtils.isBlank("  "));
    assertFalse(SCSUtils.isBlank(" x "));
  }

  @Test
  void padClientNumber_null_returnsNull() {
    assertNull(SCSUtils.padClientNumber(null));
  }

  @Test
  void padClientNumber_empty_returnsEmpty() {
    assertEquals("", SCSUtils.padClientNumber(""));
  }

  @Test
  void padClientNumber_shortPadsToEight() {
    assertEquals("00000017", SCSUtils.padClientNumber("17"));
    assertEquals("00001234", SCSUtils.padClientNumber("1234"));
  }

  @Test
  void padClientNumber_eightCharsUnchanged() {
    assertEquals("12345678", SCSUtils.padClientNumber("12345678"));
  }

  @Test
  void padClientNumberCriterion_blankIsNoFilter() {
    assertNull(SCSUtils.padClientNumberCriterion(null));
    assertNull(SCSUtils.padClientNumberCriterion("   "));
  }

  /** A {@code %} can span any number of positions, so the value passes through raw (no padding). */
  @Test
  void padClientNumberCriterion_percentPassesThroughRaw() {
    assertEquals("00021%", SCSUtils.padClientNumberCriterion("00021%"));
    assertEquals("%", SCSUtils.padClientNumberCriterion("%"));
  }

  /**
   * The legacy single-character {@code _} wildcard is zero-padded like any other value, because it
   * occupies exactly one position and the stored client number is a fixed 8 wide (legacy
   * {@code ClientVwDto.setClientNumber} → {@code padClientNumber}, unconditionally). So "100_" pads
   * to "0000100_", whose LIKE matches "00001009"; a term must include enough leading zeros that the
   * wildcard lands on the digit it is meant to cover — "000010_" pads to "0000010_" (matching
   * 00000100-00000109), not "00001009".
   */
  @Test
  void padClientNumberCriterion_singleCharWildcardIsPadded() {
    assertEquals("0000100_", SCSUtils.padClientNumberCriterion("100_"));
    assertEquals("000025_0", SCSUtils.padClientNumberCriterion("25_0"));
    assertEquals("0000010_", SCSUtils.padClientNumberCriterion("000010_"));
  }

  @Test
  void requireDateOrder_allowsNullOrOrderedDates() {
    assertDoesNotThrow(() -> SCSUtils.requireDateOrder(null, null, "ignored"));
    assertDoesNotThrow(() -> SCSUtils.requireDateOrder(
        java.time.LocalDate.of(2026, 1, 1),
        java.time.LocalDate.of(2026, 1, 2),
        "ignored"));
  }

  @Test
  void requireDateOrder_throwsBadRequestWhenDatesAreOutOfOrder() {
    java.time.LocalDate fromDate = java.time.LocalDate.of(2026, 1, 2);
    java.time.LocalDate toDate = java.time.LocalDate.of(2026, 1, 1);

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> SCSUtils.requireDateOrder(fromDate, toDate, "dates out of order"));

    assertEquals("dates out of order", ex.getMessage());
  }

  @Test
  void isPresent_trueOnlyWhenJsonNullableHasNonNullValue() {
    assertFalse(SCSUtils.isPresent(null));
    assertFalse(SCSUtils.isPresent(JsonNullable.undefined()));
    assertFalse(SCSUtils.isPresent(JsonNullable.of(null)));
    assertTrue(SCSUtils.isPresent(JsonNullable.of("value")));
  }

  @Test
  void getNullable_returnsUnderlyingValueOrNull() {
    assertNull(SCSUtils.getNullable(null));
    assertNull(SCSUtils.getNullable(JsonNullable.undefined()));
    assertNull(SCSUtils.getNullable(JsonNullable.of(null)));
    assertEquals("value", SCSUtils.getNullable(JsonNullable.of("value")));
  }

  @Test
  void requireText_throwsBadRequestWhenNullOrBlank() {
    assertThrows(BadRequestException.class, () -> SCSUtils.requireText(null, "msg"));
    assertThrows(BadRequestException.class, () -> SCSUtils.requireText("  ", "msg"));
  }

  @Test
  void requireText_returnsValueWhenPresent() {
    assertEquals("A12345", SCSUtils.requireText("A12345", "msg"));
  }

  @Test
  void requireFound_throwsNotFoundWhenNull() {
    assertThrows(ResourceNotFoundException.class, () -> SCSUtils.requireFound(null, "msg"));
  }

  @Test
  void requireFound_returnsEntityWhenPresent() {
    Object entity = new Object();
    assertEquals(entity, SCSUtils.requireFound(entity, "msg"));
  }

  // ─── sanitizeForLog ─────────────────────────────────────────────────────────

  @Test
  void sanitizeForLog_returnsNullForNull() {
    assertNull(SCSUtils.sanitizeForLog(null));
  }

  @Test
  void sanitizeForLog_neutralisesLineBreaksSoALogRecordCannotBeForged() {
    assertEquals("GET /api__INFO forged line", SCSUtils.sanitizeForLog("GET /api\r\nINFO forged line"));
    assertEquals("a_b_c", SCSUtils.sanitizeForLog("a\nb\rc"));
  }

  @Test
  void sanitizeForLog_neutralisesOtherControlCharacters() {
    assertEquals("tab_bell_esc_", SCSUtils.sanitizeForLog("tab\tbell\u0007esc\u001b"));
  }

  @Test
  void sanitizeForLog_truncatesOverLongValues() {
    String sanitized = SCSUtils.sanitizeForLog("x".repeat(500));
    assertTrue(sanitized.startsWith("x".repeat(200)));
    assertTrue(sanitized.endsWith("...[truncated]"));
    assertEquals(200 + "...[truncated]".length(), sanitized.length());
  }

  @Test
  void sanitizeForLog_leavesOrdinaryValuesAloneAndUsesToStringForObjects() {
    assertEquals("SITE-001/3", SCSUtils.sanitizeForLog("SITE-001/3"));
    assertEquals("42", SCSUtils.sanitizeForLog(42));
  }

  // ─── mapNullable ────────────────────────────────────────────────────────────

  @Test
  void mapNullable_returnsNullForNullWithoutInvokingTheMapper() {
    assertNull(SCSUtils.mapNullable(null, v -> {
      throw new AssertionError("mapper must not run for null");
    }));
  }

  @Test
  void mapNullable_appliesTheMapperOtherwise() {
    assertEquals("ABC", SCSUtils.mapNullable("abc", String::toUpperCase));
    assertEquals(3, SCSUtils.mapNullable("abc", String::length));
  }
}
