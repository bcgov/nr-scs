import { describe, expect, it } from 'vitest';

import type { RiskAssessmentSection } from '@/services/riskAssessment.types';
import {
  buildSelections,
  computeGrandTotal,
  computeMaxTotal,
  sectionTotal,
  selectedWeight,
  MAX_COMMENTS_LENGTH,
  type Selections,
} from './riskAssessmentQuestionnaireUtils';

const answer = (answerId: number, weight: number | null, selected = false) => ({
  answerId,
  weight,
  answerText: `Answer ${answerId}`,
  ...(selected ? {} : {}),
});

const question = (questionId: number, weights: Array<number | null>, selectedAnswerId?: number | null) => ({
  questionId,
  questionText: `Question ${questionId}`,
  selectedAnswerId: selectedAnswerId ?? null,
  answers: weights.map((weight, index) => answer(questionId * 10 + index, weight)),
});

const section = (
  sectionId: number,
  questions: ReturnType<typeof question>[],
): RiskAssessmentSection =>
  ({ sectionId, sectionName: `Section ${sectionId}`, questions }) as unknown as RiskAssessmentSection;

// Section 1: Q1 (weights 1,5), Q2 (weights 2,4). Section 2: Q3 (weights 3,7).
const SECTION_ONE = section(1, [question(1, [1, 5]), question(2, [2, 4])]);
const SECTION_TWO = section(2, [question(3, [3, 7])]);

describe('selectedWeight', () => {
  it('returns the weight of the selected answer', () => {
    expect(selectedWeight(SECTION_ONE, 1, { 1: 11 })).toBe(5);
  });

  it('returns null when the question is unanswered', () => {
    expect(selectedWeight(SECTION_ONE, 1, { 1: null })).toBeNull();
    expect(selectedWeight(SECTION_ONE, 1, {})).toBeNull();
  });

  it('returns null when the question is not in the section', () => {
    expect(selectedWeight(SECTION_ONE, 999, { 999: 1 })).toBeNull();
  });

  it('returns null when the selected answer id is not one of the answers', () => {
    expect(selectedWeight(SECTION_ONE, 1, { 1: 4242 })).toBeNull();
  });

  it('returns null for a selected answer that carries no weight', () => {
    const weightless = section(9, [question(1, [null])]);

    expect(selectedWeight(weightless, 1, { 1: 10 })).toBeNull();
  });

  it('tolerates a section with no questions', () => {
    expect(selectedWeight({} as RiskAssessmentSection, 1, { 1: 10 })).toBeNull();
  });
});

describe('sectionTotal', () => {
  it('sums the selected weights', () => {
    expect(sectionTotal(SECTION_ONE, { 1: 11, 2: 21 })).toBe(9); // 5 + 4
  });

  it('counts an unanswered question as zero rather than dropping the section', () => {
    expect(sectionTotal(SECTION_ONE, { 1: 11 })).toBe(5);
  });

  it('is zero when nothing is answered', () => {
    expect(sectionTotal(SECTION_ONE, {})).toBe(0);
  });

  it('is zero for a section with no questions', () => {
    expect(sectionTotal({} as RiskAssessmentSection, {})).toBe(0);
  });
});

describe('computeGrandTotal', () => {
  it('multiplies the section totals — the legacy rule is a product, not a sum', () => {
    // Section 1 = 5 + 4 = 9; Section 2 = 7. Product 63, whereas a sum would give 16.
    expect(computeGrandTotal([SECTION_ONE, SECTION_TWO], { 1: 11, 2: 21, 3: 31 })).toBe(63);
  });

  it('collapses to zero when one section scores zero, as a product must', () => {
    expect(computeGrandTotal([SECTION_ONE, SECTION_TWO], { 1: 11, 2: 21 })).toBe(0);
  });

  it('returns null when there are no sections, rather than the identity 1', () => {
    expect(computeGrandTotal([], {})).toBeNull();
  });

  it('returns a single section total unchanged', () => {
    expect(computeGrandTotal([SECTION_TWO], { 3: 31 })).toBe(7);
  });
});

describe('computeMaxTotal', () => {
  it('takes the highest weight per question, summed per section, multiplied across sections', () => {
    // Section 1 max = 5 + 4 = 9; Section 2 max = 7. Product 63.
    expect(computeMaxTotal([SECTION_ONE, SECTION_TWO])).toBe(63);
  });

  it('does not depend on the selections', () => {
    expect(computeMaxTotal([SECTION_ONE, SECTION_TWO])).toBe(
      computeGrandTotal([SECTION_ONE, SECTION_TWO], { 1: 11, 2: 21, 3: 31 }),
    );
  });

  it('treats a weightless answer as zero', () => {
    expect(computeMaxTotal([section(9, [question(1, [null, 2])])])).toBe(2);
  });

  it('returns null when there are no sections', () => {
    expect(computeMaxTotal([])).toBeNull();
  });

  it('is zero for a section whose questions carry no answers', () => {
    expect(computeMaxTotal([section(9, [question(1, [])])])).toBe(0);
  });
});

describe('buildSelections', () => {
  it('seeds each question from its previously selected answer', () => {
    const sections = [
      section(1, [question(1, [1, 5], 11), question(2, [2, 4], 20)]),
      section(2, [question(3, [3, 7], 31)]),
    ];

    expect(buildSelections(sections)).toEqual({ 1: 11, 2: 20, 3: 31 });
  });

  it('seeds an unanswered question as null, so the key still exists', () => {
    const selections: Selections = buildSelections([section(1, [question(1, [1, 5])])]);

    expect(selections).toEqual({ 1: null });
    expect(Object.hasOwn(selections, '1')).toBe(true);
  });

  it('is empty for no sections', () => {
    expect(buildSelections([])).toEqual({});
  });

  it('tolerates a section with no questions array', () => {
    expect(buildSelections([{} as RiskAssessmentSection])).toEqual({});
  });
});

describe('MAX_COMMENTS_LENGTH', () => {
  it('matches the backend limit', () => {
    expect(MAX_COMMENTS_LENGTH).toBe(4000);
  });
});
