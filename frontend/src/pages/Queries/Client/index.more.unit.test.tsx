import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/context/activeClient/useActiveClient', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/context/activeClient/useActiveClient');
  return { ...actual, useActiveClient: () => ({ activeClient: '00012345' }) };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesClient from './index';

const rows = [
  { clientNumber: '00012345', clientName: 'Acme Forestry', clientLocnCode: '01' },
  { clientNumber: '00099999', clientName: 'Birch Ltd', clientLocnCode: '02' },
];

beforeEach(() => {
  resetApiMock();
  apiMock.client.searchClients.mockResolvedValue(rows as never);
});

const search = () => fireEvent.click(screen.getAllByRole('button', { name: /^Search$/i })[0]);

describe('Queries — Clients — as a picker', () => {
  it('turns each client into a choice and hands the chosen one back', async () => {
    const onClientSelect = vi.fn();
    const { container } = renderWithProviders(<QueriesClient modalMode hidePageTitle onClientSelect={onClientSelect} />);

    fireEvent.change(controlById(container, 'companyName'), { target: { value: 'Birch' } });
    search();

    const choice = await screen.findByRole('button', { name: /Birch Ltd|00099999/ });
    fireEvent.click(choice);

    expect(onClientSelect).toHaveBeenCalledWith(expect.objectContaining({ clientNumber: '00099999' }));
    expect(screen.queryByText('Queries - Client')).not.toBeInTheDocument();
  });

  it('shows plain text rather than choices on the standalone page', async () => {
    const { container } = renderWithProviders(<QueriesClient />);

    fireEvent.change(controlById(container, 'companyName'), { target: { value: 'Acme' } });
    search();

    await waitFor(() => expect(apiMock.client.searchClients).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toMatch(/Acme Forestry|00012345/));
    expect(screen.queryByRole('button', { name: /Acme Forestry|00012345/ })).not.toBeInTheDocument();
  });
});

describe('Queries — Clients — more', () => {
  it('pins a client-restricted user to their client', async () => {
    const { container } = renderWithProviders(<QueriesClient />, { roles: ['SCS_INDUSTRY_SCALER'], clientNumbers: ['00012345'] });

    await waitFor(() => expect(controlById(container, 'clientNumber')).toHaveValue('00012345'));
  });

  it('lets a failed search be dismissed', async () => {
    apiMock.client.searchClients.mockRejectedValue(new Error('Search exploded.'));
    const { container } = renderWithProviders(<QueriesClient />);

    fireEvent.change(controlById(container, 'companyName'), { target: { value: 'Acme' } });
    search();
    await screen.findAllByText('Search failed');

    fireEvent.click(screen.getAllByRole('button', { name: /close notification/i })[0]);

    await waitFor(() => expect(screen.queryByText('Search failed')).not.toBeInTheDocument());
  });

  it('folds and unfolds the search parameters', async () => {
    const { container } = renderWithProviders(<QueriesClient />);
    const heading = screen.getByText('Choose your search parameters.');

    fireEvent.click(heading);
    fireEvent.click(heading);

    expect(controlById(container, 'companyName')).toBeInTheDocument();
  });
});
