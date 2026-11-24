package ca.bc.gov.nrs.scs.backend.service.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;

import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.dto.QuestionnaireRow;
import ca.bc.gov.nrs.scs.backend.dto.ResponseRow;
import ca.bc.gov.nrs.scs.backend.dto.RiskRatingRow;
import ca.bc.gov.nrs.scs.backend.dto.TemplateQaRow;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentResponseInput;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentRiskRating;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSaveRequest;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSection;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentSearchResult;

/** Pure unit tests for the row -> API model translation; no database or Spring context needed. */
@DisplayName("RiskAssessmentApiMapper tests")
class RiskAssessmentApiMapperTest {

  // Section 1: question 11 with answers 101 (w1) and 102 (w5). Section 2: question 12 with 201.
  private List<TemplateQaRow> templateQa() {
    return List.of(
        new TemplateQaRow(1L, "Consequences (C)", 1, 11L, "Activity Level", 1, 101L, "Low", 1, 1),
        new TemplateQaRow(1L, "Consequences (C)", 1, 11L, "Activity Level", 1, 102L, "High", 5, 2),
        new TemplateQaRow(2L, "Likelihood (L)", 2, 12L, "Past Performance", 1, 201L, "00", 5, 1));
  }

  @Test
  @DisplayName("toSections nests answers under questions/sections and seeds the saved selection")
  void toSections_buildsNestedStructureWithSelection() {
    List<RiskAssessmentSection> sections =
        RiskAssessmentApiMapper.toSections(templateQa(), List.of(new ResponseRow(900L, 11L, 102L)));

    assertEquals(2, sections.size());
    var firstSection = sections.get(0);
    assertEquals("Consequences (C)", firstSection.getSectionDescription().get());
    var activity = firstSection.getQuestions().get(0);
    assertEquals(102L, activity.getSelectedAnswerId().get());
    assertEquals(2, activity.getAnswers().size());
  }

  @Test
  @DisplayName("toSections blanks a saved selection whose answer is not in the template")
  void toSections_blanksStaleSelection() {
    List<RiskAssessmentSection> sections =
        RiskAssessmentApiMapper.toSections(templateQa(), List.of(new ResponseRow(900L, 11L, 999L)));

    var activity = sections.get(0).getQuestions().get(0);
    assertNull(activity.getSelectedAnswerId().orElse(null));
    assertEquals(2, activity.getAnswers().size());
  }

  @Test
  @DisplayName("toRiskRatings sorts the bands highest-low-bound first")
  void toRiskRatings_sortsHighestFirst() {
    List<RiskAssessmentRiskRating> ratings =
        RiskAssessmentApiMapper.toRiskRatings(
            List.of(
                new RiskRatingRow("L", "Low Risk", "desc", 0, 20),
                new RiskRatingRow("H", "High Risk", "desc", 50, 100)));

    assertEquals("High Risk", ratings.get(0).getCodeDescription().get());
    assertEquals("Low Risk", ratings.get(1).getCodeDescription().get());
  }

  @Test
  @DisplayName("toScalerDetail projects the scaler header plus resolved region/district")
  void toScalerDetail_mapsHeaderAndParts() {
    ScalerRiskAssessmentSearchResult header =
        new ScalerRiskAssessmentSearchResult()
            .riskQuestionnaireId(42L)
            .scalerLicenceNo("LIC123")
            .clientName("JOHN DOE")
            .riskRating(BigDecimal.valueOf(63))
            .maxRiskRating(BigDecimal.valueOf(90));

    QuestionnaireRow questionnaire =
        new QuestionnaireRow(
            42L, null, null, "notes", "LIC123", null, null, null, null, 7L, null, null, null,
            OffsetDateTime.parse("2026-01-02T03:04:05Z"), "CREATOR",
            OffsetDateTime.parse("2026-02-03T04:05:06Z"), "UPDATER", 3L);

    ScalerRiskAssessmentDetail detail =
        RiskAssessmentApiMapper.toScalerDetail(
            header, 7L, "notes", "Region A", "District B", List.of(), List.of(), questionnaire);

    assertEquals(42L, detail.getRiskQuestionnaireId().get());
    assertEquals(7L, detail.getTemplateId().get());
    assertEquals("LIC123", detail.getScalerLicenceNo().get());
    assertEquals("JOHN DOE", detail.getClientName().get());
    assertEquals("Region A", detail.getRegionName().get());
    assertEquals("District B", detail.getDistrictName().get());
    assertEquals("notes", detail.getComments().get());
    // The view-derived total + max carry through the mapping (only asserted on the frontend before).
    assertEquals(BigDecimal.valueOf(63), detail.getRiskRating().get());
    assertEquals(BigDecimal.valueOf(90), detail.getMaxRiskRating().get());
    assertEquals("CREATOR", detail.getEntryUserid().get());
    assertEquals("UPDATER", detail.getUpdateUserid().get());
    assertEquals(3L, detail.getRevisionCount().get());
  }

