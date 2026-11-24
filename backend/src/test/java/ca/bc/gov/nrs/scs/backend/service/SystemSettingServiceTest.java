package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.SystemSetting;
import ca.bc.gov.nrs.scs.backend.model.SystemSettingUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.SystemSettingRepository;
import ca.bc.gov.nrs.scs.backend.repository.SystemSettingRepository.SystemSettingRecord;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("SystemSettingService Tests")
class SystemSettingServiceTest {

  @Mock private SystemSettingRepository repository;

  @InjectMocks private SystemSettingService service;

  private SystemSettingRecord record(String value) {
    return new SystemSettingRecord("WMSG", "Current News", value, null, "SYSTEM", null, "SYSTEM", 1L);
  }

  @Test
  void update_blankValue_throwsRequiredWithMeaningfulMessage() {
    // Empty value would hit a NOT NULL violation at the DB (a generic 500); the service must translate it
    // to a clean 400 with a meaningful message instead.
    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.updateSystemSetting("WMSG", new SystemSettingUpdateRequest("")));
    assertTrue(ex.getMessage().contains("is required"),
        "message should state the field is required, was: " + ex.getMessage());
    verify(repository, never()).updateSystemSetting(any(), any(), any(), any(), any());
  }

  @Test
  void update_overLengthValue_throwsMaxLengthWithMeaningfulMessage() {
    String tooLong = "X".repeat(4001);
    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.updateSystemSetting("WMSG", new SystemSettingUpdateRequest(tooLong)));
    assertTrue(ex.getMessage().contains("4000 characters"),
        "message should state the 4000-character limit, was: " + ex.getMessage());
    verify(repository, never()).updateSystemSetting(any(), any(), any(), any(), any());
  }

  @Test
  void update_valueAt4000_isAccepted() {
    String maxValue = "X".repeat(4000);
    when(repository.getSystemSetting("WMSG")).thenReturn(record("old"));
    when(repository.updateSystemSetting(eq("WMSG"), any(), eq(maxValue), any(), any()))
        .thenReturn(record(maxValue));

    SystemSetting saved = service.updateSystemSetting("WMSG", new SystemSettingUpdateRequest(maxValue));

    assertEquals(maxValue, saved.getSystemSettingValue());
    verify(repository).updateSystemSetting(eq("WMSG"), any(), eq(maxValue), any(), any());
  }

  @Test
  void update_validValue_updatesAndReturns() {
    when(repository.getSystemSetting("WMSG")).thenReturn(record("old"));
    when(repository.updateSystemSetting(eq("WMSG"), any(), eq("Fresh news"), any(), any()))
        .thenReturn(record("Fresh news"));

    SystemSetting saved = service.updateSystemSetting("WMSG", new SystemSettingUpdateRequest("Fresh news"));

    assertEquals("Fresh news", saved.getSystemSettingValue());
    verify(repository).updateSystemSetting(eq("WMSG"), any(), eq("Fresh news"), any(), any());
  }
}
