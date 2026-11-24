package ca.bc.gov.nrs.scs.backend.domain.shared;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class YesNoTest {

  @Test
  void fromCode_resolvesYAndN_trimmedAndCaseInsensitive() {
    assertEquals(YesNo.Y, YesNo.fromCode("Y"));
    assertEquals(YesNo.N, YesNo.fromCode("N"));
    assertEquals(YesNo.Y, YesNo.fromCode(" y "));
    assertEquals(YesNo.N, YesNo.fromCode("n"));
  }

  @Test
  void fromCode_isLenient_unrecognizedCodesReturnNull() {
    // Read paths convert legacy data; a dirty indicator must blank the cell, not throw.
    assertNull(YesNo.fromCode("U"));
    assertNull(YesNo.fromCode("YES"));
    assertNull(YesNo.fromCode("0"));
  }

  @Test
  void fromCode_nullAndBlankReturnNull() {
    assertNull(YesNo.fromCode(null));
    assertNull(YesNo.fromCode(""));
    assertNull(YesNo.fromCode("   "));
  }

  @Test
  void toCodeAndToLabel_areNullSafe() {
    assertEquals("Y", YesNo.toCode(YesNo.Y));
    assertNull(YesNo.toCode(null));
    assertEquals("Yes", YesNo.toLabel(YesNo.Y));
    assertEquals("No", YesNo.toLabel(YesNo.N));
    assertNull(YesNo.toLabel(null));
  }
}
