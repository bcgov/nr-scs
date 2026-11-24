package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import ca.bc.gov.nrs.scs.backend.model.report.DesignatedMarksExceptionReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.MarkSiteDesignationReportRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Legacy parity for the two report forms' existence checks — rules and wording from
 * {@code MarkSiteDesignationReportBo.validateSitesAndMarks} and {@code DesignatedMarksExceptionReportForm.validate}.
 */
class ReportReferenceValidatorTest {

  private ScaleSiteService scaleSiteService;
  private TimberMarkService timberMarkService;
  private ReportReferenceValidator validator;

  @BeforeEach
  void setUp() {
    scaleSiteService = mock(ScaleSiteService.class);
    timberMarkService = mock(TimberMarkService.class);
    validator = new ReportReferenceValidator(scaleSiteService, timberMarkService);
  }

  private static List<String> fields(List<FieldErrorDetail> errors) {
    return errors.stream().map(FieldErrorDetail::field).toList();
  }

  @Nested
  class MarkSiteDesignation {

    @Test
    void acceptsAValueThatIsAScaleSite() {
      MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();
      request.setSiteMark1("520");
      when(scaleSiteService.scaleSiteExists("520")).thenReturn(true);

      assertTrue(validator.validate(request).isEmpty());
      // Site first, then mark — a site hit needs no mark lookup.
      verify(timberMarkService, never()).timberMarkExists(anyString());
    }

    @Test
    void acceptsAValueThatIsATimberMark() {
      MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();
      request.setSiteMark1("AB6633");
      when(timberMarkService.timberMarkExists("AB6633")).thenReturn(true);

      assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void refusesAValueThatIsNeitherWithLegacyWording() {
      MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();
      request.setSiteMark3("A12345");

      List<FieldErrorDetail> errors = validator.validate(request);

      assertEquals(1, errors.size());
      assertEquals("siteMark3", errors.get(0).field());
      assertEquals("A Site nor Timbermark for A12345 exist in the system.", errors.get(0).message());
    }

    @Test
    void reportsEveryBadSlotAndSkipsBlanks() {
      MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();
      request.setSiteMark1("A12345");
      request.setSiteMark2("   ");
      request.setSiteMark6("B99999");

      assertEquals(List.of("siteMark1", "siteMark6"), fields(validator.validate(request)));
      verify(scaleSiteService, never()).scaleSiteExists("   ");
    }

    @Test
    void trimsBeforeLookingUp() {
      MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();
      request.setSiteMark1("  AB6633 ");
      when(timberMarkService.timberMarkExists("AB6633")).thenReturn(true);

      assertTrue(validator.validate(request).isEmpty());
    }
  }

  @Nested
  class DesignatedMarksException {

    @Test
    void refusesAnUnknownMarkWithLegacyWording() {
      DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
      request.setMark2("A12345");

      List<FieldErrorDetail> errors = validator.validate(request);

      assertEquals(1, errors.size());
      assertEquals("mark2", errors.get(0).field());
      assertEquals("A Timbermark for A12345 does not exist in the system.", errors.get(0).message());
    }

    @Test
    void refusesAnUnknownSiteWithLegacyWording() {
      DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
      request.setSite1("ZZZ");

      List<FieldErrorDetail> errors = validator.validate(request);

      assertEquals(1, errors.size());
      assertEquals("site1", errors.get(0).field());
      assertEquals("A Scale Site for ZZZ does not exist in the system.", errors.get(0).message());
    }

    @Test
    void marksAreCheckedOnlyAsMarksAndSitesOnlyAsSites() {
      // Unlike the Mark Site Designation report, the two lists are not interchangeable: a scale-site number in
      // a mark slot is still an unknown mark, as in legacy.
      DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
      request.setMark1("520");
      request.setSite1("AB6633");
      when(scaleSiteService.scaleSiteExists("520")).thenReturn(true);
      when(timberMarkService.timberMarkExists("AB6633")).thenReturn(true);

      assertEquals(List.of("mark1", "site1"), fields(validator.validate(request)));
    }

    @Test
    void acceptsRealMarksAndSites() {
      DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
      request.setMark1("AB6633");
      request.setSite1("520");
      when(timberMarkService.timberMarkExists("AB6633")).thenReturn(true);
      when(scaleSiteService.scaleSiteExists("520")).thenReturn(true);

      assertTrue(validator.validate(request).isEmpty());
    }
  }
}