  @Test
  @DisplayName("toScaleSiteDetail projects the scale-site header plus resolved region/district")
  void toScaleSiteDetail_mapsHeaderAndParts() {
    ScaleSiteRiskAssessmentSearchResult header =
        new ScaleSiteRiskAssessmentSearchResult()
            .riskQuestionnaireId(42L)
            .scaleSiteIdNmbr("SITE001")
            .siteName("MAIN YARD");

    QuestionnaireRow questionnaire =
        new QuestionnaireRow(
            42L, null, null, "notes", null, null, "SITE001", null, null, 7L, null, null, null,
            OffsetDateTime.parse("2026-01-02T03:04:05Z"), "CREATOR",
            OffsetDateTime.parse("2026-02-03T04:05:06Z"), "UPDATER", 3L);

    ScaleSiteRiskAssessmentDetail detail =
        RiskAssessmentApiMapper.toScaleSiteDetail(
            header, 7L, "notes", "Region A", "District B", List.of(), List.of(), questionnaire);

    assertEquals(42L, detail.getRiskQuestionnaireId().get());
    assertEquals("SITE001", detail.getScaleSiteIdNmbr().get());
    assertEquals("MAIN YARD", detail.getSiteName().get());
    assertEquals("Region A", detail.getRegionName().get());
    assertEquals("District B", detail.getDistrictName().get());
    assertEquals("CREATOR", detail.getEntryUserid().get());
    assertEquals("UPDATER", detail.getUpdateUserid().get());
    assertEquals(3L, detail.getRevisionCount().get());
  }

  @Nested
  @DisplayName("toCreateCommand")
  class ToCreateCommand {

    @Test
    @DisplayName("trims the comment and flattens each response's answerId")
    void trimsCommentAndUnwrapsAnswers() {
      RiskAssessmentSaveRequest request =
          new RiskAssessmentSaveRequest()
              .comments("  hello  ")
              .responses(
                  List.of(
                      new RiskAssessmentResponseInput().questionId(11L).answerId(101L),
                      new RiskAssessmentResponseInput().questionId(12L)));

      RiskAssessmentCreateCommand command = RiskAssessmentApiMapper.toCreateCommand(request);

      assertEquals("hello", command.comments());
      assertEquals(2, command.responses().size());
      RiskQuestionResponseInput first = command.responses().get(0);
      assertEquals(11L, first.questionId());
      assertEquals(101L, first.answerId());
      // An omitted answerId flattens to null (a plain Long, no JsonNullable).
      assertNull(command.responses().get(1).answerId());
    }

    @Test
    @DisplayName("coerces a blank or absent comment to null")
    void blankOrAbsentCommentBecomesNull() {
      assertNull(
          RiskAssessmentApiMapper.toCreateCommand(
                  new RiskAssessmentSaveRequest().comments("   "))
              .comments());
      // Field omitted entirely (JsonNullable undefined).
      assertNull(RiskAssessmentApiMapper.toCreateCommand(new RiskAssessmentSaveRequest()).comments());
    }

    @Test
    @DisplayName("throws BadRequestException when the comment exceeds the max length")
    void commentTooLongThrows() {
      RiskAssessmentSaveRequest request =
          new RiskAssessmentSaveRequest().comments("a".repeat(4001));

      assertThrows(BadRequestException.class, () -> RiskAssessmentApiMapper.toCreateCommand(request));
    }
  }

  @Nested
  @DisplayName("toUpdateCommand")
  class ToUpdateCommand {

    @Test
    @DisplayName("leaves the comment empty (unchanged) when the field is omitted")
    void absentCommentIsEmptyOptional() {
      RiskAssessmentUpdateCommand command =
          RiskAssessmentApiMapper.toUpdateCommand(new RiskAssessmentSaveRequest());

      assertFalse(command.comments().isPresent());
    }

    @Test
    @DisplayName("carries a trimmed comment when the field is present")
    void presentCommentIsTrimmed() {
      RiskAssessmentUpdateCommand command =
          RiskAssessmentApiMapper.toUpdateCommand(
              new RiskAssessmentSaveRequest().comments("  note  "));

      assertTrue(command.comments().isPresent());
      assertEquals("note", command.comments().get());
    }

    @Test
    @DisplayName("maps an explicit null comment to an empty string (clears the comment)")
    void explicitNullCommentClears() {
      RiskAssessmentSaveRequest request = new RiskAssessmentSaveRequest();
      request.setComments(JsonNullable.<String>of(null));

      RiskAssessmentUpdateCommand command = RiskAssessmentApiMapper.toUpdateCommand(request);

      assertTrue(command.comments().isPresent());
      assertEquals("", command.comments().get());
    }

    @Test
    @DisplayName("throws BadRequestException when the comment exceeds the max length")
    void commentTooLongThrows() {
      RiskAssessmentSaveRequest request =
          new RiskAssessmentSaveRequest().comments("a".repeat(4001));

      assertThrows(BadRequestException.class, () -> RiskAssessmentApiMapper.toUpdateCommand(request));
    }
  }
}
