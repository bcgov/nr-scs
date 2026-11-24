import {
  Column,
  Grid,
  Select,
  SelectItem,
  TextArea,
  TextInput,
} from '@carbon/react';
import type { ChangeEvent } from 'react';

import DateInput from '@/components/core/DateInput';
import type { ScaleSiteInspectionRecipientOption } from '@/services/scaleSiteInspections.service';
import { requiredLabel } from '@/utils/requiredLabel';

import { INSPECTION_COMMENTS_MAX_LENGTH } from './limits';

type EditableFieldName =
  | 'previousInspectionId'
  | 'recipient'
  | 'siteOperatorPresentInd'
  | 'inspector'
  | 'inspectionDate'
  | 'comments';

type InspectionDetailsMode = 'create' | 'edit' | 'view';

type InspectionDetailsDisplayValues = {
  scaleSiteIdNmbr?: string | number | null;
  siteName?: string | null;
  siteLocation?: string | null;
  siteOwnerName?: string | null;
  inspectionTypeDescription?: string | null;
  siteTypeDisplay?: string | null;
  previousInspectionId?: string | number | null;
  recipient?: string | null;
  siteOperatorPresentDescription?: string | null;
  inspector?: string | null;
  inspectionDate?: string | null;
  comments?: string | null;
  inspectionId?: string | number | null;
};

type InspectionDetailsFormValues = {
  previousInspectionId?: string;
  recipient: string;
  siteOperatorPresentInd: string;
  inspector: string;
  inspectionDate: string;
  comments: string;
};

type InspectionDetailsErrors = {
  previousInspectionId?: string;
  siteOperatorPresentInd?: string;
  inspector?: string;
  inspectionDate?: string;
  comments?: string;
};

type Props = {
  mode: InspectionDetailsMode;
  displayValues: InspectionDetailsDisplayValues;
  formValues: InspectionDetailsFormValues;
  errors?: InspectionDetailsErrors;
  recipientOptions?: ScaleSiteInspectionRecipientOption[];
  disabled?: boolean;
  requiredIndicatorClassName: string;
  onFieldChange: (field: EditableFieldName, value: string) => void;
};

const textValue = (value: string | number | null | undefined): string => {
  if (value == null) {
    return '';
  }

  return String(value).trim();
};

const ScaleSiteInspectionDetails = ({
  mode,
  displayValues,
  formValues,
  errors,
  recipientOptions = [],
  disabled = false,
  requiredIndicatorClassName,
  onFieldChange,
}: Props) => {
  const isCreate = mode === 'create';
  const isView = mode === 'view';

  return (
    <>
      <h4 className="scs__form__section-title">Inspection Report Details</h4>
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="inspection-scale-site-number"
            labelText="Scale Site #"
            value={textValue(displayValues.scaleSiteIdNmbr)}
            readOnly
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="inspection-scale-site-name"
            labelText="Scale Site Name"
            value={textValue(displayValues.siteName)}
            readOnly
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="inspection-scale-site-location"
            labelText="Scale Site Location"
            value={textValue(displayValues.siteLocation)}
            readOnly
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="inspection-scale-site-owner"
            labelText="Scale Site Owner"
            value={textValue(displayValues.siteOwnerName)}
            readOnly
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="inspection-type-description"
            labelText="Inspection Type"
            value={textValue(displayValues.inspectionTypeDescription)}
            readOnly
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="inspection-site-type-display"
            labelText="Site Type"
            value={textValue(displayValues.siteTypeDisplay)}
            readOnly
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          {isCreate ? (
            <TextInput
              id="previous-inspection-id"
              labelText="Follow-up to Inspection #"
              type="number"
              min={1}
              value={formValues.previousInspectionId ?? ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onFieldChange('previousInspectionId', event.target.value)
              }
              invalid={Boolean(errors?.previousInspectionId)}
              invalidText={errors?.previousInspectionId}
              disabled={disabled}
            />
          ) : (
            <TextInput
              id="previous-inspection-id"
              labelText="Follow-up to Inspection #"
              value={textValue(displayValues.previousInspectionId)}
              readOnly
            />
          )}
        </Column>

        <Column lg={8} md={8} sm={4}>
          {isCreate ? (
            <Select
              id="recipient"
              labelText="Site Operator (if different from owner)"
              value={formValues.recipient}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onFieldChange('recipient', event.target.value)
              }
              disabled={disabled}
            >
              <SelectItem value="" text="Select" />
              {recipientOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  text={option.label}
                />
              ))}
            </Select>
          ) : (
            <TextInput
              id="recipient"
              labelText="Site Operator (if different from owner)"
              value={textValue(displayValues.recipient)}
              readOnly
            />
          )}
        </Column>

        <Column lg={8} md={8} sm={4}>
          {isView ? (
            <TextInput
              id="site-operator-present"
              labelText="Site Operator present during Inspection"
              value={textValue(displayValues.siteOperatorPresentDescription)}
              readOnly
            />
          ) : (
            <Select
              id="site-operator-present"
              labelText={requiredLabel(
                'Site Operator present during Inspection',
                requiredIndicatorClassName,
              )}
              value={formValues.siteOperatorPresentInd}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onFieldChange('siteOperatorPresentInd', event.target.value)
              }
              invalid={Boolean(errors?.siteOperatorPresentInd)}
              invalidText={errors?.siteOperatorPresentInd}
              disabled={disabled}
            >
              <SelectItem value="" text="Select" />
              <SelectItem value="Y" text="Yes" />
              <SelectItem value="N" text="No" />
            </Select>
          )}
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="inspector"
            labelText={isCreate || isView
              ? 'Inspector #'
              : requiredLabel('Inspector #', requiredIndicatorClassName)}
            value={isView ? textValue(displayValues.inspector) : formValues.inspector}
            onChange={isView
              ? undefined
              : (event: ChangeEvent<HTMLInputElement>) =>
                  onFieldChange('inspector', event.target.value)}
            invalid={isView ? false : Boolean(errors?.inspector)}
            invalidText={isView ? undefined : errors?.inspector}
            disabled={isView ? undefined : disabled}
            readOnly={isView}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="inspection-id"
            labelText="Inspection #"
            value={textValue(displayValues.inspectionId)}
            readOnly
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          {isView ? (
            <TextInput
              id="inspection-date"
              labelText="Inspection Date"
              value={textValue(displayValues.inspectionDate)}
              readOnly
            />
          ) : (
            <DateInput
              id="inspection-date"
              value={formValues.inspectionDate}
              onChange={(value) => onFieldChange('inspectionDate', value)}
              labelText={requiredLabel('Inspection Date', requiredIndicatorClassName)}
              hideLabel={false}
              invalid={Boolean(errors?.inspectionDate)}
              invalidText={errors?.inspectionDate}
              disabled={disabled}
            />
          )}
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextArea
            id="inspection-comments"
            labelText="General Comments"
            rows={5}
            value={isView ? textValue(displayValues.comments) : formValues.comments}
            onChange={isView
              ? undefined
              : (event: ChangeEvent<HTMLTextAreaElement>) =>
                  onFieldChange('comments', event.target.value)}
            maxCount={isView ? undefined : INSPECTION_COMMENTS_MAX_LENGTH}
            enableCounter={!isView}
            invalid={!isView && Boolean(errors?.comments)}
            invalidText={errors?.comments}
            disabled={isView ? undefined : disabled}
            readOnly={isView}
          />
        </Column>
      </Grid>
    </>
  );
};

export default ScaleSiteInspectionDetails;

