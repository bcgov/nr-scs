package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ConflictException;
import ca.bc.gov.nrs.scs.backend.exception.ForbiddenException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.dto.ActiveTemplateRow;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRiskAssessmentRepository;
import ca.bc.gov.nrs.scs.backend.repository.RiskQuestionnaireRepository;
import ca.bc.gov.nrs.scs.backend.dto.QuestionnaireRow;
import ca.bc.gov.nrs.scs.backend.dto.ResponseRow;
import ca.bc.gov.nrs.scs.backend.dto.RiskRatingRow;
import ca.bc.gov.nrs.scs.backend.dto.TemplateQaRow;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.openapitools.jackson.nullable.JsonNullable;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScalerRiskAssessmentService tests")
class ScalerRiskAssessmentServiceTest {

  @Mock private ScalerRiskAssessmentRepository repository;
  @Mock private RiskQuestionnaireRepository questionnaireRepository;
  @Mock private ScalerRepository scalerRepository;
  @Mock private ClientScopeGuard clientScopeGuard;

  private ScalerRiskAssessmentService service;

  @BeforeEach
  void setUpService() {
    // Wire a real shared questionnaire service over the mocked repository so the existing
    // when(...)/verify(...) stubs on questionnaireRepository still drive the build/save logic.
    service =
        new ScalerRiskAssessmentService(
            repository,
            new RiskQuestionnaireService(questionnaireRepository),
            scalerRepository,
            clientScopeGuard);
  }

  private static final long ID = 42L;
  private static final long TEMPLATE_ID = 7L;

  private ScalerRiskAssessmentSearchResult stubSearchResult(Long id) {
    ScalerRiskAssessmentSearchResult r = new ScalerRiskAssessmentSearchResult();
    r.setRiskQuestionnaireId(JsonNullable.of(id));
    r.setScalerLicenceNo(JsonNullable.of("LIC-" + id));
    r.setRiskTypeCode(JsonNullable.of("MEDIUM"));
    r.setMaxRiskRating(JsonNullable.of(java.math.BigDecimal.valueOf(100)));
    return r;
  }

  private QuestionnaireRow stubQuestionnaire(Long id, String comments) {
    return new QuestionnaireRow(
        id, null, null, comments, "LIC-" + id, null, null, null, "SCLE", TEMPLATE_ID, null, null, null,
        null, null, null, null, null);
  }

  // Two answers for question 11, one for question 12.
  private List<TemplateQaRow> stubTemplateQa() {
    return List.of(
        new TemplateQaRow(1L, "Consequences (C)", 1, 11L, "Activity Level", 1, 101L, "Low", 1, 1),
        new TemplateQaRow(1L, "Consequences (C)", 1, 11L, "Activity Level", 1, 102L, "High", 5, 2),
        new TemplateQaRow(2L, "Likelihood (L)", 2, 12L, "Past Performance", 1, 201L, "00", 5, 1));
  }

  private RiskQuestionResponseInput response(long questionId, Long answerId) {
    return new RiskQuestionResponseInput(questionId, answerId);
  }

  private RiskAssessmentCreateCommand createCommand(
      String comments, List<RiskQuestionResponseInput> responses) {
    return new RiskAssessmentCreateCommand(comments, responses);
  }

  private RiskAssessmentUpdateCommand updateCommand(
      Optional<String> comments, List<RiskQuestionResponseInput> responses) {
    return new RiskAssessmentUpdateCommand(comments, responses);
  }

  @Nested
  @DisplayName("searchScalerRiskAssessments")
  class Search {

    @Test
    @DisplayName("delegates normalized params to repository and returns results")
    void search_delegatesToRepository() {
      when(repository.searchScalerRiskAssessments(
              eq(42L), eq("MEDIUM"), eq("Y"), eq("LIC001"), eq(10L),
              eq("12345678"), eq("SCS"), eq(1), eq(0)))
          .thenReturn(List.of(stubSearchResult(42L)));

      List<ScalerRiskAssessmentSearchResult> results = service.searchScalerRiskAssessments(
          "42", "medium", "y", "lic001", 10L, "12345678", "scs", null, null);

      assertEquals(1, results.size());
      assertEquals(42L, results.get(0).getRiskQuestionnaireId().get());
    }

