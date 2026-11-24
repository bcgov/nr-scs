package ca.bc.gov.nrs.scs.backend.service.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentRecord;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamRecord;
import ca.bc.gov.nrs.scs.backend.domain.scaler.Scaler;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceType;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentInput;
import ca.bc.gov.nrs.scs.backend.model.ScalerCreate;
import ca.bc.gov.nrs.scs.backend.model.ScalerCreate.LicenceTypesEnum;
import ca.bc.gov.nrs.scs.backend.model.ScalerCreate.OathTakenIndEnum;
import ca.bc.gov.nrs.scs.backend.model.ScalerDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamRequest;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;

@DisplayName("ScalerApiMapper tests")
class ScalerApiMapperTest {

  private static final LocalDate ISSUED = LocalDate.of(2025, 1, 15);

  private ScalerCreate request() {
    ScalerCreate req = new ScalerCreate(
        "12345678", 1234L, ISSUED, OathTakenIndEnum.Y, List.of(LicenceTypesEnum.SCS));
    req.setAppointment(new ScalerAppointmentInput(
        "FORS", "BC", ScalerAppointmentInput.ProvinceWideIndEnum.N, ISSUED));
    return req;
  }

  @Test
  @DisplayName("toCreateCommand zero-pads the client number (legacy ScalerDto:122 boundary rule)")
  void toCreateCommand_padsClientNumber() {
    ScalerCreate req = request();
    req.setClientNumber("05");

    assertEquals("00000005", ScalerApiMapper.toCreateCommand(req).clientNumber());
    assertEquals("00000005", ScalerApiMapper.toUpdateCommand("1234", req).clientNumber());
  }

  @Test
  @DisplayName("toCreateCommand converts enums to domain and carries the scaler org into the appointment")
  void toCreateCommand_convertsEnumsAndAppointment() {
    ScalerCreateCommand cmd = ScalerApiMapper.toCreateCommand(request());

    assertEquals("12345678", cmd.clientNumber());
    assertEquals(1234L, cmd.orgUnitNo());
    assertEquals(YesNo.Y, cmd.oathTakenInd());
    assertEquals(List.of(ScalerLicenceType.SCS), cmd.licenceTypes());
    assertNotNull(cmd.appointment());
    assertEquals("FORS", cmd.appointment().scalerAppointmentType());
    assertEquals(YesNo.N, cmd.appointment().provinceWideInd());
    assertEquals(1234L, cmd.appointment().orgUnitNo()); // scaler Reg/Dist carried in (district-specific)
    assertNull(cmd.appointment().cancellationDate());   // never set from the scaler form
    assertNull(cmd.exam());
  }

  @Test
  @DisplayName("toCreateCommand drops the org unit for a province-wide appointment (legacy gate)")
  void toCreateCommand_dropsOrgUnitForProvinceWideAppointment() {
    ScalerCreate req = new ScalerCreate(
        "12345678", 1234L, ISSUED, OathTakenIndEnum.Y, List.of(LicenceTypesEnum.SCS));
    req.setAppointment(new ScalerAppointmentInput(
        "FORS", "BC", ScalerAppointmentInput.ProvinceWideIndEnum.Y, ISSUED));

    ScalerCreateCommand cmd = ScalerApiMapper.toCreateCommand(req);

    assertEquals(YesNo.Y, cmd.appointment().provinceWideInd());
    assertNull(cmd.appointment().orgUnitNo()); // province-wide → org unit dropped
  }

  @Test
  @DisplayName("toCreateCommand maps the exam section via the shared ScalerExamRequest (no class code on the wire)")
  void toCreateCommand_mapsExamSection() {
    ScalerCreate req = request();
    req.setAppointment(null);
    req.setExam(new ScalerExamRequest("1").completionDate(LocalDate.of(2025, 2, 1)));

    ScalerCreateCommand cmd = ScalerApiMapper.toCreateCommand(req);

    assertNotNull(cmd.exam());
    assertEquals("1", cmd.exam().scalerTrainingTypeId());
    assertEquals(LocalDate.of(2025, 2, 1), cmd.exam().completionDate());
    // Neither ScalerExamRequest nor ScalerExamCommand carries a class code — it is derived server-side.
  }

