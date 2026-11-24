import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import ContactSearchModal from './ContactSearchModal';

const results = [
  { clientContactId: 2, contactName: 'Bob Baker', clientNumber: '00012345', clientLocnCode: '02', contactRole: 'Foreman' },
  { clientContactId: 1, contactName: 'Ann Able', clientNumber: '00012345', clientLocnCode: '01', contactRole: 'Owner' },
];

const onClose = vi.fn();
const onSelect = vi.fn();

beforeEach(() => {
  resetApiMock();
  onClose.mockClear();
  onSelect.mockClear();
  apiMock.scaleSiteContacts.searchClientContacts.mockResolvedValue(results as never);
});

const setup = (open = true) =>
  renderWithProviders(<ContactSearchModal open={open} defaultClientNumber="00012345" onClose={onClose} onSelect={onSelect} />);
const search = () => fireEvent.click(screen.getAllByRole('button', { name: /^Search$/ })[0]);

describe('ContactSearchModal', () => {
  it('seeds the client number and searches the client contacts', async () => {
    const { container } = setup();

    expect(container.querySelector('#contact-search-client-number')).toHaveValue('00012345');
    search();

    await waitFor(() => expect(apiMock.scaleSiteContacts.searchClientContacts).toHaveBeenCalled());
    expect(apiMock.scaleSiteContacts.searchClientContacts.mock.calls[0][0]).toMatchObject({ clientNumber: '00012345' });
    expect((await screen.findAllByText(/Ann Able/)).length).toBeGreaterThan(0);
  });

  it('hands the chosen contact back and closes', async () => {
    setup();
    search();
    await screen.findAllByText(/Ann Able/);

    const choice = screen.getAllByRole('button').find((b) => /^1$|Ann Able/.test(b.textContent ?? '') && !/Search|Reset/.test(b.textContent ?? ''))!;
    fireEvent.click(choice);

    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('searches on Enter in the contact name and sorts the rows', async () => {
    const { container } = setup();
    const name = (container.querySelector('#contact-search-name') as HTMLInputElement);

    fireEvent.change(name, { target: { value: 'A' } });
    fireEvent.keyDown(name, { key: 'Enter' });

    await waitFor(() => expect(apiMock.scaleSiteContacts.searchClientContacts).toHaveBeenCalled());
    await screen.findAllByText(/Ann Able/);
    const rowsText = () => Array.from(container.querySelectorAll('tbody tr')).map((tr) => tr.textContent ?? '');
    expect(rowsText().length).toBe(2);

    const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[];
    const primary = selects.find((s) => Array.from(s.options).some((o) => o.value === '2'));
    if (primary) {
      fireEvent.change(primary, { target: { value: '2' } });
      await waitFor(() => expect(rowsText()[0]).toMatch(/Ann Able/));
    }
  });

  it('reports a failed search and resets the criteria', async () => {
    apiMock.scaleSiteContacts.searchClientContacts.mockRejectedValue(new Error('Contacts unavailable.'));
    const { container } = setup();
    void container;

    fireEvent.change((container.querySelector('#contact-search-name') as HTMLInputElement), { target: { value: 'Zed' } });
    search();
    expect((await screen.findAllByText(/Contacts unavailable\.|Search failed/)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /^Reset$/ })[0]);
    expect((container.querySelector('#contact-search-name') as HTMLInputElement)).toHaveValue('');
    expect(container.querySelector('#contact-search-client-number')).toHaveValue('00012345');
  });

  it('closes on request', () => {
    setup();

    fireEvent.click(screen.getAllByRole('button', { name: /close/i })[0]);

    expect(onClose).toHaveBeenCalled();
  });
});
