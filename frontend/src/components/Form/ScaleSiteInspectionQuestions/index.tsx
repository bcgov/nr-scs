import { Select, SelectItem, TextArea } from "@carbon/react";
import type { ChangeEvent } from "react";

import DateInput from "@/components/core/DateInput";
import EmptySection from "@/components/core/EmptySection";
import type {
  ScaleSiteInspectionEditQuestionResponse,
  ScaleSiteInspectionQuestionResponse,
} from "@/services/scaleSiteInspections.service";
import {
  FOLLOW_UP_ACTION_MAX_LENGTH,
  QUESTION_COMMENTS_MAX_LENGTH,
} from "@/components/Form/ScaleSiteInspectionDetails/limits";
import { requiredLabel } from "@/utils/requiredLabel";

import "./index.scss";

type QuestionFieldKey =
  | "inspectionAnswerCode"
  | "commentsText"
  | "followUpRequiredInd"
  | "followUpActionText"
  | "followUpDueDate"
  | "followUpCompletedInd";

type ScaleSiteInspectionQuestionErrors = {
  inspectionAnswerCode?: string;
  commentsText?: string;
  followUpRequiredInd?: string;
  followUpActionText?: string;
  followUpDueDate?: string;
  followUpCompletedInd?: string;
};

type BaseProps = {
  headingClassName?: string;
  emptyStateDescription: string;
};

type EditProps = BaseProps & {
  mode?: "edit";
  questions: ScaleSiteInspectionEditQuestionResponse[];
  errors?: ScaleSiteInspectionQuestionErrors[];
  disabled?: boolean;
  requiredIndicatorClassName: string;
  onFieldChange: (
    index: number,
    field: QuestionFieldKey,
    value: string,
  ) => void;
};

type ViewProps = BaseProps & {
  mode: "view";
  questions: ScaleSiteInspectionQuestionResponse[];
};

type Props = EditProps | ViewProps;

const textValue = (value: string | number | null | undefined): string => {
  if (value == null) {
    return "";
  }

  return String(value).trim();
};

const displayValue = (value: string | number | null | undefined): string => {
  const normalized = textValue(value);
  return normalized || "\u00A0";
};

