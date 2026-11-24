package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.model.ScaleMethodTypeLov;
import ca.bc.gov.nrs.scs.backend.model.SpeciesProductGradeXref;
import ca.bc.gov.nrs.scs.backend.model.StaticLov;
import ca.bc.gov.nrs.scs.backend.repository.LovRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("LovService tests")
class LovServiceTest {

  @Mock
  private LovRepository repository;

  @InjectMocks
  private LovService service;

  @Test
  void getScaleMethodTypeLov_delegatesToRepository() {
    List<ScaleMethodTypeLov> rows = List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale"),
        new ScaleMethodTypeLov().code("P").description("Piece Scale"));
    when(repository.getScaleMethodTypeLov("W", "%Weight%")).thenReturn(rows);

    List<ScaleMethodTypeLov> result = service.getScaleMethodTypeLov("W", "%Weight%");

    assertEquals(rows, result);
    verify(repository).getScaleMethodTypeLov("W", "%Weight%");
  }

  @Test
  void getSpeciesProductGradeXref_delegatesToRepository() {
    List<SpeciesProductGradeXref> rows = List.of(
        new SpeciesProductGradeXref().scaleSpeciesCode("FI").scaleProductCode("LT").scaleGradeCode("1"),
        new SpeciesProductGradeXref().scaleSpeciesCode("FI").scaleProductCode("XM").scaleGradeCode("xmFI"));
    when(repository.getSpeciesProductGradeXref()).thenReturn(rows);

    List<SpeciesProductGradeXref> result = service.getSpeciesProductGradeXref();

    assertEquals(rows, result);
    verify(repository).getSpeciesProductGradeXref();
  }

  @Test
  void getStaticLov_returnsAllRowsWhenTableKeyMissing() {
    List<StaticLov> rows = List.of(
        new StaticLov().tableKey("SCALE_GRADING_SYSTEM_CODE").code("C").description("Coastal"),
        new StaticLov().tableKey("SCALE_METHOD_TYPE_CODE").code("C").description("Cruise Based"));
    when(repository.getStaticLov(null)).thenReturn(rows);

    List<StaticLov> result = service.getStaticLov(null);

    assertEquals(rows, result);
    verify(repository).getStaticLov(null);
  }

  @Test
  void getStaticLov_filtersRowsToRequestedTableKey() {
    List<StaticLov> rows = List.of(
        new StaticLov().tableKey("SCALE_GRADING_SYSTEM_CODE").code("B").description("Both"),
        new StaticLov().tableKey("SCALE_GRADING_SYSTEM_CODE").code("C").description("Coastal"),
        new StaticLov().tableKey("SCALE_METHOD_TYPE_CODE").code("C").description("Cruise Based"));
    when(repository.getStaticLov(" SCALE_GRADING_SYSTEM_CODE ")).thenReturn(rows);

    List<StaticLov> result = service.getStaticLov(" SCALE_GRADING_SYSTEM_CODE ");

    assertEquals(2, result.size());
    assertEquals("SCALE_GRADING_SYSTEM_CODE", result.getFirst().getTableKey().get());
    assertEquals("B", result.getFirst().getCode().get());
    assertEquals("C", result.get(1).getCode().get());
    assertEquals("Coastal", result.get(1).getDescription().get());
    verify(repository).getStaticLov(" SCALE_GRADING_SYSTEM_CODE ");
  }

  @Test
  void getStaticLovDescriptionMap_upperCasesKeysAndMapsBlankToNull() {
    List<StaticLov> rows = List.of(
        new StaticLov().tableKey("SCALER_PERFORMANCE_ACTN_CODE").code("w").description("Warning"),
        new StaticLov().tableKey("SCALER_PERFORMANCE_ACTN_CODE").code("S").description("   "));
    when(repository.getStaticLov("SCALER_PERFORMANCE_ACTN_CODE")).thenReturn(rows);

    Map<String, String> result =
        service.getStaticLovDescriptionMap("SCALER_PERFORMANCE_ACTN_CODE");

    // Keys are upper-cased for case-insensitive lookup.
    assertEquals("Warning", result.get("W"));
    // A blank description is present but maps to null so callers fall back to the raw code.
    assertTrue(result.containsKey("S"));
    assertNull(result.get("S"));
  }
}