    @Test
    @DisplayName("filters results in-memory when riskQuestionnaireId contains a wildcard")
    void search_withWildcardId_filtersInMemory() {
      when(repository.searchScalerRiskAssessments(
              isNull(), isNull(), isNull(), isNull(), isNull(),
              isNull(), isNull(), eq(1), eq(0)))
          .thenReturn(List.of(
              stubSearchResult(100L),
              stubSearchResult(200L),
              stubSearchResult(105L)));

      List<ScalerRiskAssessmentSearchResult> results = service.searchScalerRiskAssessments(
          "10%", null, null, null, null, null, null, null, null);

      assertEquals(2, results.size());
      assertTrue(results.stream().allMatch(r -> {
        Long id = r.getRiskQuestionnaireId().get();
        return id == 100L || id == 105L;
      }));
    }

    @Test
    @DisplayName("filters results in-memory for a suffix wildcard (e.g. %05)")
    void search_withSuffixWildcard_filtersInMemory() {
      when(repository.searchScalerRiskAssessments(
              isNull(), isNull(), isNull(), isNull(), isNull(),
              isNull(), isNull(), eq(1), eq(0)))
          .thenReturn(List.of(
              stubSearchResult(105L),
              stubSearchResult(205L),
              stubSearchResult(210L)));

      List<ScalerRiskAssessmentSearchResult> results = service.searchScalerRiskAssessments(
          "%05", null, null, null, null, null, null, null, null);

      assertEquals(2, results.size());
      assertTrue(results.stream().allMatch(r -> {
        Long id = r.getRiskQuestionnaireId().get();
        return id == 105L || id == 205L;
      }));
    }

    @Test
    @DisplayName("throws BadRequestException when riskQuestionnaireId is not numeric and not a wildcard")
    void search_withInvalidAssessmentId_throwsBadRequest() {
      BadRequestException ex = assertThrows(BadRequestException.class, () ->
          service.searchScalerRiskAssessments(
              "abc", null, null, null, null, null, null, null, null));

      assertTrue(ex.getMessage().contains("Assessment ID must be a number"));
    }

    @Test
    @DisplayName("throws BadRequestException for a primary sort outside the allowed set")
    void search_withInvalidPrimarySort_throwsBadRequest() {
      assertThrows(BadRequestException.class, () ->
          service.searchScalerRiskAssessments(
              null, null, null, null, null, null, null, 999, null));
    }
  }

  @Nested
  @DisplayName("getScalerRiskAssessment")
  class GetById {

    @Test
    @DisplayName("builds a data-driven detail from the assessment's own template")
    void getScalerRiskAssessment_found_buildsDetail() {
      when(repository.getScalerRiskAssessment(ID)).thenReturn(stubSearchResult(ID));
      when(questionnaireRepository.findQuestionnaire(ID))
          .thenReturn(stubQuestionnaire(ID, "saved comments"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getResponses(ID))
          .thenReturn(List.of(new ResponseRow(900L, 11L, 102L)));
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID))
          .thenReturn(List.of(new RiskRatingRow("VH", "Very High Risk", "desc", 50, 100)));

      ScalerRiskAssessmentDetail detail = service.getScalerRiskAssessment(ID);

      assertNotNull(detail);
      assertEquals(ID, detail.getRiskQuestionnaireId().get());
      assertEquals(TEMPLATE_ID, detail.getTemplateId().get());
      assertEquals("saved comments", detail.getComments().get());

      assertEquals(2, detail.getSections().size());
      var firstSection = detail.getSections().get(0);
      assertEquals("Consequences (C)", firstSection.getSectionDescription().get());
      assertEquals(1, firstSection.getQuestions().size());
      var activity = firstSection.getQuestions().get(0);
      assertEquals(102L, activity.getSelectedAnswerId().get());
      assertEquals(2, activity.getAnswers().size());

      assertEquals(1, detail.getRiskRatings().size());
      assertEquals("Very High Risk", detail.getRiskRatings().get(0).getCodeDescription().get());
    }

