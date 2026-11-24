import { Search } from '@carbon/icons-react';
import { Column, Form, Grid, Select, SelectItem, TextArea, TextInput } from '@carbon/react';
import type { ChangeEvent, FC } from 'react';

import Button from '@/components/core/Button';
import DateInput from '@/components/core/DateInput';
import { requiredLabel } from '@/utils/requiredLabel';

import type {
  ContactFormErrors,
  ContactFormValues,
} from './contactFormUtils';

import './ScaleSiteContactForm.scss';

interface Props {
  values: ContactFormValues;
  onChange: <K extends keyof ContactFormValues>(field: K, value: ContactFormValues[K]) => void;
  errors: ContactFormErrors;
  isSubmitting: boolean;
  // Edit flows pre-fill an existing contact, so the Client Contact ID is fixed
  // (read-only, no search). Create flows pass onOpenSearch to look one up.
  readOnlyClientId?: boolean;
  onOpenSearch?: () => void;
}

const ScaleSiteContactForm: FC<Props> = ({
  values,
  onChange,
  errors,
  isSubmitting,
  readOnlyClientId = false,
  onOpenSearch,
}) => {
  return (
    <Form>
      <Grid className="scs__modal-grid">
        <Column lg={8} md={4} sm={4}>
          {readOnlyClientId ? (
            <TextInput
              id="contact-client-contact-id"
              labelText="Client Contact ID"
              value={values.clientContactId}
              disabled
              readOnly
            />
          ) : (
            <div className="scs__contact-lookup__search-row">
              <TextInput
                id="contact-client-contact-id"
                labelText={requiredLabel('Client Contact ID', 'scs__required')}
                value={values.clientContactId}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  onChange('clientContactId', event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onOpenSearch?.();
                  }
                }}
                invalid={Boolean(errors.clientContactId)}
                invalidText={errors.clientContactId}
                disabled={isSubmitting}
                placeholder="Enter ID or use Search"
              />
              <Button
                kind="secondary"
                type="button"
                className="scs__input-search-button"
                disabled={isSubmitting}
                onClick={onOpenSearch}
                renderIcon={Search}
              >
                Search
              </Button>
            </div>
          )}
        </Column>
        <Column lg={8} md={4} sm={4}>
          <Select
            id="contact-site-info-access-ind"
            labelText={requiredLabel('Access to Site Information?', 'scs__required')}
            value={values.siteInformationAccessInd}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onChange(
                'siteInformationAccessInd',
                event.target.value as ContactFormValues['siteInformationAccessInd'],
              )
            }
            invalid={Boolean(errors.siteInformationAccessInd)}
            invalidText={errors.siteInformationAccessInd}
            disabled={isSubmitting}
          >
            <SelectItem value="" text="" />
            <SelectItem value="Y" text="Yes" />
            <SelectItem value="N" text="No" />
          </Select>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <DateInput
            id="contact-effective-date"
            value={values.effectiveDate}
            onChange={(value: string) => onChange('effectiveDate', value)}
            placeholder="YYYY-MM-DD"
            ariaLabel="Effective Date"
            labelText={requiredLabel('Effective Date', 'scs__required')}
            hideLabel={false}
            invalid={Boolean(errors.effectiveDate)}
            invalidText={errors.effectiveDate}
            disabled={isSubmitting}
          />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <DateInput
            id="contact-expiry-date"
            value={values.expiryDate}
            onChange={(value: string) => onChange('expiryDate', value)}
            placeholder="YYYY-MM-DD"
            ariaLabel="Expiry Date"
            labelText="Expiry Date"
            hideLabel={false}
            invalid={Boolean(errors.expiryDate)}
            invalidText={errors.expiryDate}
            disabled={isSubmitting}
          />
        </Column>

        <Column lg={16} md={8} sm={4}>
          <TextArea
            id="contact-role-description"
            labelText={requiredLabel('Contact Role', 'scs__required')}
            value={values.contactRoleDescription}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              onChange('contactRoleDescription', event.target.value)
            }
            invalid={Boolean(errors.contactRoleDescription)}
            invalidText={errors.contactRoleDescription}
            disabled={isSubmitting}
            rows={3}
            maxCount={40}
            enableCounter
          />
        </Column>
      </Grid>
    </Form>
  );
};

export default ScaleSiteContactForm;
