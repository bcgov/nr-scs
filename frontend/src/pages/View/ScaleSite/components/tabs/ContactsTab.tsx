import {
  InlineNotification,
  Modal,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FC } from 'react';

import Button from '@/components/core/Button';
import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import { useAuth } from '@/context/auth/useAuth';
import { usePermissions } from '@/context/auth/usePermissions';
import { env } from '@/env';
import API from '@/services/APIs';
import type { ScaleSiteContact, ScaleSiteOwner } from '@/services/scaleSiteContacts.types';
import { extractApiError } from '@/utils/extractApiError';

import { asText, ynToDisplay } from '../../utils';
import ContactsCreate from './contacts/ContactsCreate';
import ContactsEdit from './contacts/ContactsEdit';
import ContactsView from './contacts/ContactsView';

// External Client Application URL is environment-specific, so it lives in the
// gitignored .env.local (VITE_CLIENT_APPLICATION_URL) rather than in source.
const CLIENT_APPLICATION_URL = env.VITE_CLIENT_APPLICATION_URL?.trim() || null;

interface Props {
  isActive: boolean;
  scaleSiteIdNmbr: string;
}

const CONTACT_COLUMNS = ['Contact Name', 'Contact Role', 'Phone #', 'Fax #', 'Email Address', 'Access to Site Info?'];

