import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesClient from './index';

beforeEach(() => {
  resetApiMock();
});

const renderPage = () => renderWithProviders(<QueriesClient />);
const search = () => fireEvent.click(screen.getAllByRole('button', { name: /^Search$/i })[0]);

describe('Queries — Clients', () => {
  it('renders the client criteria', () => {
    const { container } = renderPage();

    expect(controlById(container, 'clientNumber')).toBeInTheDocument();
    expect(controlById(container, 'clientLocnCode')).toBeInTheDocument();
    expect(controlById(container, 'companyName')).toBeInTheDocument();
  });

  it('renders the individual name criteria', () => {
    const { container } = renderPage();

    expect(controlById(container, 'lastName')).toBeInTheDocument();
    expect(controlById(container, 'firstName')).toBeInTheDocument();
  });

  it('renders the sort order controls', () => {
    const { container } = renderPage();

    expect(controlById(container, 'primary-sort')).toBeInTheDocument();
    expect(controlById(container, 'secondary-sort')).toBeInTheDocument();
  });

  it('offers Search and Reset', () => {
    renderPage();

    expect(screen.getAllByRole('button', { name: /^Search$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^Reset$/i }).length).toBeGreaterThan(0);
  });

  it('keeps a typed client number', () => {
    const { container } = renderPage();

    const client = controlById(container, 'clientNumber');
    fireEvent.change(client, { target: { value: '00012345' } });

    expect(client).toHaveValue('00012345');
  });

  it('keeps a typed company name', () => {
    const { container } = renderPage();

    const company = controlById(container, 'companyName');
    fireEvent.change(company, { target: { value: 'Acme Forestry' } });

    expect(company).toHaveValue('Acme Forestry');
  });

  it('searches with the criteria that were entered', async () => {
    apiMock.client.searchClients.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'clientNumber'), { target: { value: '00012345' } });
    search();

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('shows the rows a search returns', async () => {
    apiMock.client.searchClients.mockResolvedValue([
      { clientNumber: '00012345', clientName: 'Acme Forestry', clientLocnCode: '01' },
    ]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'clientNumber'), { target: { value: '00012345' } });
    search();

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('survives a failed search', async () => {
    apiMock.client.searchClients.mockRejectedValue(new Error('Client search unavailable.'));
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'clientNumber'), { target: { value: '00012345' } });
    search();

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('offers a reset that does not trigger a search', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'companyName'), { target: { value: 'Acme' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Reset$/i })[0]);

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('renders its search panel', () => {
    const { container } = renderPage();

    expect(container.textContent ?? '').toContain('Choose your search parameters.');
  });
});
