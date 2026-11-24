import { Column, Grid, Select, SelectItem, TextArea, TextInput } from '@carbon/react';
import type { ChangeEvent, FC } from 'react';
import PermissionLink from '@/components/core/PermissionLink';
import { PERMISSIONS } from '@/context/auth/permissions';

import DateInput from '@/components/core/DateInput';
import { asText } from '@/pages/View/Scaler/utils';
import { requiredLabel } from '@/utils/requiredLabel';

import { checkScaleViewPath } from './performanceRemarkDisplay';
import type {
  IssueTypeOption,
  PerformanceRemarkFormErrors,
  PerformanceRemarkFormValues,
  PerformanceRemarkIssueType,
} from './performanceRemarkFormUtils';

type ChangeHandler = <K extends keyof PerformanceRemarkFormValues>(
  field: K,
  value: PerformanceRemarkFormValues[K],
) => void;

interface CommonProps {
  values: PerformanceRemarkFormValues;
  // Read-only "Issue #" — populated on edit/view, blank on create (the id is DB-generated).
  issueNumber?: string;
}

/**
 * Read-only variant: renders the same field grid as a disabled, non-editable view — the detail
 * screen reached from the summary tab. "Issue Type" collapses to a single field showing the
 * resolved description (`issueTypeDisplay`) so the detail matches the value in the summary table,
 * and the check-scale number becomes a link. The editable-only props are forbidden here so a
 * caller can't accidentally pass a no-op handler.
 */
interface ReadOnlyProps extends CommonProps {
  readOnly: true;
  /** Resolved Issue Type text (from `issueTypeLabel`); falls back to the raw code when omitted. */
  issueTypeDisplay?: string;
  actionOptions?: never;
  outcomeOptions?: never;
  errors?: never;
  isSubmitting?: never;
  onChange?: never;
}

/** Editable variant (create / edit): the change handler and option lists are required. */
interface EditableProps extends CommonProps {
  readOnly?: false;
  issueTypeDisplay?: never;
  actionOptions: IssueTypeOption[];
  outcomeOptions: IssueTypeOption[];
  errors: PerformanceRemarkFormErrors;
  isSubmitting?: boolean;
  onChange: ChangeHandler;
}

type Props = ReadOnlyProps | EditableProps;

