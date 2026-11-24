import type { RiskAssessmentSection } from '@/services/riskAssessment.types';

/** Matches the backend's MAX_COMMENTS_LENGTH so over-long comments are blocked client-side too. */
export const MAX_COMMENTS_LENGTH = 4000;

/** Map of questionId -> selected answerId (null when no answer is selected). */
export type Selections = Record<number, number | null>;

/** Weight of the answer currently selected for a question, or null when unanswered. */
export const selectedWeight = (
  section: RiskAssessmentSection,
  questionId: number,
  selections: Selections,
): number | null => {
  const question = (section.questions ?? []).find((q) => q.questionId === questionId);
  const selected = selections[questionId];
  if (!question || selected == null) {
    return null;
  }
  const answer = (question.answers ?? []).find((a) => a.answerId === selected);
  return answer?.weight ?? null;
};

export const sectionTotal = (
  section: RiskAssessmentSection,
  selections: Selections,
): number =>
  (section.questions ?? []).reduce((sum, question) => {
    if (question.questionId == null) {
      return sum;
    }
    return sum + (selectedWeight(section, question.questionId, selections) ?? 0);
  }, 0);

// Legacy scaler/scale-site rule: the grand total is the PRODUCT of the section totals.
export const computeGrandTotal = (
  sections: RiskAssessmentSection[],
  selections: Selections,
): number | null => {
  if (sections.length === 0) {
    return null;
  }
  return sections.reduce((product, section) => product * sectionTotal(section, selections), 1);
};

// Maximum possible total: same PRODUCT rule, but each section uses the highest available weight
// per question. Computed here (like the legacy questionnaire tag) rather than from the view's
// max_risk_rating, which is SUM-based and would render lower than the product total.
export const computeMaxTotal = (sections: RiskAssessmentSection[]): number | null => {
  if (sections.length === 0) {
    return null;
  }
  return sections.reduce((product, section) => {
    const sectionMax = (section.questions ?? []).reduce((sum, question) => {
      const highestWeight = (question.answers ?? []).reduce(
        (max, answer) => Math.max(max, answer.weight ?? 0),
        0,
      );
      return sum + highestWeight;
    }, 0);
    return product * sectionMax;
  }, 1);
};

/** Build the initial selections map from a detail's sections (used by edit and create). */
export const buildSelections = (sections: RiskAssessmentSection[]): Selections => {
  const selections: Selections = {};
  sections.forEach((section) => {
    (section.questions ?? []).forEach((question) => {
      if (question.questionId != null) {
        selections[question.questionId] = question.selectedAnswerId ?? null;
      }
    });
  });
  return selections;
};