const ScaleSiteInspectionQuestions = (props: Props) => {
  const headingClassName = props.headingClassName ?? "scs__form__section-title";

  if (props.mode === "view") {
    return (
      <>
        <h4 className={headingClassName}>Questions</h4>
        <section className="scale-site-inspection-questions__panel">
          {props.questions.length > 0 ? (
            <div className="scale-site-inspection-questions__question-list">
              {props.questions.map((question, index) => (
                <table
                  key={`${question.questionText ?? "question"}-${index}`}
                  className="scale-site-inspection-questions__question-table"
                  aria-label={`Inspection question ${index + 1}`}
                >
                  <colgroup>
                    <col className="scale-site-inspection-questions__col--index" />
                    <col className="scale-site-inspection-questions__col--question" />
                    <col className="scale-site-inspection-questions__col--a" />
                    <col className="scale-site-inspection-questions__col--b" />
                    <col className="scale-site-inspection-questions__col--c" />
                    <col className="scale-site-inspection-questions__col--d" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th rowSpan={2}>#</th>
                      <th rowSpan={2}>Question</th>
                      <th colSpan={4}>Response</th>
                    </tr>
                    <tr>
                      <th>Answer</th>
                      <th colSpan={3}>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        rowSpan={4}
                        className="scale-site-inspection-questions__question-index"
                      >
                        {index + 1}.
                      </td>
                      <td
                        rowSpan={4}
                        className="scale-site-inspection-questions__question-text"
                      >
                        {displayValue(question.questionText)}
                      </td>
                      <td>
                        {displayValue(
                          question.inspectionAnswerDescription ??
                            question.inspectionAnswerCode,
                        )}
                      </td>
                      <td colSpan={3}>{displayValue(question.commentsText)}</td>
                    </tr>
                    <tr>
                      <th colSpan={4}>Follow-Up</th>
                    </tr>
                    <tr>
                      <th>Required?</th>
                      <th>Action Required</th>
                      <th>Due Date</th>
                      <th>Complete?</th>
                    </tr>
                    <tr>
                      <td>
                        {displayValue(
                          question.followUpRequiredDescription ??
                            question.followUpRequiredInd,
                        )}
                      </td>
                      <td>{displayValue(question.followUpActionText)}</td>
                      <td>{displayValue(question.followUpDueDate)}</td>
                      <td>
                        {displayValue(
                          question.followUpCompletedDescription ??
                            question.followUpCompletedInd,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ))}
            </div>
          ) : (
            <EmptySection
              icon="Information"
              title="No question responses"
              description={props.emptyStateDescription}
              whiteLayer
            />
          )}
        </section>
      </>
    );
  }

  const {
    questions,
    errors,
    disabled = false,
    requiredIndicatorClassName,
    emptyStateDescription,
    onFieldChange,
  } = props;

  return (
    <>
      <h4 className={headingClassName}>Questions</h4>
      <section className="scale-site-inspection-questions__panel">
        {questions.length > 0 ? (
          <div className="scale-site-inspection-questions__question-list">
            {questions.map((question, index) => {
              const questionErrors = errors?.[index] ?? {};
              const followUpEnabled = question.followUpRequiredInd === "Y";

              return (
                <table
                  key={question.inspectionQuestionId}
                  className="scale-site-inspection-questions__question-table"
                  aria-label={`Inspection question ${index + 1}`}
                >
                  <colgroup>
                    <col className="scale-site-inspection-questions__col--index" />
                    <col className="scale-site-inspection-questions__col--question" />
                    <col className="scale-site-inspection-questions__col--a" />
                    <col className="scale-site-inspection-questions__col--b" />
                    <col className="scale-site-inspection-questions__col--c" />
                    <col className="scale-site-inspection-questions__col--d" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th rowSpan={2}>#</th>
                      <th rowSpan={2}>Question</th>
                      <th colSpan={4}>Response</th>
                    </tr>
                    <tr>
                      <th>Answer</th>
                      <th colSpan={3}>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        rowSpan={4}
                        className="scale-site-inspection-questions__question-index"
                      >
                        {index + 1}.
                      </td>
                      <td
                        rowSpan={4}
                        className="scale-site-inspection-questions__question-text"
                      >
                        {question.questionText || "Question"}
                      </td>
                      <td>
                        <div className="scale-site-inspection-questions__question-input-wrap">
                          <Select
                            id={`question-answer-${question.inspectionQuestionId}`}
                            labelText={requiredLabel(
                              "Answer",
                              requiredIndicatorClassName,
                            )}
                            hideLabel
                            value={question.inspectionAnswerCode}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                              onFieldChange(
                                index,
                                "inspectionAnswerCode",
                                event.target.value,
                              )
                            }
                            invalid={Boolean(
                              questionErrors.inspectionAnswerCode,
                            )}
                            invalidText={questionErrors.inspectionAnswerCode}
                            disabled={disabled}
                          >
                            <SelectItem value="" text="Select" />
                            {question.answerOptions.map((option) => (
                              <SelectItem
                                key={`${question.inspectionQuestionId}-${option.code}`}
                                value={option.code}
                                text={option.description}
                              />
                            ))}
                          </Select>
                        </div>
                      </td>
                      <td colSpan={3}>
                        <div className="scale-site-inspection-questions__question-input-wrap scale-site-inspection-questions__question-input-wrap--full">
                          <TextArea
                            id={`question-comments-${question.inspectionQuestionId}`}
                            labelText="Comments"
                            hideLabel
                            rows={3}
                            value={question.commentsText}
                            onChange={(
                              event: ChangeEvent<HTMLTextAreaElement>,
                            ) =>
                              onFieldChange(
                                index,
                                "commentsText",
                                event.target.value,
                              )
                            }
                            maxCount={QUESTION_COMMENTS_MAX_LENGTH}
                            enableCounter
                            invalid={Boolean(questionErrors.commentsText)}
                            invalidText={questionErrors.commentsText}
                            disabled={disabled}
                          />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <th colSpan={4}>Follow-Up</th>
                    </tr>
                    <tr>
                      <th>Required?</th>
                      <th>Action Required</th>
                      <th>Due Date</th>
                      <th>Complete?</th>
                    </tr>
                    <tr>
                      <td>
                        <div className="scale-site-inspection-questions__question-input-wrap">
                          <Select
                            id={`question-follow-up-required-${question.inspectionQuestionId}`}
                            labelText={requiredLabel(
                              "Follow-Up Required",
                              requiredIndicatorClassName,
                            )}
                            hideLabel
                            value={question.followUpRequiredInd}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                              onFieldChange(
                                index,
                                "followUpRequiredInd",
                                event.target.value,
                              )
                            }
                            invalid={Boolean(
                              questionErrors.followUpRequiredInd,
                            )}
                            invalidText={questionErrors.followUpRequiredInd}
                            disabled={disabled}
                          >
                            <SelectItem value="Y" text="Yes" />
                            <SelectItem value="N" text="No" />
                          </Select>
                        </div>
                      </td>
                      <td>
                        <div className="scale-site-inspection-questions__question-input-wrap scale-site-inspection-questions__question-input-wrap--full">
                          <TextArea
                            id={`question-follow-up-action-${question.inspectionQuestionId}`}
                            labelText={requiredLabel(
                              "Action Required",
                              requiredIndicatorClassName,
                            )}
                            hideLabel
                            rows={3}
                            value={question.followUpActionText}
                            onChange={(
                              event: ChangeEvent<HTMLTextAreaElement>,
                            ) =>
                              onFieldChange(
                                index,
                                "followUpActionText",
                                event.target.value,
                              )
                            }
                            maxCount={FOLLOW_UP_ACTION_MAX_LENGTH}
                            enableCounter
                            invalid={Boolean(questionErrors.followUpActionText)}
                            invalidText={questionErrors.followUpActionText}
                            disabled={disabled || !followUpEnabled}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="scale-site-inspection-questions__question-input-wrap scale-site-inspection-questions__question-input-wrap--date">
                          <DateInput
                            id={`question-follow-up-due-date-${question.inspectionQuestionId}`}
                            value={question.followUpDueDate}
                            onChange={(value) =>
                              onFieldChange(index, "followUpDueDate", value)
                            }
                            labelText={requiredLabel(
                              "Due Date",
                              requiredIndicatorClassName,
                            )}
                            hideLabel
                            invalid={Boolean(questionErrors.followUpDueDate)}
                            invalidText={questionErrors.followUpDueDate}
                            disabled={disabled || !followUpEnabled}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="scale-site-inspection-questions__question-input-wrap">
                          <Select
                            id={`question-follow-up-completed-${question.inspectionQuestionId}`}
                            labelText={requiredLabel(
                              "Complete?",
                              requiredIndicatorClassName,
                            )}
                            hideLabel
                            value={question.followUpCompletedInd}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                              onFieldChange(
                                index,
                                "followUpCompletedInd",
                                event.target.value,
                              )
                            }
                            invalid={Boolean(
                              questionErrors.followUpCompletedInd,
                            )}
                            invalidText={questionErrors.followUpCompletedInd}
                            disabled={disabled || !followUpEnabled}
                          >
                            <SelectItem value="" text="Select" />
                            <SelectItem value="Y" text="Yes" />
                            <SelectItem value="N" text="No" />
                          </Select>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              );
            })}
          </div>
        ) : (
          <EmptySection
            icon="Information"
            title="No question responses"
            description={emptyStateDescription}
            whiteLayer
          />
        )}
      </section>
    </>
  );
};

export default ScaleSiteInspectionQuestions;
