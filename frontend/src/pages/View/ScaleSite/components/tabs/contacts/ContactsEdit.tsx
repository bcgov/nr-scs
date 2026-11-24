import { Reset as ResetIcon, Save as SaveIcon } from '@carbon/icons-react';
import { InlineNotification } from '@carbon/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FC } from 'react';

import Button from '@/components/core/Button';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { ScaleSiteContact } from '@/services/scaleSiteContacts.types';
import { extractApiError } from '@/utils/extractApiError';
import { scrollToError } from '@/utils/scrollToError';

import { ContactLoadError, ContactLoadingPanel } from './ContactStatePanels';
import ScaleSiteContactForm from './ScaleSiteContactForm';
import { useScaleSiteContactQuery } from './useScaleSiteContactQuery';
import {
  buildUpdateRequest,
  toContactFormValues,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
} from './contactFormUtils';

interface Props {
  scaleSiteIdNmbr: string;
  contact: ScaleSiteContact;
  onClose: () => void;
}

// The contacts list view does not return effective/expiry dates, so the edit
// form fetches the full contact record before rendering the pre-filled form.
const ContactsEdit: FC<Props> = ({ scaleSiteIdNmbr, contact, onClose }) => {
  const hasContactId = contact.clientContactId != null;
  const contactQuery = useScaleSiteContactQuery(scaleSiteIdNmbr, contact.clientContactId);

  if (!hasContactId) {
    return <ContactLoadError subtitle="This contact has no client contact id and cannot be edited." onClose={onClose} />;
  }
  if (contactQuery.error) {
    return <ContactLoadError subtitle={extractApiError(contactQuery.error, 'Could not load contact.')} onClose={onClose} />;
  }
  if (contactQuery.isLoading || !contactQuery.data) {
    return <ContactLoadingPanel />;
  }

  return (
    <ContactsEditForm scaleSiteIdNmbr={scaleSiteIdNmbr} contact={contactQuery.data} onClose={onClose} />
  );
};

const ContactsEditForm: FC<Props> = ({ scaleSiteIdNmbr, contact, onClose }) => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const [formValues, setFormValues] = useState<ContactFormValues>(() => toContactFormValues(contact));
  const [formErrors, setFormErrors] = useState<ContactFormErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (contact.clientContactId == null) {
        throw new Error('No contact selected for update.');
      }
      const token = await userToken();
      return API.scaleSiteContacts.updateScaleSiteContact(
        scaleSiteIdNmbr,
        contact.clientContactId,
        buildUpdateRequest(formValues),
        token,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['scale-site-contacts', scaleSiteIdNmbr] }),
        queryClient.invalidateQueries({
          queryKey: ['scale-site-contact', scaleSiteIdNmbr, contact.clientContactId],
        }),
      ]);
      onClose();
    },
    onError: (error: unknown) => setBannerMessage(extractApiError(error, 'Could not update contact.')),
  });

  const isSubmitting = updateMutation.isPending;

  const handleFieldChange = <K extends keyof ContactFormValues>(field: K, value: ContactFormValues[K]) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    setBannerMessage(null);
  };

  const handleReset = () => {
    setFormValues(toContactFormValues(contact));
    setFormErrors({});
    setBannerMessage(null);
  };

  const handleSave = () => {
    const nextErrors = validateContactForm(formValues);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setBannerMessage(null);
      scrollToError();
      return;
    }
    updateMutation.mutate();
  };

  return (
    <div className="scs__tab-view__panel">
      <section className="view-scale-site__section">
        <h4 className="view-scale-site__section-title">Scale Site Contact</h4>
        {bannerMessage ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Could not save contact."
            subtitle={bannerMessage}
            className="scs__notification"
          />
        ) : null}
        <ScaleSiteContactForm
          values={formValues}
          onChange={handleFieldChange}
          errors={formErrors}
          isSubmitting={isSubmitting}
          readOnlyClientId
        />
        <div className="scs__form__divider scs__form__divider--actions" />
        <div className="form-actions">
          <Button kind="secondary" type="button" onClick={onClose} disabled={isSubmitting}>Back</Button>
          <Button kind="secondary" type="button" renderIcon={ResetIcon} onClick={handleReset} disabled={isSubmitting}>Reset</Button>
          <Button kind="primary" type="button" renderIcon={SaveIcon} onClick={handleSave} disabled={isSubmitting}>Save Record</Button>
        </div>
      </section>
    </div>
  );
};

export default ContactsEdit;
