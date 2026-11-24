import { Column, Grid, Select, SelectItem, TextArea } from '@carbon/react';
import type { ChangeEvent, FC } from 'react';

import DateInput from '@/components/core/DateInput';
import DistrictSelect from '@/components/core/DistrictSelect';
import { requiredLabel } from '@/utils/requiredLabel';

import type {
  AppointmentOption,
  AppointmentFormMode,
  AppointmentFormErrors,
  ScalerAppointmentFormValues,
} from './appointmentFormUtils';

interface Props {
  appointmentOptions: AppointmentOption[];
  errors: AppointmentFormErrors;
  isSubmitting?: boolean;
  mode: AppointmentFormMode;
  values: ScalerAppointmentFormValues;
  onChange: <K extends keyof ScalerAppointmentFormValues>(field: K, value: ScalerAppointmentFormValues[K]) => void;
}

const ScalerAppointmentForm: FC<Props> = ({
  appointmentOptions,
  errors,
  isSubmitting = false,
  mode,
  values,
  onChange,
}) => {
  return (
    <Grid className="view-scaler__modal-grid">
      <Column lg={8} md={4} sm={4}>
        <DistrictSelect
          id="appointment-org-unit-no"
          value={values.orgUnitNo}
          onChange={(value) => onChange('orgUnitNo', value)}
          hideLabel={false}
          labelText="Reg / Dist"
          invalid={Boolean(errors.orgUnitNo)}
          invalidText={errors.orgUnitNo}
          disabled={isSubmitting || values.provinceWideInd === 'Y'}
        />
      </Column>

      <Column lg={8} md={4} sm={4}>
        <Select
          id="appointment-code"
          value={values.appointmentCode}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange('appointmentCode', event.target.value)}
          labelText={requiredLabel('Appointment', 'view-scaler__required')}
          invalid={Boolean(errors.appointmentCode)}
          invalidText={errors.appointmentCode}
          disabled={isSubmitting}
        >
          <SelectItem value="" text="Select" />
          {appointmentOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} text={option.text} />
          ))}
        </Select>
      </Column>

      <Column lg={8} md={4} sm={4}>
        <Select
          id="appointment-province-wide"
          value={values.provinceWideInd}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onChange('provinceWideInd', event.target.value as ScalerAppointmentFormValues['provinceWideInd'])
          }
          labelText={requiredLabel('Province Wide?', 'view-scaler__required')}
          invalid={Boolean(errors.provinceWideInd)}
          invalidText={errors.provinceWideInd}
          disabled={isSubmitting}
        >
          <SelectItem value="" text="Select" />
          <SelectItem value="Y" text="Yes" />
          <SelectItem value="N" text="No" />
        </Select>
      </Column>

      <Column lg={8} md={4} sm={4}>
        <DateInput
          id="appointment-issued-date"
          value={values.issuedDate}
          onChange={(value) => onChange('issuedDate', value)}
          labelText={requiredLabel('Effective Date', 'view-scaler__required')}
          hideLabel={false}
          invalid={Boolean(errors.issuedDate)}
          invalidText={errors.issuedDate}
          disabled={isSubmitting}
        />
      </Column>

      <Column lg={8} md={4} sm={4}>
        <DateInput
          id="appointment-expiry-date"
          value={values.expiryDate}
          onChange={(value) => onChange('expiryDate', value)}
          labelText="Expiry Date"
          hideLabel={false}
          invalid={Boolean(errors.expiryDate)}
          invalidText={errors.expiryDate}
          disabled={isSubmitting}
        />
      </Column>

      {mode === 'edit' ? (
        <>
          <Column lg={8} md={4} sm={4}>
            <DateInput
              id="appointment-cancellation-date"
              value={values.cancellationDate}
              onChange={(value) => onChange('cancellationDate', value)}
              labelText="Cancellation Date"
              hideLabel={false}
              invalid={Boolean(errors.cancellationDate)}
              invalidText={errors.cancellationDate}
              disabled={isSubmitting}
            />
          </Column>

          <Column lg={16} md={8} sm={4}>
            <TextArea
              id="appointment-cancellation-reason"
              labelText="Cancellation Reason"
              value={values.cancellationReasonTxt}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                onChange('cancellationReasonTxt', event.target.value)
              }
              invalid={Boolean(errors.cancellationReasonTxt)}
              invalidText={errors.cancellationReasonTxt}
              disabled={isSubmitting}
              rows={3}
            />
          </Column>
        </>
      ) : null}
    </Grid>
  );
};

export default ScalerAppointmentForm;