    @Test
    @DisplayName("blanks a saved selection whose answer was filtered out of the template")
    void getScalerRiskAssessment_savedAnswerFilteredOut_blanksSelection() {
      when(repository.getScalerRiskAssessment(ID)).thenReturn(stubSearchResult(ID));
      when(questionnaireRepository.findQuestionnaire(ID))
          .thenReturn(stubQuestionnaire(ID, "saved comments"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      // Saved answer 999 is not among question 11's surviving answers (101, 102) - e.g. it became
      // obsolete or was de-duped. The detail must blank it so display/validation/save round-trip.
      when(questionnaireRepository.getResponses(ID))
          .thenReturn(List.of(new ResponseRow(900L, 11L, 999L)));
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      ScalerRiskAssessmentDetail detail = service.getScalerRiskAssessment(ID);

      var activity = detail.getSections().get(0).getQuestions().get(0);
      assertNull(activity.getSelectedAnswerId().orElse(null));
      assertEquals(2, activity.getAnswers().size());
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when assessment does not exist")
    void getScalerRiskAssessment_notFound_throwsResourceNotFoundException() {
      when(repository.getScalerRiskAssessment(999L)).thenReturn(null);

      assertThrows(ResourceNotFoundException.class, () ->
          service.getScalerRiskAssessment(999L));
    }

    @Test
    @DisplayName("throws BadRequestException for null or non-positive id")
    void getScalerRiskAssessment_invalidId_throwsBadRequest() {
      assertThrows(BadRequestException.class, () -> service.getScalerRiskAssessment(null));
      assertThrows(BadRequestException.class, () -> service.getScalerRiskAssessment(0L));
    }
  }

  /**
   * The client-scope seam on the id-addressed read.
   *
   * <p>{@code ClientScopeInterceptor} scopes endpoints addressed by {@code scalerLicenceNo} or
   * {@code scaleSiteIdNmbr}; this one is addressed by {@code riskQuestionnaireId}, which it cannot
   * resolve, so the service has to ask {@link ClientScopeGuard} itself. That call is live for external
   * roles — the Industry Scaler holds {@code SCALER_RISK_ASSESSMENT_READ} — so without it an external
   * user could read any client's assessment by guessing an id.
   *
   * <p>The guard is mocked here, so these assert the two things the SERVICE owns: that it delegates
   * with the record's own scaler, and that it does so <b>before</b> the not-found check. Whether a
   * given licence is in scope is the guard's own decision — see the note on
   * {@code deniesWithoutReadingTheQuestionnaire} for where that is (not) covered.
   */
  @Nested
  @DisplayName("getScalerRiskAssessment client scoping")
  class GetByIdClientScope {

    @Test
    @DisplayName("asks the guard about the assessment's own scaler")
    void getScalerRiskAssessment_appliesClientScopeGuardViaItsScaler() {
      when(repository.getScalerRiskAssessment(ID)).thenReturn(stubSearchResult(ID));
      when(questionnaireRepository.findQuestionnaire(ID))
          .thenReturn(stubQuestionnaire(ID, "c"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getResponses(ID)).thenReturn(List.of());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      service.getScalerRiskAssessment(ID);

      verify(clientScopeGuard).assertRecordScalerInScope("LIC-" + ID);
    }

    /**
     * The 403-before-404 rule. A restricted caller must not be able to tell "not yours" from "does not
     * exist", or the id space becomes an existence oracle — so the guard is asked with a null licence,
     * which it treats as a denial, before the not-found is reported. Internal callers, for whom the
     * guard no-ops, still get the 404 asserted here.
     */
    @Test
    @DisplayName("asks the guard before reporting an unknown id missing")
    void getScalerRiskAssessment_asksTheGuardBeforeReportingAnUnknownIdMissing() {
      when(repository.getScalerRiskAssessment(999L)).thenReturn(null);

      assertThrows(ResourceNotFoundException.class, () -> service.getScalerRiskAssessment(999L));

      verify(clientScopeGuard).assertRecordScalerInScope(null);
    }

    /**
     * A denial stops the read: the questionnaire, template and responses are never fetched. Asserted
     * because the guard throwing is only half the contract — work done after it would leak timing and
     * load rows the caller is not entitled to.
     *
     * <p>The guard is stubbed to throw rather than driven by a real client-restricted context: there is
     * no {@code ClientScopeGuardTest} and no {@code mockStatic} precedent in this suite, so the
     * decision itself (which licences are in scope for which client) is unproven at unit level. See the
     * PR discussion — that gap is the guard's, not this service's.
     */
    @Test
    @DisplayName("propagates the guard's denial without reading the questionnaire")
    void getScalerRiskAssessment_deniesWithoutReadingTheQuestionnaire() {
      when(repository.getScalerRiskAssessment(ID)).thenReturn(stubSearchResult(ID));
      doThrow(new ForbiddenException("denied"))
          .when(clientScopeGuard)
          .assertRecordScalerInScope("LIC-" + ID);

      assertThrows(ForbiddenException.class, () -> service.getScalerRiskAssessment(ID));

      verify(questionnaireRepository, never()).findQuestionnaire(ID);
      verify(questionnaireRepository, never()).getTemplateQa(any());
    }

    /**
     * One read, not two. The guard and the not-found check share the row: an earlier revision fetched
     * it once for each, so a restricted caller paid a duplicate round-trip on every read.
     */
    @Test
    @DisplayName("reads the assessment header only once")
    void getScalerRiskAssessment_readsTheHeaderOnce() {
      when(repository.getScalerRiskAssessment(ID)).thenReturn(stubSearchResult(ID));
      when(questionnaireRepository.findQuestionnaire(ID))
          .thenReturn(stubQuestionnaire(ID, "c"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getResponses(ID)).thenReturn(List.of());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      service.getScalerRiskAssessment(ID);

      verify(repository, times(1)).getScalerRiskAssessment(ID);
    }
  }

  @Nested
  @DisplayName("updateScalerRiskAssessment")
  class Update {

    private void stubReads() {
      when(repository.getScalerRiskAssessment(ID)).thenReturn(stubSearchResult(ID));
      when(questionnaireRepository.findQuestionnaire(ID))
          .thenReturn(stubQuestionnaire(ID, "old comments"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
    }

    @Test
    @DisplayName("reconciles responses: updates a changed answer, inserts a new one, saves comments")
    void update_reconcilesResponses() {
      stubReads();
      // Question 11 already answered 101 (will change to 102); question 12 not yet answered.
      when(questionnaireRepository.getResponses(ID))
          .thenReturn(List.of(new ResponseRow(900L, 11L, 101L)));
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      RiskAssessmentUpdateCommand command =
          updateCommand(Optional.of("new comments"), List.of(response(11L, 102L), response(12L, 201L)));

      service.updateScalerRiskAssessment(ID, command);

      verify(questionnaireRepository).updateResponse(900L, ID, 11L, 102L);
      verify(questionnaireRepository).insertResponse(ID, 12L, 201L);
      verify(questionnaireRepository).updateComments(any(QuestionnaireRow.class), eq("new comments"));
      // The template is unchanged by a save, so it is loaded once (for validation) and reused when
      // rebuilding the returned detail - not re-fetched.
      verify(questionnaireRepository, times(1)).getTemplateQa(TEMPLATE_ID);
    }

    @Test
    @DisplayName("leaves the stored comment untouched when the request omits comments")
    void update_omittedComments_leavesCommentUnchanged() {
      stubReads();
      when(questionnaireRepository.getResponses(ID)).thenReturn(List.of());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      // No comments field: the stored comment must be preserved, not coerced to "" and overwritten.
      // Every question is answered (q11, q12) because edit now requires a full save.
      RiskAssessmentUpdateCommand command =
          updateCommand(Optional.empty(), List.of(response(11L, 102L), response(12L, 201L)));

      service.updateScalerRiskAssessment(ID, command);

      verify(questionnaireRepository, never()).updateComments(any(), any());
    }

    @Test
    @DisplayName("throws BadRequestException when an edit leaves any question unanswered")
    void update_notAllAnswered_throwsBadRequest() {
      stubReads();

      // Edit mirrors create: leaving even one question blank (here q12) is rejected, so a sparse edit
      // can never drop the assessment below its risk band and out of the banded view. This covers the
      // all-cleared case too - that is just the extreme of "not all answered".
      RiskAssessmentUpdateCommand command =
          updateCommand(Optional.empty(), List.of(response(11L, 102L), response(12L, null)));

      BadRequestException ex =
          assertThrows(
              BadRequestException.class, () -> service.updateScalerRiskAssessment(ID, command));
      assertEquals(
          "All questions must be answered in order to save the assessment.", ex.getMessage());
      // Rejected before any write: no responses are deleted, inserted, or updated.
      verify(questionnaireRepository, never()).deleteResponse(any());
      verify(questionnaireRepository, never()).insertResponse(any(), any(), any());
      verify(questionnaireRepository, never()).updateResponse(any(), any(), any(), any());
    }

    @Test
    @DisplayName("throws BadRequestException when an answer is not valid for the question")
    void update_invalidAnswer_throwsBadRequest() {
      stubReads();

      RiskAssessmentUpdateCommand command =
          updateCommand(Optional.empty(), List.of(response(11L, 999L)));

      assertThrows(BadRequestException.class, () -> service.updateScalerRiskAssessment(ID, command));
    }

    @Test
    @DisplayName("throws BadRequestException when a question is not part of the template")
    void update_unknownQuestion_throwsBadRequest() {
      stubReads();

      RiskAssessmentUpdateCommand command =
          updateCommand(Optional.empty(), List.of(response(999L, 101L)));

      assertThrows(BadRequestException.class, () -> service.updateScalerRiskAssessment(ID, command));
    }

    @Test
    @DisplayName("returns the Risk Level re-read after the save, not the pre-save band")
    void update_returnsRiskLevelRecalculatedBySave() {
      // The DB view derives the Risk Level from the stored responses, so the header read before the
      // write still reports the old band. Reusing it made the PUT answer with a stale Risk Level,
      // which is what left the Risk Rating tab showing the pre-save rating until a manual refresh.
      ScalerRiskAssessmentSearchResult preSave = stubSearchResult(ID);
      ScalerRiskAssessmentSearchResult postSave = stubSearchResult(ID);
      postSave.setRiskTypeCode(JsonNullable.of("HIGH"));
      postSave.setCodeDescription(JsonNullable.of("High"));
      postSave.setRiskRating(JsonNullable.of(java.math.BigDecimal.valueOf(63)));
      when(repository.getScalerRiskAssessment(ID)).thenReturn(preSave, postSave);
      when(questionnaireRepository.findQuestionnaire(ID))
          .thenReturn(stubQuestionnaire(ID, "old comments"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getResponses(ID)).thenReturn(List.of());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      ScalerRiskAssessmentDetail detail =
          service.updateScalerRiskAssessment(
              ID, updateCommand(Optional.empty(), List.of(response(11L, 102L), response(12L, 201L))));

      assertEquals("HIGH", detail.getRiskTypeCode().get());
      assertEquals("High", detail.getCodeDescription().get());
      assertEquals(java.math.BigDecimal.valueOf(63), detail.getRiskRating().get());
      // Twice: once as the pre-write existence check, once to pick up the recalculated band.
      verify(repository, times(2)).getScalerRiskAssessment(ID);
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when assessment does not exist")
    void update_notFound_throwsResourceNotFoundException() {
      when(repository.getScalerRiskAssessment(999L)).thenReturn(null);

      assertThrows(ResourceNotFoundException.class, () ->
          service.updateScalerRiskAssessment(999L, updateCommand(Optional.empty(), List.of())));
    }
  }

  @Nested
  @DisplayName("getScalerRiskAssessmentCreateInit")
  class CreateInit {

    @Test
    @DisplayName("builds a blank questionnaire from the active SCLE template + scaler header")
    void createInit_buildsBlankDetail() {
      when(scalerRepository.getScalerTombstone("LIC001"))
          .thenReturn(new ScalerTombstoneRecord("LIC001", "SAMPLE", "ALEX", "Coast", "Cascadia"));
      when(questionnaireRepository.findActiveTemplates("SCLE"))
          .thenReturn(List.of(new ActiveTemplateRow(TEMPLATE_ID, 3L, "SCLE")));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID))
          .thenReturn(List.of(new RiskRatingRow("VH", "Very High Risk", "desc", 50, 100)));

      ScalerRiskAssessmentDetail detail = service.getScalerRiskAssessmentCreateInit("LIC001");

      assertNull(detail.getRiskQuestionnaireId().orElse(null));
      assertEquals(TEMPLATE_ID, detail.getTemplateId().get());
      assertEquals(3L, detail.getVersionNo().get());
      assertEquals("LIC001", detail.getScalerLicenceNo().get());
      // "LAST, FIRST" — the legacy tombstone tag's Name cell, and the same shape
      // scs_risk_scaler_vw already returns on the edit/view/search paths.
      assertEquals("SAMPLE, ALEX", detail.getClientName().get());
      assertEquals("Coast", detail.getRegionName().get());
      assertEquals(2, detail.getSections().size());
      // Every question starts unanswered on the create form.
      var firstQuestion = detail.getSections().get(0).getQuestions().get(0);
      assertNull(firstQuestion.getSelectedAnswerId().orElse(null));
      assertEquals(1, detail.getRiskRatings().size());
      verify(questionnaireRepository, never())
          .insertQuestionnaire(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("omits the comma when the scaler has no legal first name (corporate client)")
    void createInit_noLegalFirstName_showsClientNameAlone() {
      // A corporation carries no legal_first_name, so the header shows the bare name — no trailing
      // comma. Matches the legacy tag and scs_risk_scaler_vw's CLIENT_TYPE_CODE = 'C' branch.
      when(scalerRepository.getScalerTombstone("LIC001"))
          .thenReturn(new ScalerTombstoneRecord("LIC001", "ACME HOLDINGS LTD", "   ", "Coast", "Cascadia"));
      when(questionnaireRepository.findActiveTemplates("SCLE"))
          .thenReturn(List.of(new ActiveTemplateRow(TEMPLATE_ID, 3L, "SCLE")));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      ScalerRiskAssessmentDetail detail = service.getScalerRiskAssessmentCreateInit("LIC001");

      assertEquals("ACME HOLDINGS LTD", detail.getClientName().get());
    }

    @Test
    @DisplayName("falls back to the first name alone when the client name is missing")
    void createInit_noClientName_showsLegalFirstNameAlone() {
      when(scalerRepository.getScalerTombstone("LIC001"))
          .thenReturn(new ScalerTombstoneRecord("LIC001", null, "ALANNA", "Coast", "Cascadia"));
      when(questionnaireRepository.findActiveTemplates("SCLE"))
          .thenReturn(List.of(new ActiveTemplateRow(TEMPLATE_ID, 3L, "SCLE")));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      ScalerRiskAssessmentDetail detail = service.getScalerRiskAssessmentCreateInit("LIC001");

      assertEquals("ALANNA", detail.getClientName().get());
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when the scaler does not exist")
    void createInit_scalerMissing_throwsNotFound() {
      when(scalerRepository.getScalerTombstone("NOPE")).thenReturn(null);

      assertThrows(ResourceNotFoundException.class,
          () -> service.getScalerRiskAssessmentCreateInit("NOPE"));
    }

    @Test
    @DisplayName("throws BadRequestException when no SCLE template is active")
    void createInit_noActiveTemplate_throwsBadRequest() {
      when(scalerRepository.getScalerTombstone("LIC001"))
          .thenReturn(new ScalerTombstoneRecord("LIC001", null, null, null, null));
      when(questionnaireRepository.findActiveTemplates("SCLE")).thenReturn(List.of());

      assertThrows(BadRequestException.class,
          () -> service.getScalerRiskAssessmentCreateInit("LIC001"));
    }

    @Test
    @DisplayName("throws ConflictException when multiple SCLE templates are active")
    void createInit_multipleActiveTemplates_throwsConflict() {
      when(scalerRepository.getScalerTombstone("LIC001"))
          .thenReturn(new ScalerTombstoneRecord("LIC001", null, null, null, null));
      when(questionnaireRepository.findActiveTemplates("SCLE"))
          .thenReturn(List.of(
              new ActiveTemplateRow(7L, 3L, "SCLE"),
              new ActiveTemplateRow(8L, 4L, "SCLE")));

      assertThrows(ConflictException.class,
          () -> service.getScalerRiskAssessmentCreateInit("LIC001"));
    }

    @Test
    @DisplayName("throws BadRequestException when the licence is blank")
    void createInit_blankLicence_throwsBadRequest() {
      assertThrows(BadRequestException.class,
          () -> service.getScalerRiskAssessmentCreateInit("   "));
    }
  }

  @Nested
  @DisplayName("createScalerRiskAssessment")
  class Create {

    private static final long NEW_ID = 555L;

    private void stubActiveTemplateAndScaler() {
      when(scalerRepository.getScalerTombstone("LIC001"))
          .thenReturn(new ScalerTombstoneRecord("LIC001", "ACME", null, null, null));
      when(questionnaireRepository.findActiveTemplates("SCLE"))
          .thenReturn(List.of(new ActiveTemplateRow(TEMPLATE_ID, 3L, "SCLE")));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
    }

    private void stubReReadOfNewAssessment() {
      when(repository.getScalerRiskAssessment(NEW_ID)).thenReturn(stubSearchResult(NEW_ID));
      when(questionnaireRepository.findQuestionnaire(NEW_ID))
          .thenReturn(stubQuestionnaire(NEW_ID, null));
      when(questionnaireRepository.getResponses(NEW_ID))
          .thenReturn(List.of(new ResponseRow(1L, 11L, 102L), new ResponseRow(2L, 12L, 201L)));
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());
    }

    @Test
    @DisplayName("inserts the questionnaire + every response and returns the new detail")
    void create_insertsQuestionnaireAndResponses() {
      stubActiveTemplateAndScaler();
      when(questionnaireRepository.insertQuestionnaire("LIC001", null, "SCLE", TEMPLATE_ID, "note"))
          .thenReturn(NEW_ID);
      stubReReadOfNewAssessment();

      RiskAssessmentCreateCommand command =
          createCommand("note", List.of(response(11L, 102L), response(12L, 201L)));

      ScalerRiskAssessmentDetail detail = service.createScalerRiskAssessment("LIC001", command);

      assertEquals(NEW_ID, detail.getRiskQuestionnaireId().get());
      verify(questionnaireRepository).insertQuestionnaire("LIC001", null, "SCLE", TEMPLATE_ID, "note");
      verify(questionnaireRepository).insertResponse(NEW_ID, 11L, 102L);
      verify(questionnaireRepository).insertResponse(NEW_ID, 12L, 201L);
    }

    @Test
    @DisplayName("passes null comments through when none are supplied")
    void create_nullComments() {
      stubActiveTemplateAndScaler();
      when(questionnaireRepository.insertQuestionnaire("LIC001", null, "SCLE", TEMPLATE_ID, null))
          .thenReturn(NEW_ID);
      stubReReadOfNewAssessment();

      RiskAssessmentCreateCommand command =
          createCommand(null, List.of(response(11L, 102L), response(12L, 201L)));

      service.createScalerRiskAssessment("LIC001", command);

      verify(questionnaireRepository).insertQuestionnaire("LIC001", null, "SCLE", TEMPLATE_ID, null);
    }

    @Test
    @DisplayName("throws BadRequestException when not every question is answered")
    void create_missingAnswer_throwsBadRequest() {
      stubActiveTemplateAndScaler();

      // Question 12 is left unanswered - a full save requires all questions.
      RiskAssessmentCreateCommand command = createCommand(null, List.of(response(11L, 102L)));

      assertThrows(BadRequestException.class,
          () -> service.createScalerRiskAssessment("LIC001", command));
      verify(questionnaireRepository, never())
          .insertQuestionnaire(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("throws BadRequestException for an answer that is not valid for the question")
    void create_invalidAnswer_throwsBadRequest() {
      stubActiveTemplateAndScaler();

      RiskAssessmentCreateCommand command =
          createCommand(null, List.of(response(11L, 999L), response(12L, 201L)));

      assertThrows(BadRequestException.class,
          () -> service.createScalerRiskAssessment("LIC001", command));
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when the scaler does not exist")
    void create_scalerMissing_throwsNotFound() {
      when(scalerRepository.getScalerTombstone("NOPE")).thenReturn(null);

      assertThrows(ResourceNotFoundException.class,
          () -> service.createScalerRiskAssessment("NOPE", createCommand(null, List.of())));
    }
  }
}
