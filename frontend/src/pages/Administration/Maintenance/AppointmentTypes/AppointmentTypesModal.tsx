import { Column, Form, Grid, Select, SelectItem, TextArea, TextInput } from '@carbon/react';

import DateInput from '@/components/core/DateInput';
import type { FormErrors } from '@/hooks/useMaintenanceCrud';
import { requiredLabel } from '@/utils/requiredLabel';

export type AppointmentTypeFormState = {
  code: string;
  description: string;
  effectiveDate: string;
  expiryDate: string;
  acting: '' | 'yes' | 'no';
};

/** Read-only field layout shown in the view modal. */
export const AppointmentTypesViewFields = ({ formState }: { formState: AppointmentTypeFormState }) => {
  const actingLabel = formState.acting === 'yes' ? 'Yes' : formState.acting === 'no' ? 'No' : '';

  return (
    <Form className="scs__form">
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
          <TextInput id="view-appointment-code" labelText="Appointment Type" value={formState.code} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-appointment-acting" labelText="Acting?" value={actingLabel} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-appointment-effective-date"
            labelText="Effective Date"
            value={formState.effectiveDate}
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-appointment-expiry-date"
            labelText="Expiry Date"
            value={formState.expiryDate}
            readOnly
            disabled
          />
        </Column>
        <Column lg={16} md={8} sm={4}>
          <TextArea id="view-appointment-description" labelText="Appointment Description" value={formState.description} readOnly rows={4} />
        </Column>
      </Grid>
    </Form>
  );
};

type FormFieldsProps = {
  formState: AppointmentTypeFormState;
  formErrors: FormErrors;
  onFieldChange: (patch: Partial<AppointmentTypeFormState>) => void;
  isSubmitting: boolean;
  isEdit: boolean;
};

/** Editable field layout for create/edit. Rendered inside the shared modal's Form. */
export const AppointmentTypesFormFields = ({
  formState,
  formErrors,
  onFieldChange,
  isSubmitting,
  isEdit,
}: FormFieldsProps) => (
  <Grid className="scs__form__grid">
    <Column lg={8} md={4} sm={4} className={isEdit ? 'scs__disabled-plain' : undefined}>
      <TextInput
        id="appointment-code"
        labelText={requiredLabel('Appointment Type', 'scs__required')}
        placeholder="e.g., CS"
        value={formState.code}
        onChange={(e) => onFieldChange({ code: e.target.value })}
        disabled={isSubmitting || isEdit}
        invalid={!!formErrors.code}
        invalidText={formErrors.code}
        maxLength={4}
        required
      />
    </Column>

    <Column lg={8} md={4} sm={4}>
      <Select
        id="appointment-acting"
        labelText={requiredLabel('Acting?', 'scs__required')}
        value={formState.acting}
        onChange={(e) => onFieldChange({ acting: e.target.value as '' | 'yes' | 'no' })}
        disabled={isSubmitting}
        invalid={Boolean(formErrors.acting)}
        invalidText={formErrors.acting}
      >
        <SelectItem value="" text="" />
        <SelectItem value="yes" text="Yes" />
        <SelectItem value="no" text="No" />
      </Select>
    </Column>

    <Column lg={8} md={4} sm={4}>
      <DateInput
        id="appointment-effective-date"
        value={formState.effectiveDate}
        onChange={(value: string) => onFieldChange({ effectiveDate: value })}
        placeholder="YYYY-MM-DD"
        labelText={requiredLabel('Effective Date', 'scs__required')}
        hideLabel={false}
        invalid={Boolean(formErrors.effectiveDate)}
        invalidText={formErrors.effectiveDate}
        disabled={isSubmitting}
      />
    </Column>

    <Column lg={8} md={4} sm={4}>
      <DateInput
        id="appointment-expiry-date"
        value={formState.expiryDate}
        onChange={(value: string) => onFieldChange({ expiryDate: value })}
        placeholder="YYYY-MM-DD"
        labelText={requiredLabel('Expiry Date', 'scs__required')}
        hideLabel={false}
        invalid={Boolean(formErrors.expiryDate)}
        invalidText={formErrors.expiryDate}
        disabled={isSubmitting}
      />
    </Column>

    <Column lg={16} md={8} sm={4}>
      <TextArea
        id="appointment-description"
        labelText={requiredLabel('Appointment Description', 'scs__required')}
        placeholder="e.g., Check Scaler"
        value={formState.description}
        onChange={(e) => onFieldChange({ description: e.target.value })}
        disabled={isSubmitting}
        invalid={!!formErrors.description}
        invalidText={formErrors.description}
        rows={4}
        required
      />
    </Column>
  </Grid>
);
