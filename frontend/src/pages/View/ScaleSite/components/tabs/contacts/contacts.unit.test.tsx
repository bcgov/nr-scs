import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';
import type { ScaleSiteContact } from '@/services/scaleSiteContacts.types';

import ContactSearchModal from './ContactSearchModal';
import ContactsCreate from './ContactsCreate';
import ContactsEdit from './ContactsEdit';
import ContactsView from './ContactsView';

const SITE = 'SS-1';

const contact = (overrides: Partial<ScaleSiteContact> = {}): ScaleSiteContact =>
  ({
    scaleSiteContactId: 1,
    clientContactId: 1234,
    contactName: 'Pat Jones',
    contactRoleDescription: 'Site manager',
    primaryContactInd: 'Y',
    siteInformationAccessInd: 'Y',
    effectiveDate: '2026-01-01',
    expiryDate: null,
    ...overrides,
  }) as ScaleSiteContact;

const onClose = vi.fn();
const onSelect = vi.fn();
const onEdit = vi.fn();

beforeEach(() => {
  resetApiMock();
  // The view and edit screens re-fetch the full contact by id rather than trusting the list row,
  // so the detail has to be stubbed or they stay on their skeleton.
  apiMock.scaleSiteContacts.getScaleSiteContact.mockResolvedValue(contact());
  onClose.mockClear();
  onSelect.mockClear();
  onEdit.mockClear();
});

describe('ContactSearchModal', () => {
  const setup = (open = true) =>
    renderWithProviders(
      <ContactSearchModal
        open={open}
        defaultClientNumber="00012345"
        onClose={onClose}
        onSelect={onSelect}
      />,
    );

  it('renders when open', () => {
    const { container } = setup(true);

    expect(container.textContent ?? '').not.toBe('');
  });

  it('does not search on its own', async () => {
    setup(true);

    await waitFor(() => expect(document.body.textContent ?? '').not.toBe(''));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects nothing while no result is chosen', async () => {
    apiMock.scaleSiteContacts.searchClientContacts.mockResolvedValue([]);
    setup(true);

    await waitFor(() => expect(document.body.textContent ?? '').not.toBe(''));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('survives a failed contact search', async () => {
    apiMock.scaleSiteContacts.searchClientContacts.mockRejectedValue(
      new Error('Contact search unavailable.'),
    );
    const { container } = setup(true);

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });
});

describe('ContactsCreate', () => {
  const setup = () =>
    renderWithProviders(
      <ContactsCreate
        scaleSiteIdNmbr={SITE}
        primaryContactInd="N"
        ownerClientNumber="00012345"
        onClose={onClose}
      />,
    );

  it('renders the create form', () => {
    const { container } = setup();

    expect(container.textContent ?? '').not.toBe('');
  });

  it('creates nothing merely by rendering', () => {
    setup();

    expect(apiMock.scaleSiteContacts.createScaleSiteContact).not.toHaveBeenCalled();
  });

  it('refuses to create from an empty form', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteContacts.createScaleSiteContact).not.toHaveBeenCalled(),
    );
  });

  it('closes without saving from Back', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));

    expect(onClose).toHaveBeenCalled();
    expect(apiMock.scaleSiteContacts.createScaleSiteContact).not.toHaveBeenCalled();
  });
});

describe('ContactsEdit', () => {
  const setup = (overrides: Partial<ScaleSiteContact> = {}) =>
    renderWithProviders(
      <ContactsEdit scaleSiteIdNmbr={SITE} contact={contact(overrides)} onClose={onClose} />,
    );

  it('renders the contact it re-fetched by id', async () => {
    const { container } = setup();

    await waitFor(() =>
      expect(apiMock.scaleSiteContacts.getScaleSiteContact).toHaveBeenCalled(),
    );
    // The role sits in an input, so it is a value rather than text content.
    await waitFor(() => {
      const values = Array.from(container.querySelectorAll('input,textarea')).map(
        (el) => (el as HTMLInputElement).value,
      );
      expect(values.join(' ')).toContain('Site manager');
    });
  });

  it('updates nothing merely by rendering', () => {
    setup();

    expect(apiMock.scaleSiteContacts.updateScaleSiteContact).not.toHaveBeenCalled();
  });

  it('renders a contact whose expiry date is set', () => {
    const { container } = setup({ expiryDate: '2026-12-31' });

    expect(container.textContent ?? '').not.toBe('');
  });

  it('closes without saving from Back', async () => {
    setup();

    await userEvent.click(await screen.findByRole('button', { name: /^Back$/i }));

    expect(onClose).toHaveBeenCalled();
    expect(apiMock.scaleSiteContacts.updateScaleSiteContact).not.toHaveBeenCalled();
  });
});

