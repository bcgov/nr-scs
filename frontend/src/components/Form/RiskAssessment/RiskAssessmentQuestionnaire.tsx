import {
  Column,
  Grid,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextArea,
  TextInput,
} from '@carbon/react';
import DOMPurify from 'dompurify';
import { useMemo, type ChangeEvent, type FC } from 'react';

import type {
  RiskAssessmentRiskRating,
  RiskAssessmentSection,
} from '@/services/riskAssessment.types';

import {
  MAX_COMMENTS_LENGTH,
  computeGrandTotal,
  computeMaxTotal,
  sectionTotal,
  selectedWeight,
  type Selections,
} from './riskAssessmentQuestionnaireUtils';

import './index.scss';

// Legacy question/answer text is stored with embedded HTML (e.g. <font size="1">, <br/>) and
// entities (e.g. &sup3;). The old JSP rendered it as raw HTML; we mirror that safely.

/** Sanitized HTML for rich display (preserves the small-font guidance and line breaks). */
const sanitizeHtml = (value?: string | null): string => DOMPurify.sanitize(value ?? '');

/** Plain text with tags stripped and entities decoded, for option labels and aria labels. */
const toPlainText = (value?: string | null): string => {
  const withoutTags = (value ?? '').replace(/<[^>]*>/g, ' ');
  const el = document.createElement('textarea');
  el.innerHTML = withoutTags;
  return el.value.replace(/\s+/g, ' ').trim();
};

interface Props {
  sections: RiskAssessmentSection[];
  riskRatings: RiskAssessmentRiskRating[];
  selections: Selections;
  comments: string;
  /** Editable controls are disabled outside edit/create mode and while loading/saving. */
  disabled: boolean;
  onSelect: (questionId: number, value: string) => void;
  onCommentsChange: (value: string) => void;
  /** Value for the read-only "Risk Assessment ID" field; omit/empty on create (no id yet). */
  assessmentId?: string;
}

/**
 * The data-driven questionnaire body shared by the scaler/scale-site risk assessment edit and
 * create flows: the sections/questions/answers tables with per-section totals, the product-rule
 * grand/maximum totals, the comments box, and the Risk Levels reference table. The domain header,
 * page chrome, and action buttons live in each caller.
 */
const RiskAssessmentQuestionnaire: FC<Props> = ({
  sections,
  riskRatings,
  selections,
  comments,
  disabled,
  onSelect,
  onCommentsChange,
  assessmentId,
}) => {
  const grandTotal = useMemo(
    () => computeGrandTotal(sections, selections),
    [sections, selections],
  );
  const maxTotal = useMemo(() => computeMaxTotal(sections), [sections]);

  return (
    <>
      <h4 className="scs__form__section-title">Risk Assessment</h4>
      <Grid className="scs__form__grid">
        <Column lg={8} md={4} sm={4}>
          <TextInput
            id="risk-questionnaire-id"
            labelText="Risk Assessment ID"
            value={assessmentId ?? ''}
            onChange={() => undefined}
            readOnly
          />
        </Column>
      </Grid>

      {sections.map((section) => (
        <div key={section.sectionId ?? section.sectionDescription}>
          <div className="scs__form__divider" />
          <h4 className="scs__form__section-title">{section.sectionDescription}</h4>
          <Table className="risk-assessment__table">
            <TableHead>
              <TableRow>
                <TableHeader className="risk-assessment__col-question">Question</TableHeader>
                <TableHeader className="risk-assessment__col-response">Response</TableHeader>
                <TableHeader className="risk-assessment__col-weight">Answer Weighting</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(section.questions ?? []).map((question) => {
                const questionId = question.questionId;
                if (questionId == null) {
                  return null;
                }
                const selected = selections[questionId];
                const weight = selectedWeight(section, questionId, selections);
                return (
                  <TableRow key={questionId}>
                    <TableCell>
                      <span
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.questionText) }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        id={`question-${questionId}`}
                        labelText={toPlainText(question.questionText)}
                        hideLabel
                        disabled={disabled}
                        value={selected != null ? String(selected) : ''}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          onSelect(questionId, e.target.value)
                        }
                      >
                        <SelectItem value="" text="" />
                        {(question.answers ?? []).map((answer) => (
                          <SelectItem
                            key={answer.answerId ?? ''}
                            value={answer.answerId != null ? String(answer.answerId) : ''}
                            text={toPlainText(answer.answerText)}
                          />
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell className="risk-assessment__weight-cell">
                      {weight != null ? weight : ''}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="risk-assessment__total-row">
                <TableCell colSpan={2}>
                  <strong>Total:</strong>
                </TableCell>
                <TableCell className="risk-assessment__weight-cell">
                  <strong>{sectionTotal(section, selections)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ))}

      <div className="scs__form__divider" />

      <h4 className="scs__form__section-title">Risk Assessment Total</h4>
      <Grid className="scs__form__grid">
        <Column lg={8} md={4} sm={4}>
          <TextInput
            id="risk-rating"
            labelText="Total"
            value={grandTotal != null ? String(grandTotal) : ''}
            onChange={() => undefined}
            readOnly
          />
        </Column>
        <Column lg={8} md={4} sm={4}>
          <TextInput
            id="max-risk-rating"
            labelText="Maximum Total"
            value={maxTotal != null ? String(maxTotal) : ''}
            onChange={() => undefined}
            readOnly
          />
        </Column>
      </Grid>

      <div className="scs__form__divider" />

      <Grid className="scs__form__grid risk-assessment__comments-risk-row">
        <Column lg={8} md={8} sm={4} className="risk-assessment__comments-col">
          <h4 className="scs__form__section-title">Comments</h4>
          <TextArea
            id="comments"
            labelText="Comments"
            hideLabel
            disabled={disabled}
            maxLength={MAX_COMMENTS_LENGTH}
            value={comments}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onCommentsChange(e.target.value)}
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <h4 className="scs__form__section-title">Risk Levels</h4>
          <Table className="risk-assessment__table risk-assessment__risk-levels-table">
            <TableHead>
              <TableRow>
                <TableHeader>Risk Range</TableHeader>
                <TableHeader>Risk Level</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {riskRatings.map((rating, index) => (
                <TableRow key={rating.riskTypeCode ?? index}>
                  <TableCell>
                    {index === 0
                      ? `>= ${rating.rangeLowValue ?? ''}`
                      : `${rating.rangeLowValue ?? ''} - ${rating.rangeHighValue ?? ''}`}
                  </TableCell>
                  <TableCell>
                    {`${rating.codeDescription ?? ''} Risk${
                      rating.ratingDescription ? ` - ${rating.ratingDescription}` : ''
                    }`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Column>
      </Grid>
    </>
  );
};

export default RiskAssessmentQuestionnaire;