  @Test
  @DisplayName("toUpdateCommand distinguishes an absent licenceCancelledDate from a provided one")
  void toUpdateCommand_absentVsProvidedCancelledDate() {
    ScalerUpdateCommand absent = ScalerApiMapper.toUpdateCommand("1234", request());
    assertEquals("1234", absent.scalerLicenceNo());
    assertFalse(absent.licenceCancelledDateProvided());
    assertNull(absent.licenceCancelledDate());

    ScalerCreate withValue = request();
    withValue.setLicenceCancelledDate(JsonNullable.of(LocalDate.of(2026, 6, 30)));
    ScalerUpdateCommand provided = ScalerApiMapper.toUpdateCommand("1234", withValue);
    assertTrue(provided.licenceCancelledDateProvided());
    assertEquals(LocalDate.of(2026, 6, 30), provided.licenceCancelledDate());

    ScalerCreate withExplicitNull = request();
    withExplicitNull.setLicenceCancelledDate(JsonNullable.of(null));
    ScalerUpdateCommand explicitNull = ScalerApiMapper.toUpdateCommand("1234", withExplicitNull);
    assertTrue(explicitNull.licenceCancelledDateProvided()); // explicit null is a provided (clearing) value
    assertNull(explicitNull.licenceCancelledDate());
  }

  @Test
  @DisplayName("toResponse projects the aggregate including appointment and licence types")
  void toResponse_projectsAggregateWithAppointment() {
    ScalerAppointmentRecord appt = new ScalerAppointmentRecord(
        5001L, "1234", "FORS", "BC", null, YesNo.Y, ISSUED, null, null, null,
        null, "JSMITH", null, "JSMITH", 1L);
    Scaler scaler = new Scaler(
        "1234", "00345678", 1234L, ISSUED, null, YesNo.Y, LocalDate.of(2026, 6, 30),
        List.of(ScalerLicenceType.SCS, ScalerLicenceType.WA), appt, null,
        null, "JSMITH", null, "JSMITH", 1L);

    ScalerDetail d = ScalerApiMapper.toResponse(scaler);

    assertEquals("1234", d.getScalerLicenceNo().get());
    assertEquals("00345678", d.getClientNumber().get());
    assertEquals(ScalerDetail.OathTakenIndEnum.Y, d.getOathTakenInd().get());
    assertEquals(LocalDate.of(2026, 6, 30), d.getLicenceCancelledDate().get());
    assertEquals(
        List.of(ScalerDetail.LicenceTypesEnum.SCS, ScalerDetail.LicenceTypesEnum.WA),
        d.getLicenceTypes().get());
    assertNotNull(d.getAppointment());
    assertEquals(5001L, d.getAppointment().getScalerLicenceAttributeId().get());
    assertEquals(ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentDetail.ProvinceWideIndEnum.Y,
        d.getAppointment().getProvinceWideInd().get());
    assertNull(d.getExam());
  }

  @Test
  @DisplayName("toResponse projects the exam via the shared ScalerExamApiMapper")
  void toResponse_projectsExam() {
    ScalerExamRecord exam = new ScalerExamRecord(
        "1234", "A", "1", LocalDate.of(2025, 2, 1), null, null, null, null, null);
    Scaler scaler = new Scaler(
        "1234", "12345678", 1234L, ISSUED, null, YesNo.Y, null,
        List.of(ScalerLicenceType.SCS), null, exam,
        null, null, null, null, null);

    ScalerDetail d = ScalerApiMapper.toResponse(scaler);

    assertNull(d.getAppointment());
    assertNotNull(d.getExam());
    assertEquals("1", d.getExam().getScalerTrainingTypeId().get());
    assertEquals("A", d.getExam().getScalerTrainingClassCode().get());
  }
}
