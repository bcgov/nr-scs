import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import ContactsTab from './ContactsTab';

const contacts = [
  { clientContactId: 1, contactName: 'Ann Able', contactRole: 'Owner', primaryContactInd: 'Y', phoneNumber: '250-555-0001', emailAddress: 'ann@example.com' },
  { clientContactId: 2, contactName: 'Bob Baker', contactRole: 'Foreman', primaryContactInd: 'N' },
  { contactName: 'No id contact', contactRole: 'Visitor' },
];

beforeEach(() => {
  resetApiMock();
  apiMock.scaleSiteContacts.getScaleSiteOwner.mockResolvedValue({ clientNumber: '00012345', clientName: 'Acme Forestry' } as never);
  apiMock.scaleSiteContacts.getScaleSiteContacts.mockResolvedValue(contacts as never);
});

const renderTab = () => renderWithProviders(<ContactsTab isActive scaleSiteIdNmbr="SS-1" />);
const listed = () => screen.findAllByText('Bob Baker');
// The row buttons are Carbon danger ghosts, whose accessible name carries a hidden "danger" prefix.
const rowDeletes = () => screen.getAllByRole('button', { name: /Delete$/ }).filter((b) => !/Confirm/.test(b.textContent ?? ''));

describe('Scale site contacts tab', () => {
  it('lists the contacts, linking those with an id', async () => {
    renderTab();

    await listed();
    expect(screen.getByRole('button', { name: 'Ann Able' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'No id contact' })).not.toBeInTheDocument();
    expect(screen.getAllByText('No id contact').length).toBeGreaterThan(0);
  });

  it('loads nothing while the tab is inactive', () => {
    renderWithProviders(<ContactsTab isActive={false} scaleSiteIdNmbr="SS-1" />);

    expect(apiMock.scaleSiteContacts.getScaleSiteContacts).not.toHaveBeenCalled();
  });

  it('deletes a contact only after confirmation', async () => {
    apiMock.scaleSiteContacts.deleteScaleSiteContact.mockResolvedValue(undefined);
    renderTab();
    await listed();

    await userEvent.click(rowDeletes()[1]);
    expect(apiMock.scaleSiteContacts.deleteScaleSiteContact).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Confirm Delete$/ }));

    await waitFor(() =>
      expect(apiMock.scaleSiteContacts.deleteScaleSiteContact).toHaveBeenCalledWith('SS-1', 2, expect.anything()),
    );
  });

  it('reports a refused delete', async () => {
    apiMock.scaleSiteContacts.deleteScaleSiteContact.mockRejectedValue(new Error('Contact is the primary.'));
    renderTab();
    await listed();

    await userEvent.click(rowDeletes()[0]);
    await userEvent.click(screen.getByRole('button', { name: /Confirm Delete$/ }));

    expect((await screen.findAllByText(/Contact is the primary\.|Could not delete contact\./)).length).toBeGreaterThan(0);
  });

  it('swaps the list for the add form, the edit form and the read-only view', async () => {
    renderTab();
    await listed();

    await userEvent.click(screen.getByRole('button', { name: /Add Site Contact/i }));
    await waitFor(() => expect(screen.queryByText('Bob Baker')).not.toBeInTheDocument());
  });

  it('opens a contact for editing', async () => {
    renderTab();
    await listed();

    await userEvent.click(screen.getAllByRole('button', { name: /^Edit$/ })[0]);
    await waitFor(() => expect(screen.queryByRole('button', { name: /Add Site Contact/i })).not.toBeInTheDocument());
  });

  it('opens a contact read-only from its name', async () => {
    renderTab();
    await listed();

    await userEvent.click(screen.getByRole('button', { name: 'Ann Able' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Add Site Contact/i })).not.toBeInTheDocument());
  });

  it('keeps Add Primary Contact disabled while a primary exists', async () => {
    renderTab();
    await listed();

    expect(screen.getByRole('button', { name: /Add Primary Contact/i })).toBeDisabled();
  });
});
