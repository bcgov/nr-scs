import { Reset as ResetIcon, Save as SaveIcon } from '@carbon/icons-react';
import { InlineNotification } from '@carbon/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FC } from 'react';

import Button from '@/components/core/Button';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import { extractApiError } from '@/utils/extractApiError';
import { scrollToError } from '@/utils/scrollToError';

import ContactSearchModal from './ContactSearchModal';
import ScaleSiteContactForm from './ScaleSiteContactForm';
import {
  buildCreateRequest,
  createEmptyContactFormValues,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
} from './contactFormUtils';

interface Props {
  scaleSiteIdNmbr: string;
  primaryContactInd: 'Y' | 'N';
  ownerClientNumber: string;
  onClose: () => void;
}

const ContactsCreate: FC<Props> = ({ scaleSiteIdNmbr, primaryContactInd, ownerClientNumber, onClose }) => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const [formValues, setFormValues] = useState<ContactFormValues>(() => ({
    ...createEmptyContactFormValues(),
    primaryContactInd,
  }));
  const [formErrors, setFormErrors] = useState<ContactFormErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await userToken();
      return API.scaleSiteContacts.createScaleSiteContact(scaleSiteIdNmbr, buildCreateRequest(formValues), token);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scale-site-contacts', scaleSiteIdNmbr] });
      onClose();
    },
    onError: (error: unknown) => setBannerMessage(extractApiError(error, 'Could not create contact.')),
  });

  const isSubmitting = createMutation.isPending;

  const handleFieldChange = <K extends keyof ContactFormValues>(field: K, value: ContactFormValues[K]) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    setBannerMessage(null);
  };

  const handleReset = () => {
    setFormValues({ ...createEmptyContactFormValues(), primaryContactInd });
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
    createMutation.mutate();
  };

  return (
    <div className="scs__tab-view__panel">
      <section className="view-scale-site__section">
        <h4 className="view-scale-site__section-title">Scale Site Contact - Create</h4>
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
          onOpenSearch={() => setSearchOpen(true)}
        />
        <div className="scs__form__divider scs__form__divider--actions" />
        <div className="form-actions">
          <Button kind="secondary" type="button" onClick={onClose} disabled={isSubmitting}>Back</Button>
          <Button kind="secondary" type="button" renderIcon={ResetIcon} onClick={handleReset} disabled={isSubmitting}>Reset</Button>
          <Button kind="primary" type="button" renderIcon={SaveIcon} onClick={handleSave} disabled={isSubmitting}>Save Record</Button>
        </div>
      </section>

      <ContactSearchModal
        open={searchOpen}
        defaultClientNumber={ownerClientNumber}
        onClose={() => setSearchOpen(false)}
        onSelect={(clientContactId) => handleFieldChange('clientContactId', String(clientContactId))}
      />
    </div>
  );
};

export default ContactsCreate;
