import { Column, Form, Grid, InlineNotification, Select, SelectItem, TextArea, TextInput } from '@carbon/react';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import DateInput from '@/components/core/DateInput';
import type { FormErrors } from '@/hooks/useMaintenanceCrud';
import type { InspectionQuestionDetail } from '@/services/inspectionQuestions.service';
import type { ScaleMethodTypeLov, StaticLov } from '@/services/lov.service';
import { requiredLabel } from '@/utils/requiredLabel';

export type QuestionFormState = {
  questionText: string;
  commentRequiredInd: string;
  sortOrderNo: string;
  effectiveDate: string;
  expiryDate: string;
  inspectionTypeCodes: string[];
  scalingMethodTypeCodes: string[];
  validResponseCodes: string[];
};

const yesNoOptions = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
];

const labelFor = (lov: { code?: string | null; description?: string | null }[], code: string) =>
  lov.find((l) => l.code === code)?.description ?? code;

type ViewProps = {
  selected: InspectionQuestionDetail | null;
  inspectionTypes: StaticLov[];
  scalingMethods: ScaleMethodTypeLov[];
  validResponses: StaticLov[];
};

/** Read-only field layout shown in the view modal (reads the fetched detail record). */
export const QuestionsViewFields = ({ selected, inspectionTypes, scalingMethods, validResponses }: ViewProps) => {
  if (!selected) {
    return null;
  }
  return (
    <Form className="scs__form">
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
          <TextInput
            id="view-question-id"
            labelText="Question Id"
            value={selected.inspectionQuestionId ? String(selected.inspectionQuestionId) : ''}
            className="scs__disabled-plain-input"
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-sort-order" labelText="Sort Order" value={selected.sortOrderNo != null ? String(selected.sortOrderNo) : ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-inspection-types"
            labelText="Inspection Type"
            value={(selected.inspectionTypeCodes ?? []).map((c) => labelFor(inspectionTypes, c)).join(', ')}
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-comment-required"
            labelText="Comment Required"
            value={selected.commentRequiredInd === 'Y' ? 'Yes' : selected.commentRequiredInd === 'N' ? 'No' : ''}
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-scaling-methods"
            labelText="Scaling Methods"
            value={(selected.scalingMethodTypeCodes ?? []).map((c) => labelFor(scalingMethods, c)).join(', ')}
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-valid-responses"
            labelText="Valid Responses"
            value={(selected.validResponseCodes ?? []).map((c) => labelFor(validResponses, c)).join(', ')}
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-effective-date" labelText="Effective Date" value={selected.effectiveDate ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-expiry-date" labelText="Expiry Date" value={selected.expiryDate ?? ''} readOnly disabled />
        </Column>
        <Column lg={16} md={8} sm={4}>
          <TextArea id="view-question-text" labelText="Question" value={selected.questionText ?? ''} readOnly rows={4} />
        </Column>
      </Grid>
    </Form>
  );
};

type FormFieldsProps = {
  selected: InspectionQuestionDetail | null;
  inspectionTypes: StaticLov[];
  scalingMethods: ScaleMethodTypeLov[];
  validResponses: StaticLov[];
  formState: QuestionFormState;
  formErrors: FormErrors;
  onFieldChange: (patch: Partial<QuestionFormState>) => void;
  isSubmitting: boolean;
  isEdit: boolean;
};

