import { Column, Form, Grid, Select, SelectItem, TextArea, TextInput } from '@carbon/react';
import type React from 'react';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import DateInput from '@/components/core/DateInput';
import type { FormErrors } from '@/hooks/useMaintenanceCrud';
import type { ScaleAuthConditionDetail } from '@/services/conditions.service';
import type { ScaleMethodTypeLov, StaticLov } from '@/services/lov.service';
import { requiredLabel } from '@/utils/requiredLabel';

export type ConditionFormState = {
  scaleConditionClassCode: string;
  scaleAuthConditionTitle: string;
  scaleAuthConditionDesc: string;
  ministryStandardInd: string;
  sortOrderNo: string;
  effectiveDate: string;
  expiryDate: string;
  siteMethodTypeCodes: string[];
};

const yesNoOptions = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
];

const mandatoryLabel = (value?: string | null) => (value === 'Y' ? 'Yes' : value === 'N' ? 'No' : '');
// Site Type applies only to Scale Site Authorization (SIA); MSD and SCA never carry one.
const isSia = (classCode?: string | null) => String(classCode ?? '').trim().toUpperCase() === 'SIA';

type ViewProps = { selected: ScaleAuthConditionDetail | null; conditionTypes: StaticLov[] };

/** Read-only field layout shown in the view modal (reads the fetched detail record). */
export const ConditionsViewFields = ({ selected, conditionTypes }: ViewProps) => {
  if (!selected) {
    return null;
  }
  const showSiteType = isSia(selected.scaleConditionClassCode);
  return (
    <Form className="scs__form">
      <Grid className="conditions__grid scs__grid--tight">
        <Column lg={8} md={8} sm={4} className="scs__disabled-plain">
          <TextInput
            id="view-condition-id"
            labelText="Condition #"
            value={String(selected.scaleAuthConditionId ?? '')}
            className="scs__disabled-plain-input"
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-condition-type"
            labelText="Type"
            value={
              conditionTypes.find((l) => l.code === selected.scaleConditionClassCode)?.description ??
              selected.scaleConditionClassCode ??
              ''
            }
            readOnly
            disabled
          />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-condition-title" labelText="Title" value={selected.scaleAuthConditionTitle ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-condition-mandatory" labelText="Mandatory?" value={mandatoryLabel(selected.ministryStandardInd)} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-condition-effective" labelText="Effective Date" value={selected.effectiveDate ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput id="view-condition-expiry" labelText="Expiry Date" value={selected.expiryDate ?? ''} readOnly disabled />
        </Column>
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="view-condition-sort"
            labelText="Sort Order"
            value={selected.sortOrderNo != null ? String(selected.sortOrderNo) : ''}
            readOnly
            disabled
          />
        </Column>
        {showSiteType ? (
          <Column lg={8} md={8} sm={4} className="conditions__site-type">
            <TextInput
              id="view-condition-site-types"
              labelText="Site Type"
              value={(selected.siteMethodTypeCodes ?? []).join(', ')}
              readOnly
              disabled
            />
          </Column>
        ) : null}
        <Column lg={16} md={8} sm={4}>
          <TextArea id="view-condition-text" labelText="Condition Text" value={selected.scaleAuthConditionDesc ?? ''} readOnly rows={4} />
        </Column>
      </Grid>
    </Form>
  );
};

type FormFieldsProps = {
  selected: ScaleAuthConditionDetail | null;
  conditionTypes: StaticLov[];
  methodTypes: ScaleMethodTypeLov[];
  formState: ConditionFormState;
  formErrors: FormErrors;
  onFieldChange: (patch: Partial<ConditionFormState>) => void;
  isSubmitting: boolean;
  isEdit: boolean;
};