const ContactsTab: FC<Props> = ({ isActive, scaleSiteIdNmbr }) => {
  const { userToken } = useAuth();
  const { canAny } = usePermissions();
  const showRowActions = canAny([
    PERMISSIONS.SCALE_SITE_CONTACT_UPDATE,
    PERMISSIONS.SCALE_SITE_CONTACT_DELETE,
  ]);
  const queryClient = useQueryClient();
  // null = read-only list view; 'Y' / 'N' = inline create form with that primary default
  const [createPrimaryInd, setCreatePrimaryInd] = useState<'Y' | 'N' | null>(null);
  // null = read-only list view; a contact = inline edit form for that contact
  const [editingContact, setEditingContact] = useState<ScaleSiteContact | null>(null);
  // null = read-only list view; a contact = inline read-only view for that contact
  const [viewingContact, setViewingContact] = useState<ScaleSiteContact | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ScaleSiteContact | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const ownerQuery = useQuery<ScaleSiteOwner>({
    queryKey: ['scale-site-owner', scaleSiteIdNmbr],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleSiteContacts.getScaleSiteOwner(scaleSiteIdNmbr, token);
    },
    enabled: isActive && Boolean(scaleSiteIdNmbr),
    staleTime: 5 * 60 * 1000,
  });

  const contactsQuery = useQuery({
    queryKey: ['scale-site-contacts', scaleSiteIdNmbr],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleSiteContacts.getScaleSiteContacts(scaleSiteIdNmbr, token);
    },
    enabled: isActive && Boolean(scaleSiteIdNmbr),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (deleteCandidate?.clientContactId == null) {
        throw new Error('No contact selected for delete.');
      }
      const token = await userToken();
      await API.scaleSiteContacts.deleteScaleSiteContact(scaleSiteIdNmbr, deleteCandidate.clientContactId, token);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scale-site-contacts', scaleSiteIdNmbr] });
      if (deleteCandidate?.clientContactId != null) {
        queryClient.removeQueries({
          queryKey: ['scale-site-contact', scaleSiteIdNmbr, deleteCandidate.clientContactId],
        });
      }
      setDeleteCandidate(null);
      setBannerError(null);
    },
    onError: (error: unknown) => {
      setBannerError(extractApiError(error, 'Could not delete contact.'));
      setDeleteCandidate(null);
    },
  });

  const allContacts: ScaleSiteContact[] = contactsQuery.data ?? [];
  const primaryContacts = allContacts.filter((c) => c.primaryContactInd === 'Y');
  const additionalContacts = allContacts.filter((c) => c.primaryContactInd !== 'Y');
  const hasPrimary = primaryContacts.length > 0;
  const owner = ownerQuery.data;
  const contactsLoading = contactsQuery.isLoading && !contactsQuery.data;
  const loadError = contactsQuery.error?.message ?? null;

  // The create form replaces the Contacts tab content while the record header and
  // tabs stay visible (mirrors the original Scale Site Record page flow).
  if (createPrimaryInd) {
    return (
      <ContactsCreate
        scaleSiteIdNmbr={scaleSiteIdNmbr}
        primaryContactInd={createPrimaryInd}
        ownerClientNumber={owner?.clientNumber ?? ''}
        onClose={() => setCreatePrimaryInd(null)}
      />
    );
  }

  // The edit form likewise replaces the tab content with the selected contact pre-filled.
  if (editingContact) {
    return (
      <ContactsEdit
        scaleSiteIdNmbr={scaleSiteIdNmbr}
        contact={editingContact}
        onClose={() => setEditingContact(null)}
      />
    );
  }

  // Clicking a contact name opens the read-only view, also replacing the tab content.
  if (viewingContact) {
    return (
      <ContactsView
        scaleSiteIdNmbr={scaleSiteIdNmbr}
        contact={viewingContact}
        onClose={() => setViewingContact(null)}
        onEdit={(contact) => {
          setViewingContact(null);
          setEditingContact(contact);
        }}
      />
    );
  }

  return (
    <div className="scs__tab-view__panel">

      {/* ── Site Owner ──────────────────────────────────────────── */}
      <section className="view-scale-site__section">
        <h4 className="view-scale-site__section-title">Site Owner</h4>
        {ownerQuery.isLoading ? <SkeletonText paragraph lineCount={2} /> : (
          <Table size="sm" useZebraStyles className="scs__tab-view__table scs__tab-view__table--wide" aria-label="Site owner">
            <TableBody>
              <TableRow>
                <TableCell className="scs__tab-view__label">Client #:</TableCell>
                <TableCell>{asText(owner?.clientNumber)}</TableCell>
                <TableCell className="scs__tab-view__label">Client Location Code:</TableCell>
                <TableCell>{asText(owner?.clientLocnCode)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </section>

      {/* ── Site Owner Information ──────────────────────────────── */}
      <section className="view-scale-site__section">
        <h4 className="view-scale-site__section-title">Site Owner Information</h4>
        {ownerQuery.isLoading ? <SkeletonText paragraph lineCount={8} /> : (
          <Table size="sm" useZebraStyles className="scs__tab-view__table scs__tab-view__table--wide" aria-label="Site owner information">
            <TableBody>
              <TableRow>
                <TableCell className="scs__tab-view__label">Company Name:</TableCell>
                <TableCell>{asText(owner?.companyName)}</TableCell>
                <TableCell className="scs__tab-view__label">Address Line 1:</TableCell>
                <TableCell>{asText(owner?.address1)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="scs__tab-view__label">Last Name:</TableCell>
                <TableCell>{asText(owner?.lastName)}</TableCell>
                <TableCell className="scs__tab-view__label">Address Line 2:</TableCell>
                <TableCell>{asText(owner?.address2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="scs__tab-view__label">First Name:</TableCell>
                <TableCell>{asText(owner?.firstName)}</TableCell>
                <TableCell className="scs__tab-view__label">Address Line 3:</TableCell>
                <TableCell>{asText(owner?.address3)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell />
                <TableCell />
                <TableCell className="scs__tab-view__label">City:</TableCell>
                <TableCell>{asText(owner?.city)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="scs__tab-view__label">Bus. Phone #:</TableCell>
                <TableCell>{asText(owner?.businessPhone)}</TableCell>
                <TableCell className="scs__tab-view__label">Province:</TableCell>
                <TableCell>{asText(owner?.province)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="scs__tab-view__label">Res. Phone #:</TableCell>
                <TableCell>{asText(owner?.residentPhone)}</TableCell>
                <TableCell className="scs__tab-view__label">Country:</TableCell>
                <TableCell>{asText(owner?.country)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="scs__tab-view__label">Cell Phone #:</TableCell>
                <TableCell>{asText(owner?.cellPhone)}</TableCell>
                <TableCell className="scs__tab-view__label">Postal Code:</TableCell>
                <TableCell>{asText(owner?.postalCode)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="scs__tab-view__label">Fax #:</TableCell>
                <TableCell>{asText(owner?.fax)}</TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell className="scs__tab-view__label">Email:</TableCell>
                <TableCell>{asText(owner?.email)}</TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </section>

      {/* ── Error / loading banners ─────────────────────────────── */}
      {loadError ? (
        <InlineNotification kind="error" lowContrast title="Contacts unavailable." subtitle={loadError} className="scs__notification" />
      ) : null}
      {bannerError ? (
        <InlineNotification kind="error" lowContrast title="Contact action failed." subtitle={bannerError} className="scs__notification" />
      ) : null}

      {/* ── Primary Site Contact ────────────────────────────────── */}
      <section className="view-scale-site__section">
        <div className="view-scale-site__section-header">
          <h4 className="view-scale-site__section-title">Primary Site Contact</h4>
          <a
            href={CLIENT_APPLICATION_URL ?? undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!CLIENT_APPLICATION_URL}
            onClick={CLIENT_APPLICATION_URL ? undefined : (e) => e.preventDefault()}
          >
            <Button kind="tertiary" size="sm" type="button" disabled={!CLIENT_APPLICATION_URL}>
              Client Application
            </Button>
          </a>
        </div>
        {contactsLoading ? <SkeletonText paragraph lineCount={3} /> : (
          <>
            {primaryContacts.length === 0 ? (
              <p>No primary contact for this scale site.</p>
            ) : (
              <ContactTable contacts={primaryContacts} showActions={showRowActions} onView={setViewingContact} onEdit={setEditingContact} onDelete={setDeleteCandidate} />
            )}
            <PermissionGate permission={PERMISSIONS.SCALE_SITE_CONTACT_CREATE}>
              <div className="scs__view-tab-actions">
                <Button
                  kind="primary" size="sm" type="button"
                  onClick={() => setCreatePrimaryInd('Y')}
                  disabled={hasPrimary}
                >
                  Add Primary Contact
                </Button>
              </div>
            </PermissionGate>
          </>
        )}
      </section>

      {/* ── Additional Site Contacts ────────────────────────────── */}
      <section className="view-scale-site__section">
        <h4 className="view-scale-site__section-title">Additional Site Contacts</h4>
        {contactsLoading ? <SkeletonText paragraph lineCount={3} /> : (
          <>
            {additionalContacts.length === 0 ? (
              <p>No additional contacts for this scale site.</p>
            ) : (
              <ContactTable contacts={additionalContacts} showActions={showRowActions} onView={setViewingContact} onEdit={setEditingContact} onDelete={setDeleteCandidate} />
            )}
            <PermissionGate permission={PERMISSIONS.SCALE_SITE_CONTACT_CREATE}>
              <div className="scs__view-tab-actions">
                <Button
                  kind="primary" size="sm" type="button"
                  onClick={() => setCreatePrimaryInd('N')}
                >
                  Add Site Contact
                </Button>
              </div>
            </PermissionGate>
          </>
        )}
      </section>

      {/* ── Delete Confirm Modal ────────────────────────────────── */}
      <Modal
        open={Boolean(deleteCandidate)}
        onRequestClose={() => setDeleteCandidate(null)}
        onSecondarySubmit={() => setDeleteCandidate(null)}
        onRequestSubmit={() => deleteMutation.mutate()}
        modalHeading="Are you sure you want to remove this contact?"
        primaryButtonText="Confirm Delete"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={deleteMutation.isPending}
        danger
      />
    </div>
  );
};

interface ContactTableProps {
  contacts: ScaleSiteContact[];
  /** False for a read-only role — the Actions column is omitted rather than rendered empty. */
  showActions: boolean;
  onView: (contact: ScaleSiteContact) => void;
  onEdit: (contact: ScaleSiteContact) => void;
  onDelete: (contact: ScaleSiteContact) => void;
}

const ContactTable: FC<ContactTableProps> = ({ contacts, showActions, onView, onEdit, onDelete }) => (
  <Table size="sm" useZebraStyles aria-label="Scale site contacts" className="view-scale-site__contacts-table">
    <TableHead>
      <TableRow>
        {[...CONTACT_COLUMNS, ...(showActions ? ['Actions'] : [])].map((h) => <TableHeader key={h}>{h}</TableHeader>)}
      </TableRow>
    </TableHead>
    <TableBody>
      {contacts.map((contact) => {
        const rowKey = contact.clientContactId ?? `${contact.contactName}-${contact.effectiveDate}`;
        return (
          <TableRow key={String(rowKey)}>
            <TableCell>
              {contact.clientContactId != null ? (
                <button type="button" className="view-scale-site__table-link" onClick={() => onView(contact)}>
                  {asText(contact.contactName)}
                </button>
              ) : (
                asText(contact.contactName)
              )}
            </TableCell>
            <TableCell>{asText(contact.contactRoleDescription)}</TableCell>
            <TableCell>{asText(contact.businessPhone)}</TableCell>
            <TableCell>{asText(contact.faxNumber)}</TableCell>
            <TableCell>{asText(contact.emailAddress)}</TableCell>
            <TableCell>{ynToDisplay(contact.siteInformationAccessInd)}</TableCell>
            {showActions ? (
              <TableCell>
                <div className="view-scale-site__table-actions">
                  <PermissionGate permission={PERMISSIONS.SCALE_SITE_CONTACT_UPDATE}>
                    <Button kind="ghost" size="sm" type="button" noIcon onClick={() => onEdit(contact)}>Edit</Button>
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.SCALE_SITE_CONTACT_DELETE}>
                    <Button kind="danger--ghost" size="sm" type="button" noIcon onClick={() => onDelete(contact)}>Delete</Button>
                  </PermissionGate>
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);

export default ContactsTab;
