package ca.bc.gov.nrs.scs.backend.service.inspection;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.UnprocessableEntityException;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("InspectionValidator")
class InspectionValidatorTest {

  private final InspectionValidator validator = new InspectionValidator();

  // Default lookup: question 777 accepts Y/N/NA.
  private final Function<Long, Set<String>> validAnswerCodes = id -> Set.of("Y", "N", "NA");

  private InspectionQuestionResponseInput response(Long questionId, String answer) {
    return new InspectionQuestionResponseInput(questionId, answer, null, YesNo.N, null, null, null);
  }

  @Nested
  @DisplayName("validateAutomatedInspectionSiteTypes")
  class AutomatedSiteTypes {

    @Test
    void nonAutomatedTypeIsIgnored() {
      assertDoesNotThrow(() ->
          validator.validateAutomatedInspectionSiteTypes("COM", List.of("X", "Y"), false));
    }

    @Test
    void automatedWithWeightScaleOnlyIsValid() {
      assertDoesNotThrow(() ->
          validator.validateAutomatedInspectionSiteTypes("AUT", List.of("W"), false));
    }

    @Test
    void automatedWithOtherMethodThrowsBadRequestWhenNotUnprocessable() {
      assertThrows(BadRequestException.class, () ->
          validator.validateAutomatedInspectionSiteTypes("AUT", List.of("W", "P"), false));
    }

    @Test
    void automatedWithOtherMethodThrowsUnprocessableWhenFlagged() {
      assertThrows(UnprocessableEntityException.class, () ->
          validator.validateAutomatedInspectionSiteTypes("AUT", List.of("P"), true));
    }
  }

  @Nested
  @DisplayName("validateQuestionCoverage")
  class QuestionCoverage {

    @Test
    void emptyRequiredSetIsAlwaysSatisfied() {
      assertDoesNotThrow(() -> validator.validateQuestionCoverage(Set.of(), null));
    }

    @Test
    void missingSubmissionForRequiredQuestionsThrows() {
      BadRequestException ex = assertThrows(BadRequestException.class, () ->
          validator.validateQuestionCoverage(Set.of(777L), List.of()));
      assertEquals("Question responses must be submitted for all required inspection questions.",
          ex.getMessage());
    }

    @Test
    void submissionMissingARequiredQuestionThrows() {
      assertThrows(BadRequestException.class, () ->
          validator.validateQuestionCoverage(Set.of(777L, 888L), List.of(response(777L, "Y"))));
    }

    @Test
    void submissionCoveringAllRequiredQuestionsPasses() {
      assertDoesNotThrow(() ->
          validator.validateQuestionCoverage(Set.of(777L), List.of(response(777L, "Y"))));
    }
  }

  @Nested
  @DisplayName("validateUpdate / response rules")
  class ResponseRules {

    private InspectionUpdateCommand update(List<InspectionQuestionResponseInput> rows) {
      return new InspectionUpdateCommand(1L, LocalDate.of(2026, 1, 1), "inspector", YesNo.Y, null, rows);
    }

    @Test
    void futureInspectionDateThrowsFieldScopedError() {
      InspectionUpdateCommand command = new InspectionUpdateCommand(
          1L, LocalDate.now().plusDays(1), "inspector", YesNo.Y, null, List.of());
      // Field-scoped so it renders inline on the Inspection Date field, not as a banner.
      FieldValidationException ex = assertThrows(FieldValidationException.class,
          () -> validator.validateUpdate(command, validAnswerCodes));
      assertEquals(1, ex.getFieldErrors().size());
      assertEquals("inspectionDate", ex.getFieldErrors().getFirst().field());
      assertEquals("Inspection Date cannot be in the future.",
          ex.getFieldErrors().getFirst().message());
    }

    @Test
    void duplicateQuestionResponseThrows() {
      InspectionUpdateCommand command =
          update(List.of(response(777L, "Y"), response(777L, "N")));
      assertThrows(BadRequestException.class, () -> validator.validateUpdate(command, validAnswerCodes));
    }

    @Test
    void invalidAnswerCodeThrows() {
      InspectionUpdateCommand command = update(List.of(response(777L, "MAYBE")));
      assertThrows(BadRequestException.class, () -> validator.validateUpdate(command, validAnswerCodes));
    }

    @Test
    void blankAnswerCodeThrows() {
      InspectionUpdateCommand command = update(List.of(response(777L, "  ")));
      assertThrows(BadRequestException.class, () -> validator.validateUpdate(command, validAnswerCodes));
    }

    @Test
    void nonPositiveQuestionIdThrows() {
      InspectionUpdateCommand command = update(List.of(response(0L, "Y")));
      assertThrows(BadRequestException.class, () -> validator.validateUpdate(command, validAnswerCodes));
    }

    @Test
    void followUpRequiredWithoutActionThrows() {
      InspectionQuestionResponseInput row = new InspectionQuestionResponseInput(
          777L, "Y", null, YesNo.Y, null, LocalDate.of(2026, 2, 1), YesNo.N);
      assertThrows(BadRequestException.class,
          () -> validator.validateUpdate(update(List.of(row)), validAnswerCodes));
    }

    @Test
    void followUpNotRequiredButFieldsSuppliedThrows() {
      InspectionQuestionResponseInput row = new InspectionQuestionResponseInput(
          777L, "Y", null, YesNo.N, "do something", null, null);
      assertThrows(BadRequestException.class,
          () -> validator.validateUpdate(update(List.of(row)), validAnswerCodes));
    }

    @Test
    void validResponsePasses() {
      InspectionQuestionResponseInput row = new InspectionQuestionResponseInput(
          777L, "Y", "ok", YesNo.Y, "fix it", LocalDate.of(2026, 2, 1), YesNo.N);
      assertDoesNotThrow(() -> validator.validateUpdate(update(List.of(row)), validAnswerCodes));
    }
  }

  @Nested
  @DisplayName("validateCreate")
  class CreateRules {

    private InspectionCreateCommand create(Long previousInspectionId,
        List<InspectionQuestionResponseInput> rows) {
      return new InspectionCreateCommand(
          "SITE001", "COM", List.of("W"), LocalDate.of(2026, 1, 1), YesNo.Y, null, "inspector",
          previousInspectionId, null, rows);
    }

    @Test
    void nonPositivePreviousInspectionIdThrows() {
      assertThrows(BadRequestException.class,
          () -> validator.validateCreate(create(0L, List.of()), "COM", List.of("W"), validAnswerCodes));
    }

    @Test
    void emptyResponsesAllowedOnCreate() {
      assertDoesNotThrow(
          () -> validator.validateCreate(create(null, List.of()), "COM", List.of("W"), validAnswerCodes));
    }

    @Test
    void invalidAnswerCodeOnCreateThrows() {
      assertThrows(BadRequestException.class,
          () -> validator.validateCreate(
              create(null, List.of(response(777L, "NOPE"))), "COM", List.of("W"), validAnswerCodes));
    }
  }
}