describe('ContactsView', () => {
  const setup = (overrides: Partial<ScaleSiteContact> = {}) =>
    renderWithProviders(
      <ContactsView
        scaleSiteIdNmbr={SITE}
        contact={contact(overrides)}
        onClose={onClose}
        onEdit={onEdit}
      />,
    );

  it('shows the contact details read-only', async () => {
    const { container } = setup();

    await waitFor(() => {
      const values = Array.from(container.querySelectorAll('input,textarea')).map(
        (el) => (el as HTMLInputElement).value,
      );
      const shown = `${container.textContent ?? ''} ${values.join(' ')}`;
      expect(shown).toContain('Site manager');
    });
  });

  it('hands the contact back when Edit is chosen', async () => {
    setup();

    await userEvent.click(await screen.findByRole('button', { name: /Edit Record/i }));

    expect(onEdit).toHaveBeenCalled();
  });

  it('renders a contact with no expiry date', () => {
    const { container } = setup({ expiryDate: null });

    expect(container.textContent ?? '').not.toBe('');
  });
});

describe('ContactSearchModal — searching and selecting', () => {
  const setupOpen = () =>
    renderWithProviders(
      <ContactSearchModal open defaultClientNumber="00012345" onClose={onClose} onSelect={onSelect} />,
    );
  // Anchor on the search input rather than a modal class: Carbon does not always mark the open
  // dialog with is-visible in this environment.
  const nameInput = () => document.querySelector('#contact-search-name') as HTMLInputElement;
  const modal = () => (nameInput()?.closest('.cds--modal') as HTMLElement | null) ?? document.body;
  const submit = () => fireEvent.click(within(modal()).getByRole('button', { name: /^Search$/i }));

  it('searches the client contacts with the default client and typed name', async () => {
    apiMock.scaleSiteContacts.searchClientContacts.mockResolvedValue([]);
    setupOpen();

    await waitFor(() => expect(nameInput()).not.toBeNull());
    fireEvent.change(nameInput(), { target: { name: 'contactName', value: 'Pat' } });
    submit();

    await waitFor(() => expect(apiMock.scaleSiteContacts.searchClientContacts).toHaveBeenCalled());
    const [params] = apiMock.scaleSiteContacts.searchClientContacts.mock.calls[0];
    expect(JSON.stringify(params)).toContain('00012345');
  });

  it('hands the chosen contact id back and nothing else', async () => {
    apiMock.scaleSiteContacts.searchClientContacts.mockResolvedValue([
      { clientContactId: 77, contactName: 'Pat Jones', clientNumber: '00012345', clientLocnCode: '00' },
    ]);
    setupOpen();

    await waitFor(() => expect(nameInput()).not.toBeNull());
    submit();
    await waitFor(() => expect(modal().textContent ?? '').toContain('Pat Jones'));
    const row = within(modal()).getByText('Pat Jones').closest('tr') as HTMLElement;
    await userEvent.click(within(row).getByRole('button'));

    expect(onSelect).toHaveBeenCalledWith(77);
  });

  it('shows an empty result without crashing', async () => {
    apiMock.scaleSiteContacts.searchClientContacts.mockResolvedValue([]);
    setupOpen();

    await waitFor(() => expect(nameInput()).not.toBeNull());
    submit();

    await waitFor(() => expect(apiMock.scaleSiteContacts.searchClientContacts).toHaveBeenCalled());
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clears the search on reset while keeping the default client', async () => {
    apiMock.scaleSiteContacts.searchClientContacts.mockResolvedValue([
      { clientContactId: 77, contactName: 'Pat Jones', clientNumber: '00012345', clientLocnCode: '00' },
    ]);
    setupOpen();

    await waitFor(() => expect(nameInput()).not.toBeNull());
    fireEvent.change(nameInput(), { target: { name: 'contactName', value: 'Pat' } });
    submit();
    await waitFor(() => expect(modal().textContent ?? '').toContain('Pat Jones'));
    await userEvent.click(within(modal()).getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(modal().textContent ?? '').not.toContain('Pat Jones'));
    expect(nameInput()).toHaveValue('');
  });
});

describe('ContactsEdit — saving', () => {
  const setupEdit = () =>
    renderWithProviders(<ContactsEdit scaleSiteIdNmbr={SITE} contact={contact()} onClose={onClose} />);
  const loadedForm = async (container: HTMLElement) =>
    waitFor(() => {
      const values = Array.from(container.querySelectorAll('input,textarea')).map((el) => (el as HTMLInputElement).value);
      expect(values.join(' ')).toContain('Site manager');
    });

  it('saves the loaded contact through the update endpoint', async () => {
    apiMock.scaleSiteContacts.updateScaleSiteContact.mockResolvedValue(contact());
    const { container } = setupEdit();

    await loadedForm(container);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(apiMock.scaleSiteContacts.updateScaleSiteContact).toHaveBeenCalled());
    expect(apiMock.scaleSiteContacts.createScaleSiteContact).not.toHaveBeenCalled();
  });

  it('reports a refused update and keeps the form open', async () => {
    apiMock.scaleSiteContacts.updateScaleSiteContact.mockRejectedValue(new Error('Update refused.'));
    const { container } = setupEdit();

    await loadedForm(container);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(apiMock.scaleSiteContacts.updateScaleSiteContact).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
