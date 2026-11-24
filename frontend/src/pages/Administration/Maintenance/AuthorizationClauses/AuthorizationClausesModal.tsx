import { Column, Form, Grid, Select, SelectItem, TextArea, TextInput } from '@carbon/react';
import type React from 'react';

import DateInput from '@/components/core/DateInput';
import type { FormErrors } from '@/hooks/useMaintenanceCrud';
import type { ScaleMethodAuthClauseDetail } from '@/services/authorizationClauses.service';
import type { ScaleMethodTypeLov } from '@/services/lov.service';
import { requiredLabel } from '@/utils/requiredLabel';

export type AuthorizationClauseFormState = {
  scaleMethodTypeCode: string;
  scalerAuthorizationClause: string;
  effectiveDate: string;
  expiryDate: string;
};

const methodTypeLabel = (methodTypes: ScaleMethodTypeLov[], code?: string | null) =>
  methodTypes.find((m) => m.code === code)?.description ?? code ?? '';

type ViewProps = {
  selected: ScaleMethodAuthClauseDetail | null;
  methodTypes: ScaleMethodTypeLov[];
};

/** Read-only field layout shown in the view modal (reads the fetched detail record). */
export const AuthorizationClausesViewFields = ({ selected, methodTypes }: ViewProps) => {
  if (!selected) {
    return null;
  }
  return (
    <Form className="scs__form">
      <Grid className="authz-clauses__grid scs__grid--tight">
        <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
          <TextInput
            id="view-clause-id"
            labelText="Clause #"
            value={String(selected.scaleMethodAuthClauseId ?? '')}
            className="scs__disabled-plain-input"
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-clause-type"
            labelText="Scale Method"
            value={methodTypeLabel(methodTypes, selected.scaleMethodTypeCode)}
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-clause-effective" labelText="Effective Date" value={selected.effectiveDate ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-clause-expiry" labelText="Expiry Date" value={selected.expiryDate ?? ''} readOnly disabled />
        </Column>
        <Column lg={16} md={8} sm={4}>
          <TextArea id="view-clause-text" labelText="Clause" value={selected.scalerAuthorizationClause ?? ''} readOnly rows={4} />
        </Column>
      </Grid>
    </Form>
  );
};

type FormFieldsProps = {
  selected: ScaleMethodAuthClauseDetail | null;
  methodTypes: ScaleMethodTypeLov[];
  formState: AuthorizationClauseFormState;
  formErrors: FormErrors;
  onFieldChange: (patch: Partial<AuthorizationClauseFormState>) => void;
  isSubmitting: boolean;
  isEdit: boolean;
};

/** Editable field layout for create/edit. Rendered inside the shared modal's Form. */
export const AuthorizationClausesFormFields = ({
  selected,
  methodTypes,
  formState,
  formErrors,
  onFieldChange,
  isSubmitting,
  isEdit,
}: FormFieldsProps) => (
  <>
    <h4>Details</h4>
    <Grid className="authz-clauses__grid scs__grid--tight">
      <Column lg={8} md={8} sm={4} className={isEdit ? 'scs__disabled-plain' : undefined}>
        <TextInput id="clause-id" labelText="Clause #" value={selected?.scaleMethodAuthClauseId ?? ''} disabled />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Select
          id="clause-type"
          labelText={requiredLabel('Scale Method', 'scs__required')}
          value={formState.scaleMethodTypeCode}
          onChange={(event) => onFieldChange({ scaleMethodTypeCode: event.target.value })}
          invalid={Boolean(formErrors.scaleMethodTypeCode)}
          invalidText={formErrors.scaleMethodTypeCode}
          disabled={isSubmitting}
        >
          <SelectItem value="" text="" />
          {methodTypes.map((item) => (
            <SelectItem key={item.code ?? item.description} value={item.code ?? ''} text={item.description ?? ''} />
          ))}
        </Select>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <DateInput
          id="clause-effective-date"
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
          id="clause-expiry-date"
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

      <Column lg={16} md={8} sm={4}>
        <TextArea
          id="clause-text"
          labelText={requiredLabel('Clause', 'scs__required')}
          value={formState.scalerAuthorizationClause}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            onFieldChange({ scalerAuthorizationClause: event.target.value })
          }
          invalid={Boolean(formErrors.scalerAuthorizationClause)}
          invalidText={formErrors.scalerAuthorizationClause}
          disabled={isSubmitting}
          rows={4}
        />
      </Column>
    </Grid>
  </>
);
