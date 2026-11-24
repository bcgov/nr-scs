import { Column, Form, Grid, Select, SelectItem, TextInput } from '@carbon/react';
import { type ChangeEvent, useMemo } from 'react';

import DateInput from '@/components/core/DateInput';
import type { FormErrors } from '@/hooks/useMaintenanceCrud';
import type { AppointmentTypeLov, GradingCodeAppointmentTypeLov } from '@/services/lov.service';
import type { ValidLicenceAttributeDetail } from '@/services/validLicenceAttributes.service';
import { requiredLabel } from '@/utils/requiredLabel';

export type ValidLicenceAttributeFormState = {
  scaleGradingSystemCode: string;
  scalerAppointmentType: string;
  effectiveDate: string;
  expiryDate: string;
};

export type GradingSystemOption = { code: string; name: string };

const gradingSystemName = (
  gradingSystemOptions: GradingSystemOption[],
  attr: ValidLicenceAttributeDetail | null,
) => {
  if (!attr?.scaleGradingSystemCode) {
    return '';
  }
  return gradingSystemOptions.find((o) => o.code === attr.scaleGradingSystemCode)?.name ?? attr.scaleGradingSystemCode;
};

const description = (
  gradingCodeLov: GradingCodeAppointmentTypeLov[],
  attr: ValidLicenceAttributeDetail | null,
) => {
  const raw = (() => {
    if (!attr) {
      return '';
    }
    if (attr.scalerAppointmentTypeDescription) {
      return attr.scalerAppointmentTypeDescription;
    }
    const match = gradingCodeLov.find(
      (l) =>
        l.scaleGradingSystemCode === attr.scaleGradingSystemCode &&
        l.scalerAppointmentType === attr.scalerAppointmentType,
    );
    return match?.description ?? '';
  })();
  const dashIdx = raw.lastIndexOf(' - ');
  return dashIdx === -1 ? raw : raw.substring(0, dashIdx);
};

const actingDisplay = (attr: ValidLicenceAttributeDetail | null) => {
  if (!attr?.scalerAppointmentTypeActing) {
    return '';
  }
  return attr.scalerAppointmentTypeActing === 'Y' ? 'Yes' : 'No';
};

type ViewProps = {
  selected: ValidLicenceAttributeDetail | null;
  gradingCodeLov: GradingCodeAppointmentTypeLov[];
  gradingSystemOptions: GradingSystemOption[];
};

/** Read-only field layout shown in the view modal (reads the fetched detail record). */
export const ValidLicenceAttributesViewFields = ({ selected, gradingCodeLov, gradingSystemOptions }: ViewProps) => {
  if (!selected) {
    return null;
  }
  return (
    <Form className="scs__form">
      <Grid className="scs__grid--tight">
        <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
          <TextInput id="view-vla-grading-system" labelText="Grading System" value={gradingSystemName(gradingSystemOptions, selected)} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
          <TextInput id="view-vla-appointment-type" labelText="Appointment Type" value={selected.scalerAppointmentType ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-vla-description" labelText="Appointment Type Description" value={description(gradingCodeLov, selected)} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-vla-acting" labelText="Acting?" value={actingDisplay(selected)} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-vla-effective" labelText="Effective Date" value={selected.effectiveDate ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-vla-expiry" labelText="Expiry Date" value={selected.expiryDate ?? ''} readOnly disabled />
        </Column>
      </Grid>
    </Form>
  );
};

type FormFieldsProps = {
  selected: ValidLicenceAttributeDetail | null;
  gradingCodeLov: GradingCodeAppointmentTypeLov[];
  appointmentTypeLov: AppointmentTypeLov[];
  gradingSystemOptions: GradingSystemOption[];
  formState: ValidLicenceAttributeFormState;
  formErrors: FormErrors;
  onFieldChange: (patch: Partial<ValidLicenceAttributeFormState>) => void;
  isSubmitting: boolean;
  isCreate: boolean;
  isEdit: boolean;
};

/** Editable field layout for create/edit. Rendered inside the shared modal's Form. */
export const ValidLicenceAttributesFormFields = ({
  selected,
  gradingCodeLov,
  appointmentTypeLov,
  gradingSystemOptions,
  formState,
  formErrors,
  onFieldChange,
  isSubmitting,
  isCreate,
  isEdit,
}: FormFieldsProps) => {
  // The Add-Attribute dropdown must offer every appointment type (legacy backed it with the
  // full SCS_APPT_TYPE_LOV_VW_PKG list), NOT only those already cross-referenced to a grading
  // code. Deriving it from gradingCodeLov (the grading-code xref) hid any newly added
  // appointment type until an xref row existed — the chicken-and-egg reported bug.
  const apptTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    const codes: string[] = [];
    for (const lov of appointmentTypeLov) {
      const code = lov.code ?? '';
      if (code && !seen.has(code)) {
        seen.add(code);
        codes.push(code);
      }
    }
    return codes.sort((a, b) => a.localeCompare(b));
  }, [appointmentTypeLov]);

  return (
    <Grid className="scs__grid--tight">
      <Column lg={8} md={8} sm={4} className={isEdit ? 'scs__disabled-plain' : undefined}>
        {isCreate ? (
          <Select
            id="vla-grading-system"
            labelText={requiredLabel('Grading System Code', 'scs__required')}
            value={formState.scaleGradingSystemCode}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => onFieldChange({ scaleGradingSystemCode: event.target.value })}
            invalid={Boolean(formErrors.scaleGradingSystemCode)}
            invalidText={formErrors.scaleGradingSystemCode}
            disabled={isSubmitting}
          >
            <SelectItem value="" text="" />
            {gradingSystemOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code} text={opt.name} />
            ))}
          </Select>
        ) : (
          <TextInput id="vla-grading-system" labelText="Grading System" value={gradingSystemName(gradingSystemOptions, selected)} disabled />
        )}
      </Column>

      <Column lg={8} md={8} sm={4} className={isEdit ? 'scs__disabled-plain' : undefined}>
        {isCreate ? (
          <Select
            id="vla-appointment-type"
            labelText={requiredLabel('Appointment Type', 'scs__required')}
            value={formState.scalerAppointmentType}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => onFieldChange({ scalerAppointmentType: event.target.value })}
            invalid={Boolean(formErrors.scalerAppointmentType)}
            invalidText={formErrors.scalerAppointmentType}
            disabled={isSubmitting}
          >
            <SelectItem value="" text="" />
            {apptTypeOptions.map((code) => (
              <SelectItem key={code} value={code} text={code} />
            ))}
          </Select>
        ) : (
          <TextInput id="vla-appointment-type" labelText="Appointment Type" value={formState.scalerAppointmentType} disabled />
        )}
      </Column>

      {isEdit ? (
        <>
          <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
            <TextInput id="vla-description" labelText="Appointment Type Description" value={description(gradingCodeLov, selected)} disabled />
          </Column>
          <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
            <TextInput id="vla-acting" labelText="Acting?" value={actingDisplay(selected)} disabled />
          </Column>
        </>
      ) : null}

      <Column lg={8} md={8} sm={4}>
        <DateInput
          id="vla-effective-date"
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
          id="vla-expiry-date"
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
    </Grid>
  );
};
