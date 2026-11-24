import { Column, Form, Grid, Select, SelectItem, TextArea, TextInput } from '@carbon/react';
import type React from 'react';

import DateInput from '@/components/core/DateInput';
import type { FormErrors } from '@/hooks/useMaintenanceCrud';
import type { ExamUpgrade } from '@/services/examUpgrades.service';
import type { StaticLov } from '@/services/lov.service';
import { requiredLabel } from '@/utils/requiredLabel';

const yesNoOptions = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
];

export type ExamUpgradeFormState = {
  scalerTrainingClassCode: string;
  scalerTrainingTypeId: string;
  licenceAccreditInd: string;
  description: string;
  effectiveDate: string;
  expiryDate: string;
};

const classCodeLabelFor = (classCodeTypes: StaticLov[], code?: string | null) =>
  classCodeTypes.find((l) => l.code === code)?.description ?? code ?? '';

const licenceAccreditLabel = (value?: string | null) =>
  value === 'Y' ? 'Yes' : value === 'N' ? 'No' : '';

type ViewProps = { selected: ExamUpgrade | null; classCodeTypes: StaticLov[] };

/** Read-only field layout shown in the view modal (reads the fetched detail record). */
export const ExamUpgradesViewFields = ({ selected, classCodeTypes }: ViewProps) => {
  if (!selected) {
    return null;
  }
  return (
    <Form className="scs__form">
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
          <TextInput id="view-exam-upgrade-id" labelText="Exam / Upgrade #" value={selected.scalerTrainingTypeId ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-exam-upgrade-type"
            labelText="Type"
            value={classCodeLabelFor(classCodeTypes, selected.scalerTrainingClassCode)}
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-exam-upgrade-effective-date" labelText="Effective Date" value={selected.effectiveDate ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-exam-upgrade-expiry-date" labelText="Expiry Date" value={selected.expiryDate ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-exam-upgrade-licence-accredit"
            labelText="Licence Accredit?"
            value={licenceAccreditLabel(selected.licenceAccreditInd)}
            readOnly
            disabled
          />
        </Column>
        <Column lg={16} md={8} sm={4}>
          <TextArea id="view-exam-upgrade-description" labelText="Description" value={selected.description ?? ''} readOnly rows={4} />
        </Column>
      </Grid>
    </Form>
  );
};

type FormFieldsProps = {
  selected: ExamUpgrade | null;
  classCodeTypes: StaticLov[];
  formState: ExamUpgradeFormState;
  formErrors: FormErrors;
  onFieldChange: (patch: Partial<ExamUpgradeFormState>) => void;
  isSubmitting: boolean;
  isEdit: boolean;
};

/** Editable field layout for create/edit. Rendered inside the shared modal's Form. */
export const ExamUpgradesFormFields = ({
  selected,
  classCodeTypes,
  formState,
  formErrors,
  onFieldChange,
  isSubmitting,
  isEdit,
}: FormFieldsProps) => (
  <>
    <h4>Details</h4>
    <Grid className="scs__form__grid">
      <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
        <TextInput
          id="exam-upgrade-id"
          labelText="Exam / Upgrade #"
          value={isEdit ? (selected?.scalerTrainingTypeId ?? '') : ''}
          disabled
        />
      </Column>

      <Column lg={8} md={8} sm={4} className={isEdit ? 'scs__disabled-plain' : undefined}>
        <Select
          id="exam-upgrade-type"
          labelText={requiredLabel('Type', 'scs__required')}
          value={formState.scalerTrainingClassCode}
          onChange={(e) => onFieldChange({ scalerTrainingClassCode: e.target.value })}
          invalid={Boolean(formErrors.scalerTrainingClassCode)}
          invalidText={formErrors.scalerTrainingClassCode}
          disabled={isSubmitting || isEdit}
        >
          <SelectItem value="" text="" />
          {classCodeTypes.map((item) => (
            <SelectItem key={item.code ?? item.description} value={item.code ?? ''} text={item.description ?? ''} />
          ))}
        </Select>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <DateInput
          id="exam-upgrade-effective-date"
          value={formState.effectiveDate}
          onChange={(value: string) => onFieldChange({ effectiveDate: value })}
          placeholder="YYYY-MM-DD"
          ariaLabel="Effective Date"
          labelText={requiredLabel('Effective Date', 'scs__required')}
          hideLabel={false}
          invalid={Boolean(formErrors.effectiveDate)}
          invalidText={formErrors.effectiveDate}
          disabled={isSubmitting}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <DateInput
          id="exam-upgrade-expiry-date"
          value={formState.expiryDate}
          onChange={(value: string) => onFieldChange({ expiryDate: value })}
          placeholder="YYYY-MM-DD"
          ariaLabel="Expiry Date"
          labelText="Expiry Date"
          hideLabel={false}
          invalid={Boolean(formErrors.expiryDate)}
          invalidText={formErrors.expiryDate}
          disabled={isSubmitting}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Select
          id="exam-upgrade-licence-accredit"
          labelText={requiredLabel('Licence Accredit?', 'scs__required')}
          value={formState.licenceAccreditInd}
          onChange={(e) => onFieldChange({ licenceAccreditInd: e.target.value })}
          invalid={Boolean(formErrors.licenceAccreditInd)}
          invalidText={formErrors.licenceAccreditInd}
          disabled={isSubmitting}
        >
          <SelectItem value="" text="" />
          {yesNoOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} text={option.label} />
          ))}
        </Select>
      </Column>

      <Column lg={16} md={8} sm={4}>
        <TextArea
          id="exam-upgrade-description"
          labelText={requiredLabel('Description', 'scs__required')}
          value={formState.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onFieldChange({ description: e.target.value })}
          invalid={Boolean(formErrors.description)}
          invalidText={formErrors.description}
          disabled={isSubmitting}
          rows={4}
        />
      </Column>
    </Grid>
  </>
);