/** Editable field layout for create/edit. Rendered inside the shared modal's Form. */
export const ConditionsFormFields = ({
  selected,
  conditionTypes,
  methodTypes,
  formState,
  formErrors,
  onFieldChange,
  isSubmitting,
  isEdit,
}: FormFieldsProps) => {
  const siteTypeApplies = isSia(formState.scaleConditionClassCode);
  const siteTypeDisabled = isSubmitting;
  return (
    <>
      <h4>Details</h4>
      <Grid className="conditions__grid scs__grid--tight">
        <Column lg={8} md={8} sm={4} className={isEdit ? 'scs__disabled-plain' : undefined}>
          <TextInput id="condition-id" labelText="Condition #" value={selected?.scaleAuthConditionId ?? ''} disabled />
        </Column>

        <Column lg={8} md={8} sm={4} className={isEdit ? 'scs__disabled-plain' : undefined}>
          <Select
            id="condition-type"
            labelText={requiredLabel('Type', 'scs__required')}
            value={formState.scaleConditionClassCode}
            onChange={(event) => {
              const nextValue = event.target.value;
              const normalizedCode =
                conditionTypes.find((item) => item.code === nextValue || item.description === nextValue)?.code ?? nextValue;
              onFieldChange({ scaleConditionClassCode: normalizedCode });
            }}
            invalid={Boolean(formErrors.scaleConditionClassCode)}
            invalidText={formErrors.scaleConditionClassCode}
            disabled={isSubmitting || Boolean(selected?.scaleAuthConditionId)}
          >
            <SelectItem value="" text="" />
            {conditionTypes.map((item) => (
              <SelectItem key={item.code ?? item.description} value={item.code ?? ''} text={item.description ?? ''} />
            ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="condition-title"
            labelText={requiredLabel('Title', 'scs__required')}
            value={formState.scaleAuthConditionTitle}
            onChange={(event) => onFieldChange({ scaleAuthConditionTitle: event.target.value })}
            invalid={Boolean(formErrors.scaleAuthConditionTitle)}
            invalidText={formErrors.scaleAuthConditionTitle}
            disabled={isSubmitting}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="condition-mandatory"
            labelText={requiredLabel('Mandatory?', 'scs__required')}
            value={formState.ministryStandardInd}
            onChange={(event) => onFieldChange({ ministryStandardInd: event.target.value })}
            invalid={Boolean(formErrors.ministryStandardInd)}
            invalidText={formErrors.ministryStandardInd}
            disabled={isSubmitting}
          >
            <SelectItem value="" text="" />
            {yesNoOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} text={option.label} />
            ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DateInput
            id="condition-effective-date"
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
            id="condition-expiry-date"
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
          <TextInput
            id="condition-sort-order"
            labelText={requiredLabel('Sort Order', 'scs__required')}
            value={formState.sortOrderNo}
            onChange={(event) => onFieldChange({ sortOrderNo: event.target.value })}
            invalid={Boolean(formErrors.sortOrderNo)}
            invalidText={formErrors.sortOrderNo}
            disabled={isSubmitting}
          />
        </Column>

        {siteTypeApplies ? (
          <Column
            lg={8}
            md={8}
            sm={4}
            className={`conditions__site-type${siteTypeDisabled ? ' conditions__site-type--disabled' : ''}`}
          >
            <ActiveMultiSelect<ScaleMethodTypeLov>
              id="condition-site-types"
              items={methodTypes}
              itemToString={(item) => (item?.description ? String(item.description) : '')}
              titleText={requiredLabel('Site Type', 'scs__required')}
              selectedItems={methodTypes.filter((method) => formState.siteMethodTypeCodes.includes(method.code ?? ''))}
              onChange={(event) =>
                onFieldChange({
                  siteMethodTypeCodes: (event.selectedItems ?? [])
                    .map((item) => item?.code ?? '')
                    .filter((code) => code.length > 0),
                })
              }
              invalid={Boolean(formErrors.siteMethodTypeCodes)}
              invalidText={formErrors.siteMethodTypeCodes}
              disabled={siteTypeDisabled}
              aria-disabled={siteTypeDisabled}
            />
          </Column>
        ) : null}

        <Column lg={16} md={8} sm={4}>
          <TextArea
            id="condition-text"
            labelText={requiredLabel('Condition Text', 'scs__required')}
            value={formState.scaleAuthConditionDesc}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onFieldChange({ scaleAuthConditionDesc: event.target.value })}
            invalid={Boolean(formErrors.scaleAuthConditionDesc)}
            invalidText={formErrors.scaleAuthConditionDesc}
            disabled={isSubmitting}
            rows={4}
          />
        </Column>
      </Grid>
    </>
  );
};
