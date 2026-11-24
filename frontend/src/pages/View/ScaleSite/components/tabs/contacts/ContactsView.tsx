import { Edit as EditIcon } from '@carbon/icons-react';
import { Table, TableBody, TableCell, TableRow } from '@carbon/react';
import type { FC } from 'react';

import Button from '@/components/core/Button';
import WhoDidIt from '@/components/core/WhoDidIt';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import type { ScaleSiteContact } from '@/services/scaleSiteContacts.types';
import { extractApiError } from '@/utils/extractApiError';

import { asText, ynToDisplay } from '../../../utils';
import { ContactLoadError, ContactLoadingPanel } from './ContactStatePanels';
import { useScaleSiteContactQuery } from './useScaleSiteContactQuery';

interface Props {
  scaleSiteIdNmbr: string;
  contact: ScaleSiteContact;
  onClose: () => void;
  onEdit: (contact: ScaleSiteContact) => void;
}

interface DetailRow {
  label: string;
  value: string;
}

const DetailTable: FC<{ rows: DetailRow[]; ariaLabel: string }> = ({ rows, ariaLabel }) => (
  <Table size="sm" useZebraStyles className="scs__tab-view__table scs__tab-view__table--wide" aria-label={ariaLabel}>
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.label}>
          <TableCell className="scs__tab-view__label">{row.label}:</TableCell>
          <TableCell>{row.value}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// Read-only view of a single scale site contact, mirroring the legacy viewContact.jsp
// (Contact Information + Site Contact). Like ContactsCreate/ContactsEdit it replaces the
// Contacts tab content while the record header and tabs stay visible. The contacts list
// does not return cell phone / effective / expiry dates, so the full record is fetched and
// a fetch failure is treated as blocking (rather than silently showing partial list data).
const ContactsView: FC<Props> = ({ scaleSiteIdNmbr, contact, onClose, onEdit }) => {
  const hasContactId = contact.clientContactId != null;
  const contactQuery = useScaleSiteContactQuery(scaleSiteIdNmbr, contact.clientContactId);

  if (!hasContactId) {
    return <ContactLoadError subtitle="This contact has no client contact id and cannot be viewed." onClose={onClose} />;
  }
  if (contactQuery.error) {
    return <ContactLoadError subtitle={extractApiError(contactQuery.error, 'Could not load contact.')} onClose={onClose} />;
  }
  if (contactQuery.isLoading || !contactQuery.data) {
    return <ContactLoadingPanel lineCount={10} />;
  }

  const data = contactQuery.data;

  const contactInfoRows: DetailRow[] = [
    { label: 'Contact Name', value: asText(data.contactName) },
    { label: 'Bus. Phone #', value: asText(data.businessPhone) },
    { label: 'Cell Phone #', value: asText(data.cellPhone) },
    { label: 'Fax #', value: asText(data.faxNumber) },
    { label: 'Email', value: asText(data.emailAddress) },
  ];

  const siteContactRows: DetailRow[] = [
    { label: 'Client Contact Id', value: asText(data.clientContactId) },
    { label: 'Contact Role', value: asText(data.contactRoleDescription) },
    { label: 'Access to Site Information', value: ynToDisplay(data.siteInformationAccessInd) },
    { label: 'Effective Date', value: asText(data.effectiveDate) },
    { label: 'Expiry Date', value: asText(data.expiryDate) },
  ];

  return (
    <div className="scs__tab-view__panel">
      <section className="view-scale-site__section">
        <h4 className="view-scale-site__section-title">Contact Information</h4>
        <DetailTable rows={contactInfoRows} ariaLabel="Contact information" />
      </section>

      <section className="view-scale-site__section">
        <h4 className="view-scale-site__section-title">Site Contact</h4>
        <DetailTable rows={siteContactRows} ariaLabel="Site contact" />
      </section>

      <div className="scs__form__divider scs__form__divider--actions" />
      <div className="form-actions">
        <Button kind="secondary" type="button" onClick={onClose}>Back</Button>
        <PermissionGate permission={PERMISSIONS.SCALE_SITE_CONTACT_UPDATE}>
          <Button kind="primary" type="button" renderIcon={EditIcon} onClick={() => onEdit(data)}>Edit Record</Button>
        </PermissionGate>
        <WhoDidIt audit={data} />
      </div>
    </div>
  );
};

export default ContactsView;
