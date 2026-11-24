import { Column, Form, Grid, TextInput } from '@carbon/react';

import RegDistSelect from '@/components/core/RegDistSelect';
import type { FormErrors } from '@/hooks/useMaintenanceCrud';
import type { ScaleSignatoryBlock } from '@/services/signatureBlocks.service';
import { requiredLabel } from '@/utils/requiredLabel';

export type SignatureBlockFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  signatureTitle: string;
  /** Holds the org-unit *code* (resolved to a number on save). */
  orgUnitNo: string;
};

type ViewProps = {
  selected: ScaleSignatoryBlock | null;
  resolveRegDist: (orgUnitNo?: number | null, orgUnitDescription?: string | null) => string;
  buildFullName: (block: ScaleSignatoryBlock) => string;
};

/** Read-only field layout shown in the view modal (reads the fetched detail record). */
export const SignatureBlocksViewFields = ({ selected, resolveRegDist, buildFullName }: ViewProps) => {
  if (!selected) {
    return null;
  }
  return (
    <Form className="scs__form">
      <Grid className="scs__grid--tight scs__field-grid">
        <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
          <TextInput
            id="view-block-id"
            labelText="Block #"
            value={String(selected.scaleSignatoryBlockId ?? '')}
            className="scs__disabled-plain-input"
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-block-name" labelText="Name" value={buildFullName(selected)} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-block-position" labelText="Position" value={selected.signatureTitle ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-block-regdist"
            labelText="Reg / Dist"
            value={resolveRegDist(selected.orgUnitNo ?? null, selected.orgUnitDescription ?? null)}
            readOnly
            disabled
          />
        </Column>
      </Grid>
    </Form>
  );
};

type FormFieldsProps = {
  selected: ScaleSignatoryBlock | null;
  formState: SignatureBlockFormState;
  formErrors: FormErrors;
  onFieldChange: (patch: Partial<SignatureBlockFormState>) => void;
  isSubmitting: boolean;
  isEdit: boolean;
};

/** Editable field layout for create/edit. Rendered inside the shared modal's Form. */
export const SignatureBlocksFormFields = ({
  selected,
  formState,
  formErrors,
  onFieldChange,
  isSubmitting,
  isEdit,
}: FormFieldsProps) => (
  <>
    <h4>Details</h4>
    <Grid className="scs__grid--tight scs__field-grid">
      <Column lg={8} md={8} sm={4} className={isEdit ? 'scs__disabled-plain' : undefined}>
        <TextInput id="block-id" labelText="Block #" value={selected?.scaleSignatoryBlockId ?? ''} disabled />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="block-first-name"
          labelText={requiredLabel('First Name', 'scs__required')}
          value={formState.firstName}
          onChange={(event) => onFieldChange({ firstName: event.target.value })}
          invalid={Boolean(formErrors.firstName)}
          invalidText={formErrors.firstName}
          disabled={isSubmitting}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="block-middle-name"
          labelText="Middle Name"
          value={formState.middleName}
          onChange={(event) => onFieldChange({ middleName: event.target.value })}
          invalid={Boolean(formErrors.middleName)}
          invalidText={formErrors.middleName}
          disabled={isSubmitting}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="block-last-name"
          labelText={requiredLabel('Last Name', 'scs__required')}
          value={formState.lastName}
          onChange={(event) => onFieldChange({ lastName: event.target.value })}
          invalid={Boolean(formErrors.lastName)}
          invalidText={formErrors.lastName}
          disabled={isSubmitting}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="block-position"
          labelText={requiredLabel('Position', 'scs__required')}
          value={formState.signatureTitle}
          onChange={(event) => onFieldChange({ signatureTitle: event.target.value })}
          invalid={Boolean(formErrors.signatureTitle)}
          invalidText={formErrors.signatureTitle}
          disabled={isSubmitting}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <RegDistSelect
          id="block-regdist"
          labelText={requiredLabel('Reg / Dist', 'scs__required')}
          hideLabel={false}
          value={formState.orgUnitNo}
          onChange={(value) => onFieldChange({ orgUnitNo: value })}
          invalid={Boolean(formErrors.orgUnitNo)}
          invalidText={formErrors.orgUnitNo}
          disabled={isSubmitting}
          emptyText=""
        />
      </Column>
    </Grid>
  </>
);
