import {
  Checkbox,
  Form,
  Grid,
  Column,
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
} from '@carbon/react';
import { Reset as ResetIcon, Save as SaveIcon, TrashCan as DeleteIcon } from '@carbon/icons-react';
import { type ChangeEvent, type FC, useMemo } from 'react';
import Button from '@/components/core/Button';
import ClientLocSearch from '@/components/core/ClientLocSearch';
import DateInput from '@/components/core/DateInput';
import DistrictSelect from '@/components/core/DistrictSelect';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import { requiredLabel } from '@/utils/requiredLabel';
import './index.scss';
import { computeActiveBranchKeys, FIXED_CLIENT_LOC } from './logic';
import type {
  ScalerFormMode,
  ScalerAppointmentOption,
  ScalerTrainingOption,
  ScalerFormValues,
} from './logic';

export type {
  ScalerFormMode,
  ScalerAppointmentOption,
  ScalerTrainingOption,
  ScalerFormValues,
  ScalerFormValidationResult,
  ValidateScalerFormOptions,
} from './logic';

interface ScalerFormProps {
  mode: ScalerFormMode;
  values: ScalerFormValues;
  onChange: <K extends keyof ScalerFormValues>(field: K, value: ScalerFormValues[K]) => void;
  fieldErrors: Record<string, string>;
  formError: string | null;
  submitAttempted: boolean;
  isSubmitting: boolean;
  appointmentOptions: ScalerAppointmentOption[];
  trainingOptions: ScalerTrainingOption[];
  appointmentTypesError?: string | null;
  trainingTypesError?: string | null;
  onSave: () => void;
  onReset: () => void;
  /** Edit mode: Reset refetches the persisted record; shows progress while the reload is in flight. */
  isResetting?: boolean;
  /** Edit mode: the immutable identity rows (legacy updateScaler.jsp:18-46). */
  scalerLicenceNo?: string;
  /** Edit mode: opens the delete confirmation (legacy updateScaler.jsp:237-246 Delete Record). */
  onDelete?: () => void;
}