/** Editable field layout for create/edit. Rendered inside the shared modal's Form. */
export const QuestionsFormFields = ({
  selected,
  inspectionTypes,
  scalingMethods,
  validResponses,
  formState,
  formErrors,
  onFieldChange,
  isSubmitting,
  isEdit,
}: FormFieldsProps) => {
  // A question already used in an inspection is locked down to Sort Order + Expiry Date.
  const isReadOnly = isEdit && Boolean(selected?.questionUsed);

  const selectedItems = <T extends { code?: string | null }>(items: T[], codes: string[]) =>
    items.filter((item) => codes.includes(item.code ?? ''));
  const toCodes = (items: Array<{ code?: string | null }>) =>
    items.map((item) => item?.code ?? '').filter((code) => code.length > 0);

  return (
    <>
      {isReadOnly ? (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Question Update"
            subtitle="This question has been used in an inspection. Only Sort Order and Expiry Date can be updated."
          />
        </div>
      ) : null}
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4} className={isEdit ? 'scs__disabled-plain' : undefined}>
          <TextInput
            id="question-id"
            labelText="Question Id"
            value={isEdit && selected?.inspectionQuestionId ? String(selected.inspectionQuestionId) : ''}
            disabled
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="question-sort-order"
            labelText={requiredLabel('Sort Order', 'scs__required')}
            value={formState.sortOrderNo}
            onChange={(e) => onFieldChange({ sortOrderNo: e.target.value })}
            invalid={Boolean(formErrors.sortOrderNo)}
            invalidText={formErrors.sortOrderNo}
            disabled={isSubmitting}
          />
        </Column>

        <Column lg={8} md={8} sm={4} className={isReadOnly ? 'scs__disabled-plain' : undefined}>
          {isReadOnly ? (
            <TextInput
              id="inspection-type-readonly"
              labelText="Inspection Type"
              value={(formState.inspectionTypeCodes ?? []).map((c) => labelFor(inspectionTypes, c)).join(', ')}
              disabled
            />
          ) : (
            <ActiveMultiSelect<StaticLov>
              id="inspection-type"
              items={inspectionTypes}
              itemToString={(item) => (item?.description ? String(item.description) : '')}
              titleText={requiredLabel('Inspection Type', 'scs__required')}
              selectedItems={selectedItems(inspectionTypes, formState.inspectionTypeCodes ?? [])}
              onChange={(event) => onFieldChange({ inspectionTypeCodes: toCodes(event.selectedItems ?? []) })}
              invalid={Boolean(formErrors.inspectionTypeCodes)}
              invalidText={formErrors.inspectionTypeCodes}
              disabled={isSubmitting}
            />
          )}
        </Column>

        <Column lg={8} md={8} sm={4} className={isReadOnly ? 'scs__disabled-plain' : undefined}>
          {isReadOnly ? (
            <TextInput
              id="scaling-methods-readonly"
              labelText="Scaling Methods"
              value={(formState.scalingMethodTypeCodes ?? []).map((c) => labelFor(scalingMethods, c)).join(', ')}
              disabled
            />
          ) : (
            <ActiveMultiSelect<ScaleMethodTypeLov>
              id="scaling-methods"
              items={scalingMethods}
              itemToString={(item) => (item?.description ? String(item.description) : '')}
              titleText={requiredLabel('Scaling Methods', 'scs__required')}
              selectedItems={selectedItems(scalingMethods, formState.scalingMethodTypeCodes ?? [])}
              onChange={(event) => onFieldChange({ scalingMethodTypeCodes: toCodes(event.selectedItems ?? []) })}
              invalid={Boolean(formErrors.scalingMethodTypeCodes)}
              invalidText={formErrors.scalingMethodTypeCodes}
              disabled={isSubmitting}
            />
          )}
        </Column>

        <Column lg={8} md={8} sm={4} className={isReadOnly ? 'scs__disabled-plain' : undefined}>
          {isReadOnly ? (
            <TextInput
              id="valid-responses-readonly"
              labelText="Valid Responses"
              value={(formState.validResponseCodes ?? []).map((c) => labelFor(validResponses, c)).join(', ')}
              disabled
            />
          ) : (
            <ActiveMultiSelect<StaticLov>
              id="valid-responses"
              items={validResponses}
              itemToString={(item) => (item?.description ? String(item.description) : '')}
              titleText={requiredLabel('Valid Responses', 'scs__required')}
              selectedItems={selectedItems(validResponses, formState.validResponseCodes ?? [])}
              onChange={(event) => onFieldChange({ validResponseCodes: toCodes(event.selectedItems ?? []) })}
              invalid={Boolean(formErrors.validResponseCodes)}
              invalidText={formErrors.validResponseCodes}
              disabled={isSubmitting}
            />
          )}
        </Column>

        <Column lg={8} md={8} sm={4} className={isReadOnly ? 'scs__disabled-plain' : undefined}>
          <Select
            id="comment-required"
            labelText={requiredLabel('Comment Required', 'scs__required')}
            value={formState.commentRequiredInd}
            onChange={(event) => onFieldChange({ commentRequiredInd: event.target.value })}
            invalid={Boolean(formErrors.commentRequiredInd)}
            invalidText={formErrors.commentRequiredInd}
            disabled={isSubmitting || isReadOnly}
          >
            <SelectItem value="" text="" />
            {yesNoOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} text={option.label} />
            ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4} className={isReadOnly ? 'scs__disabled-plain' : undefined}>
          <DateInput
            id="effective-date"
            value={formState.effectiveDate}
            onChange={(value: string) => onFieldChange({ effectiveDate: value })}
            placeholder="YYYY-MM-DD"
            ariaLabel="Effective Date"
            labelText={requiredLabel('Effective Date', 'scs__required')}
            hideLabel={false}
            invalid={Boolean(formErrors.effectiveDate)}
            invalidText={formErrors.effectiveDate}
            disabled={isSubmitting || isReadOnly}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="expiry-date"
            value={formState.expiryDate}
            onChange={(value: string) => onFieldChange({ expiryDate: value })}
            placeholder="YYYY-MM-DD"
            ariaLabel="Expiry Date"
            labelText={requiredLabel('Expiry Date', 'scs__required')}
            hideLabel={false}
            invalid={Boolean(formErrors.expiryDate)}
            invalidText={formErrors.expiryDate}
            disabled={isSubmitting}
          />
        </Column>

        <Column lg={16} md={8} sm={4} className={isReadOnly ? 'scs__disabled-plain' : undefined}>
          {isReadOnly ? (
            <TextArea id="question-text-readonly" labelText="Question" value={formState.questionText} disabled rows={4} />
          ) : (
            <TextArea
              id="question-text"
              labelText={requiredLabel('Question', 'scs__required')}
              value={formState.questionText}
              onChange={(e) => onFieldChange({ questionText: e.target.value })}
              invalid={Boolean(formErrors.questionText)}
              invalidText={formErrors.questionText}
              disabled={isSubmitting}
              rows={4}
            />
          )}
        </Column>
      </Grid>
    </>
  );
};