const PerformanceRemarksForm: FC<Props> = ({
  values,
  issueNumber = '',
  readOnly = false,
  issueTypeDisplay,
  actionOptions = [],
  outcomeOptions = [],
  errors = {},
  isSubmitting = false,
  onChange,
}) => {
  // Required markers only make sense on the editable form; the read-only view uses plain labels.
  const label = (text: string) =>
    readOnly ? text : requiredLabel(text, 'view-scaler__required');

  // The single "Issue Type" shown read-only: the resolved description (so it matches the summary
  // table), falling back to the raw Action/Outcome code if a description wasn't supplied.
  const issueTypeCode =
    values.issueType === 'OUTCOME'
      ? values.scalerPerformanceOutcmCode
      : values.scalerPerformanceActnCode;
  const issueTypeText = issueTypeDisplay ?? issueTypeCode;

  // Read-only fields all render as the same disabled-looking Carbon text input so the detail view
  // lines up with the editable grid; `asText` shows an em dash for empty values.
  const readOnlyText = (id: string, labelText: string, value: string) => (
    <TextInput id={id} labelText={labelText} value={asText(value)} readOnly />
  );

  return (
    <Grid className="scs__modal-grid">
      <Column lg={8} md={4} sm={4}>
        <TextInput
          id="performance-remark-issue-number"
          labelText="Issue #"
          value={issueNumber}
          disabled={!readOnly}
          readOnly
        />
      </Column>

      <Column lg={8} md={4} sm={4}>
        {readOnly ? (
          readOnlyText(
            'performance-remark-logged-timestamp',
            'Date of Incident',
            values.loggedTimestamp,
          )
        ) : (
          <DateInput
            id="performance-remark-logged-timestamp"
            value={values.loggedTimestamp}
            onChange={(value) => onChange?.('loggedTimestamp', value)}
            labelText={label('Date of Incident')}
            hideLabel={false}
            invalid={Boolean(errors.loggedTimestamp)}
            invalidText={errors.loggedTimestamp}
            disabled={isSubmitting}
          />
        )}
      </Column>

      {readOnly ? (
        <Column lg={8} md={4} sm={4}>
          {readOnlyText('performance-remark-issue-type', 'Issue Type', issueTypeText)}
        </Column>
      ) : (
        <>
          <Column lg={8} md={4} sm={4}>
            <Select
              id="performance-remark-issue-type"
              value={values.issueType}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onChange?.('issueType', event.target.value as PerformanceRemarkIssueType)
              }
              labelText={label('Issue Type')}
              disabled={isSubmitting}
            >
              <SelectItem value="ACTION" text="Action" />
              <SelectItem value="OUTCOME" text="Outcome" />
            </Select>
          </Column>

          <Column lg={8} md={4} sm={4}>
            {values.issueType === 'ACTION' ? (
              <Select
                id="performance-remark-action-code"
                value={values.scalerPerformanceActnCode}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onChange?.('scalerPerformanceActnCode', event.target.value)
                }
                labelText={label('Action')}
                invalid={Boolean(errors.scalerPerformanceActnCode)}
                invalidText={errors.scalerPerformanceActnCode}
                disabled={isSubmitting}
              >
                <SelectItem value="" text="" />
                {actionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} text={option.text} />
                ))}
              </Select>
            ) : (
              <Select
                id="performance-remark-outcome-code"
                value={values.scalerPerformanceOutcmCode}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onChange?.('scalerPerformanceOutcmCode', event.target.value)
                }
                labelText={label('Outcome')}
                invalid={Boolean(errors.scalerPerformanceOutcmCode)}
                invalidText={errors.scalerPerformanceOutcmCode}
                disabled={isSubmitting}
              >
                <SelectItem value="" text="" />
                {outcomeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} text={option.text} />
                ))}
              </Select>
            )}
          </Column>
        </>
      )}

      <Column lg={16} md={8} sm={4}>
        <TextArea
          id="performance-remark-description"
          labelText={label('Description')}
          value={readOnly ? asText(values.performanceRemarkDesc) : values.performanceRemarkDesc}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onChange?.('performanceRemarkDesc', event.target.value)
          }
          invalid={Boolean(errors.performanceRemarkDesc)}
          invalidText={errors.performanceRemarkDesc}
          disabled={isSubmitting}
          readOnly={readOnly}
          rows={4}
          maxLength={4000}
        />
      </Column>

      <Column lg={16} md={8} sm={4}>
        <TextArea
          id="performance-remark-outcome-description"
          labelText="Outcome Description"
          value={readOnly ? asText(values.outcomeDesc) : values.outcomeDesc}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onChange?.('outcomeDesc', event.target.value)
          }
          invalid={Boolean(errors.outcomeDesc)}
          invalidText={errors.outcomeDesc}
          disabled={isSubmitting}
          readOnly={readOnly}
          rows={4}
          maxLength={4000}
        />
      </Column>

      <Column lg={8} md={4} sm={4}>
        {readOnly ? (
          readOnlyText(
            'performance-remark-suspend-start-date',
            'Suspension Start Date',
            values.suspendStartDate,
          )
        ) : (
          <DateInput
            id="performance-remark-suspend-start-date"
            value={values.suspendStartDate}
            onChange={(value) => onChange?.('suspendStartDate', value)}
            labelText="Suspension Start Date"
            hideLabel={false}
            invalid={Boolean(errors.suspendStartDate)}
            invalidText={errors.suspendStartDate}
            disabled={isSubmitting}
          />
        )}
      </Column>

      <Column lg={8} md={4} sm={4}>
        {readOnly ? (
          readOnlyText(
            'performance-remark-suspend-end-date',
            'Suspension End Date',
            values.suspendEndDate,
          )
        ) : (
          <DateInput
            id="performance-remark-suspend-end-date"
            value={values.suspendEndDate}
            onChange={(value) => onChange?.('suspendEndDate', value)}
            labelText="Suspension End Date"
            hideLabel={false}
            invalid={Boolean(errors.suspendEndDate)}
            invalidText={errors.suspendEndDate}
            disabled={isSubmitting}
          />
        )}
      </Column>

      <Column lg={8} md={4} sm={4}>
        {readOnly && values.checkScaleId.trim() ? (
          <div className="cds--form-item">
            <label className="cds--label" htmlFor="performance-remark-check-scale-id">
              Associated Check Scale #
            </label>
            <div className="scs__tab-view__readonly-value">
              <PermissionLink
                permission={PERMISSIONS.CHECK_SCALE_QUERY}
                id="performance-remark-check-scale-id"
                className="scs__tab-view__table-link"
                to={checkScaleViewPath(Number(values.checkScaleId))}
              >
                {asText(values.checkScaleId)}
              </PermissionLink>
            </div>
          </div>
        ) : (
          <TextInput
            id="performance-remark-check-scale-id"
            labelText="Associated Check Scale #"
            value={readOnly ? asText(values.checkScaleId) : values.checkScaleId}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange?.('checkScaleId', event.target.value)
            }
            invalid={Boolean(errors.checkScaleId)}
            invalidText={errors.checkScaleId}
            disabled={isSubmitting}
            readOnly={readOnly}
            maxLength={15}
          />
        )}
      </Column>
    </Grid>
  );
};

export default PerformanceRemarksForm;