/** The scaler create/edit form (legacy createScaler.jsp / updateScaler.jsp), shared by the Create page and the edit modal. */
const ScalerForm: FC<ScalerFormProps> = ({
  mode,
  values,
  onChange,
  fieldErrors,
  formError,
  submitAttempted,
  isSubmitting,
  appointmentOptions,
  trainingOptions,
  appointmentTypesError,
  trainingTypesError,
  onSave,
  onReset,
  isResetting = false,
  scalerLicenceNo,
  onDelete,
}) => {
  const edit = mode === 'edit';

  const visibleFieldErrors = useMemo(() => {
    const alwaysVisible = edit
      ? ['district', 'effectiveDate', 'expiryDate', 'oathTaken', 'licenceTypes']
      : ['client', 'loc', 'district', 'effectiveDate', 'oathTaken'];
    const allowed = new Set([...alwaysVisible, ...computeActiveBranchKeys(values)]);
    return Object.fromEntries(Object.entries(fieldErrors).filter(([key]) => allowed.has(key)));
  }, [edit, fieldErrors, values]);

  const notificationSubtitle =
    formError ?? Object.values(visibleFieldErrors)[0] ?? 'Some required fields are missing.';

  const showError = (key: string) => submitAttempted && Boolean(visibleFieldErrors[key]);

  return (
    <Form onSubmit={(e) => e.preventDefault()} className="scs__form">
      {submitAttempted && (formError || Object.keys(visibleFieldErrors).length > 0) ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Please fix the errors below."
          subtitle={notificationSubtitle}
          style={{ marginBottom: '24px' }}
        />
      ) : null}
      {appointmentTypesError ? (
        <InlineNotification kind="error" lowContrast title="Appointment types unavailable." subtitle={appointmentTypesError} style={{ marginBottom: '24px' }} />
      ) : null}
      {trainingTypesError ? (
        <InlineNotification kind="error" lowContrast title="Exam / upgrade types unavailable." subtitle={trainingTypesError} style={{ marginBottom: '24px' }} />
      ) : null}

      {edit ? null : <h4 className="scs__form__section-title">Scaler Information</h4>}

      <Grid className="scs__form__grid">
        {edit ? (
          <>
            <Column lg={8} md={8} sm={4}>
              <div className="scs__form__readonly">
                <div className="cds--label">Licence #:</div>
                <div data-testid="scaler-edit-licence-no">{scalerLicenceNo ?? ''}</div>
              </div>
            </Column>
            <Column lg={8} md={8} sm={4}>
              <div className="scs__form__readonly">
                <div className="cds--label">Scaler (Client / Loc):</div>
                <div data-testid="scaler-edit-client-loc">
                  {values.client ? `${values.client} / ${FIXED_CLIENT_LOC}` : ''}
                </div>
              </div>
            </Column>
          </>
        ) : (
          <Column lg={8} md={8} sm={4}>
            <ClientLocSearch
              labelText={requiredLabel('Scaler (Client / Loc)', 'scaler-create__required')}
              client={values.client}
              loc={values.loc}
              onClientChange={(value) => {
                onChange('client', value);
                onChange('loc', FIXED_CLIENT_LOC);
              }}
              onLocChange={() => onChange('loc', FIXED_CLIENT_LOC)}
              showSearchButton
              clientId="clientNumber"
              locId="clientLocnCode"
              locReadOnly
              rowInvalidText={
                showError('client') || showError('loc')
                  ? visibleFieldErrors.client ?? visibleFieldErrors.loc
                  : undefined
              }
            />
          </Column>
        )}

        <Column lg={8} md={8} sm={4}>
          <DistrictSelect
            value={values.regDist}
            onChange={(v: string) => onChange('regDist', v)}
            hideLabel={false}
            labelText={requiredLabel(edit ? 'Reg / Dist' : 'District', 'scaler-create__required')}
            invalid={showError('district')}
            invalidText={visibleFieldErrors.district}
          />
        </Column>

        {edit ? (
          <Column lg={8} md={8} sm={4}>
            <fieldset className="scs__form__licence-types">
              <legend className="cds--label">
                {requiredLabel('Licence Type', 'scaler-create__required')}
              </legend>
              <Checkbox
                id="licence-type-scaling"
                labelText="Scaling"
                checked={values.licenceScaling}
                onChange={(_e: unknown, { checked }: { checked: boolean }) =>
                  onChange('licenceScaling', checked)
                }
              />
              <Checkbox
                id="licence-type-waste"
                labelText="Waste"
                checked={values.licenceWaste}
                onChange={(_e: unknown, { checked }: { checked: boolean }) =>
                  onChange('licenceWaste', checked)
                }
              />
              {showError('licenceTypes') ? (
                <div className="scs__form__field-error">{visibleFieldErrors.licenceTypes}</div>
              ) : null}
            </fieldset>
          </Column>
        ) : null}

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="effective-date"
            value={values.effectiveDate}
            onChange={(v: string) => onChange('effectiveDate', v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="Effective Date"
            labelText={requiredLabel('Effective Date', 'scaler-create__required')}
            hideLabel={false}
            invalid={showError('effectiveDate')}
            invalidText={visibleFieldErrors.effectiveDate}
          />
        </Column>

        {edit ? (
          <Column lg={8} md={8} sm={4}>
            <DateInput
              id="expiry-date"
              value={values.expiryDate}
              onChange={(v: string) => onChange('expiryDate', v)}
              placeholder="YYYY-MM-DD"
              ariaLabel="Expiry Date"
              labelText="Expiry Date"
              hideLabel={false}
              invalid={showError('expiryDate')}
              invalidText={visibleFieldErrors.expiryDate}
            />
          </Column>
        ) : null}

        <Column lg={8} md={8} sm={4}>
          <Select
            id="scaler-oath-taken"
            value={values.oathTaken}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              onChange('oathTaken', e.target.value as ScalerFormValues['oathTaken'])
            }
            labelText={requiredLabel('Scaler Oath Taken?', 'scaler-create__required')}
            invalid={showError('oathTaken')}
            invalidText={visibleFieldErrors.oathTaken}
          >
            <SelectItem value="" text="" />
            <SelectItem value="No" text="No" />
            <SelectItem value="Yes" text="Yes" />
          </Select>
        </Column>
      </Grid>

      <div className="scs__form__divider" />

      <h4 className="scs__form__section-title">Please select one of the following</h4>
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4}>
          <Select
            id="appointment"
            value={values.appointment}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange('appointment', e.target.value)}
            labelText={requiredLabel('Appointment', 'scaler-create__required')}
            invalid={showError('appointment')}
            invalidText={visibleFieldErrors.appointment}
          >
            <SelectItem value="" text="" />
            {appointmentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} text={option.text} />
            ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="province-wide"
            value={values.provinceWide}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              onChange('provinceWide', e.target.value as ScalerFormValues['provinceWide'])
            }
            labelText={requiredLabel('Province Wide?', 'scaler-create__required')}
            invalid={showError('provinceWide')}
            invalidText={visibleFieldErrors.provinceWide}
          >
            <SelectItem value="" text="" />
            <SelectItem value="Yes" text="Yes" />
            <SelectItem value="No" text="No" />
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="appointment-effective-date"
            value={values.appointmentEffectiveDate}
            onChange={(v: string) => onChange('appointmentEffectiveDate', v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="Appointment Effective Date"
            labelText={requiredLabel('Effective Date', 'scaler-create__required')}
            hideLabel={false}
            invalid={showError('appointmentEffectiveDate')}
            invalidText={visibleFieldErrors.appointmentEffectiveDate}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="appointment-expiry-date"
            value={values.appointmentExpiryDate}
            onChange={(v: string) => onChange('appointmentExpiryDate', v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="Appointment Expiry Date"
            labelText="Expiry Date"
            hideLabel={false}
            invalid={showError('appointmentExpiryDate')}
            invalidText={visibleFieldErrors.appointmentExpiryDate}
          />
        </Column>
      </Grid>

      <div className="scs__form__divider" />

      <h4 className="scs__form__section-title">or</h4>
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4}>
          <Select
            id="exam-upgrade"
            value={values.examUpgrade}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange('examUpgrade', e.target.value)}
            labelText={requiredLabel('Exam / Upgrade', 'scaler-create__required')}
            invalid={showError('examUpgrade')}
            invalidText={visibleFieldErrors.examUpgrade}
          >
            <SelectItem value="" text="" />
            {trainingOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} text={option.text} />
            ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="completed-by"
            value={values.completedBy}
            onChange={(v: string) => onChange('completedBy', v)}
            placeholder="YYYY-MM-DD"
            ariaLabel="Completed By"
            labelText={requiredLabel('Completed By', 'scaler-create__required')}
            hideLabel={false}
            invalid={showError('completedBy')}
            invalidText={visibleFieldErrors.completedBy}
          />
        </Column>
      </Grid>

      <div className="scs__form__divider scs__form__divider--actions" />

      <div className="scaler-search__actions form-actions">
        {isResetting ? (
          <InlineLoading className="scaler-form__reset-loading" description="Resetting…" status="active" />
        ) : (
          <Button kind="secondary" onClick={onReset} renderIcon={ResetIcon} disabled={isSubmitting}>
            Reset
          </Button>
        )}
        <Button kind="primary" onClick={onSave} renderIcon={SaveIcon} disabled={isSubmitting || isResetting}>
          {isSubmitting ? 'Saving...' : 'Save Record'}
        </Button>
        {edit ? (
          // Legacy updateScaler.jsp:237-246 Delete Record (confirm handled by the parent modal).
          // Gated separately from Save: §C's "Summary – Edit" is RU for the scaling managers and RUD
          // only for the administrator, so a role that edits a scaler cannot necessarily delete one.
          <PermissionGate permission={PERMISSIONS.SCALER_DELETE}>
            <Button
              kind="danger"
              renderIcon={DeleteIcon}
              onClick={onDelete}
              disabled={isSubmitting || isResetting}
            >
              Delete Record
            </Button>
          </PermissionGate>
        ) : null}
      </div>
    </Form>
  );
};

export default ScalerForm;
