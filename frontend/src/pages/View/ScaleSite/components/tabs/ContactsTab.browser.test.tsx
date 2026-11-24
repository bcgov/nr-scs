import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';
import type { ScaleSiteContact, ScaleSiteOwner } from '@/services/scaleSiteContacts.types';

import ContactsTab from './ContactsTab';

const mockGetScaleSiteOwner = vi.fn();
const mockGetScaleSiteContacts = vi.fn();
const mockGetScaleSiteContact = vi.fn();
const mockDeleteScaleSiteContact = vi.fn();
const mockUpdateScaleSiteContact = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  BackendApiConfig: { BASE: 'http://test' },
  default: {
    scaleSiteContacts: {
      getScaleSiteOwner: (...args: unknown[]) => mockGetScaleSiteOwner(...args),
      getScaleSiteContacts: (...args: unknown[]) => mockGetScaleSiteContacts(...args),
      getScaleSiteContact: (...args: unknown[]) => mockGetScaleSiteContact(...args),
      deleteScaleSiteContact: (...args: unknown[]) => mockDeleteScaleSiteContact(...args),
      updateScaleSiteContact: (...args: unknown[]) => mockUpdateScaleSiteContact(...args),
    },
  },
}));

const owner: ScaleSiteOwner = {
  scaleSiteIdNmbr: 'A12345',
  clientNumber: '00012345',
  clientLocnCode: '00',
  companyName: 'ACME FOREST PRODUCTS',
};

const listContact: ScaleSiteContact = {
  clientContactId: 12345,
  scaleSiteIdNmbr: 'A12345',
  primaryContactInd: 'Y',
  contactName: 'John Smith',
  contactRoleDescription: 'Site Manager',
  businessPhone: '250-555-1234',
  faxNumber: '250-555-5678',
  emailAddress: 'john.smith@example.com',
  siteInformationAccessInd: 'Y',
};

// The full record returned by getScaleSiteContact adds the cell phone and dates
// that the contacts list view omits.
const fullContact: ScaleSiteContact = {
  ...listContact,
  cellPhone: '250-555-9012',
  effectiveDate: '2024-01-01',
  expiryDate: '2026-01-01',
};

const renderTab = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ContactsTab isActive scaleSiteIdNmbr="A12345" />
      </QueryClientProvider>
    </MemoryRouter>,
  );

describe('ContactsTab — contact view', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const createAuthContextValue = (): AuthContextType => ({
    // An administrator, so permission-gated controls render: these tests are about the
    // component behaviour, not authorization (see permissions.unit.test.ts for that).
    user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  beforeEach(() => {
    mockGetScaleSiteOwner.mockReset();
    mockGetScaleSiteContacts.mockReset();
    mockGetScaleSiteContact.mockReset();
    mockDeleteScaleSiteContact.mockReset();
    mockUpdateScaleSiteContact.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());

    mockGetScaleSiteOwner.mockResolvedValue(owner);
    mockGetScaleSiteContacts.mockResolvedValue([listContact]);
    mockGetScaleSiteContact.mockResolvedValue(fullContact);
  });

  it('renders the contact name as a clickable link', async () => {
    renderTab();
    const nameButton = await screen.findByRole('button', { name: 'John Smith' });
    expect(nameButton).toHaveClass('view-scale-site__table-link');
  });

  it('opens the read-only view with the full contact details when the name is clicked', async () => {
    renderTab();

    fireEvent.click(await screen.findByRole('button', { name: 'John Smith' }));

    // Full record is fetched and rendered, including the cell phone the list view omits.
    expect(await screen.findByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Site Contact')).toBeInTheDocument();
    // Wait for the fetched record to render before asserting its values.
    expect(await screen.findByText('250-555-9012')).toBeInTheDocument();
    expect(screen.getByText('250-555-1234')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
    expect(screen.getByText('2026-01-01')).toBeInTheDocument();
    expect(mockGetScaleSiteContact).toHaveBeenCalledWith('A12345', 12345, 'token');
  });

  it('returns to the contacts list when Back is clicked', async () => {
    renderTab();

    fireEvent.click(await screen.findByRole('button', { name: 'John Smith' }));
    await screen.findByText('Contact Information');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    // List view is restored — the owner section and the name link reappear.
    expect(await screen.findByText('Site Owner Information')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'John Smith' })).toBeInTheDocument();
  });

  it('opens the edit form from the view via Edit Record', async () => {
    renderTab();

    fireEvent.click(await screen.findByRole('button', { name: 'John Smith' }));
    await screen.findByText('Contact Information');

    fireEvent.click(screen.getByRole('button', { name: /edit record/i }));

    // The inline edit form replaces the view (Save Record action present).
    expect(await screen.findByRole('button', { name: /save record/i })).toBeInTheDocument();
  });

  it('shows a blocking error state (no partial data) when the full record cannot be loaded', async () => {
    mockGetScaleSiteContact.mockRejectedValue(new Error('boom'));
    renderTab();

    fireEvent.click(await screen.findByRole('button', { name: 'John Smith' }));

    // A real fetch failure is blocking — no partial/misleading detail table is rendered.
    expect(await screen.findByText('Could not load contact.')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Contact information' })).not.toBeInTheDocument();

    // Back returns to the contacts list.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Site Owner Information')).toBeInTheDocument();
  });
});

/**
 * Matrix §D grants the Scale Site Owner "Scale Site Record – Contacts" and "Scale Site Contact" as
 * `R (ltd)` and nothing more. Until SCS_OWNER was enabled this tab had no gating at all — every
 * control rendered for anyone who could reach the record — so these assertions are the regression
 * guard for that fix rather than a restatement of the matrix.
 */
describe('ContactsTab — a read-only role', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  // clientNumbers is required: SCS_OWNER is client-scoped, and without one it holds no permissions,
  // which would make every "control is absent" assertion below pass for the wrong reason.
  const ownerAuthContextValue = (): AuthContextType => ({
    user: {
      roles: ['SCS_OWNER'],
      privileges: { SCS_OWNER: null },
      clientNumbers: ['00012345'],
      isClientRestricted: true,
    },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  beforeEach(() => {
    mockGetScaleSiteOwner.mockReset();
    mockGetScaleSiteContacts.mockReset();
    mockGetScaleSiteContact.mockReset();
    mockUseAuth.mockReturnValue(ownerAuthContextValue());

    mockGetScaleSiteOwner.mockResolvedValue(owner);
    mockGetScaleSiteContacts.mockResolvedValue([listContact]);
    mockGetScaleSiteContact.mockResolvedValue(fullContact);
  });

  it('still reads the contact list — the gating hides controls, not data', async () => {
    renderTab();

    expect(await screen.findByRole('button', { name: 'John Smith' })).toBeInTheDocument();
    expect(screen.getByText('Site Owner Information')).toBeInTheDocument();
    expect(screen.getByText('250-555-1234')).toBeInTheDocument();
  });

  it('offers no Add, Edit or Delete, and drops the Actions column entirely', async () => {
    renderTab();
    await screen.findByRole('button', { name: 'John Smith' });

    expect(screen.queryByRole('button', { name: /add primary contact/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add site contact/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    // Omitted rather than rendered empty, so the table has no dangling header.
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('opens the contact detail with Back but no Edit Record', async () => {
    renderTab();

    fireEvent.click(await screen.findByRole('button', { name: 'John Smith' }));
    expect(await screen.findByText('Contact Information')).toBeInTheDocument();

    // Every role that can open a page needs a way off it, so Back is never gated.
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit record/i })).not.toBeInTheDocument();
  });
});
