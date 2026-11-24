import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesMarkSiteDesignations from './index';

beforeEach(() => {
  resetApiMock();
});

/**
 * The search is driven entirely by the `?timberMark=` URL param — the form just writes it — so a
 * search is exercised by rendering at the corresponding route.
 */
const renderPage = (timberMark?: string) =>
  renderWithProviders(<QueriesMarkSiteDesignations />, {
    route: timberMark ? `/?timberMark=${encodeURIComponent(timberMark)}` : '/',
  });

describe('Queries — Mark Site Designations', () => {
  it('renders the timber mark field and the actions', () => {
    const { container } = renderPage();

    expect(controlById(container, 'timberMark')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Search$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeInTheDocument();
  });

  it('asks for a timber mark before searching', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(await screen.findByText('Please enter a timber mark.')).toBeInTheDocument();
    expect(
      apiMock.markSiteDesignation.searchMarkSiteDesignationsByTimberMark,
    ).not.toHaveBeenCalled();
  });

  it('searches for the timber mark carried in the URL', async () => {
    renderPage('TM1234');

    await waitFor(() =>
      expect(
        apiMock.markSiteDesignation.searchMarkSiteDesignationsByTimberMark,
      ).toHaveBeenCalled(),
    );
  });

  it('shows the rows a search returns', async () => {
    apiMock.markSiteDesignation.searchMarkSiteDesignationsByTimberMark.mockResolvedValue([
      { haulingMarkAuthorizationId: 1, timberMark: 'TM1234', effectiveDate: '2026-01-01' },
    ]);
    renderPage('TM1234');

    expect(await screen.findByText('TM1234')).toBeInTheDocument();
  });

  it('surfaces a failed search', async () => {
    apiMock.markSiteDesignation.searchMarkSiteDesignationsByTimberMark.mockRejectedValue(
      new Error('Search unavailable.'),
    );
    renderPage('TM1234');

    expect(await screen.findByText(/Search unavailable\./i)).toBeInTheDocument();
  });

  it('handles an empty result set', async () => {
    apiMock.markSiteDesignation.searchMarkSiteDesignationsByTimberMark.mockResolvedValue([]);
    renderPage('NOPE');

    await waitFor(() =>
      expect(
        apiMock.markSiteDesignation.searchMarkSiteDesignationsByTimberMark,
      ).toHaveBeenCalled(),
    );
    expect(screen.queryByText('TM1234')).not.toBeInTheDocument();
  });

  it('refuses a wildcard in the URL rather than running a wildcard search', async () => {
    // The guard exists so a hand-crafted ?timberMark=% URL cannot sweep the whole table.
    renderPage('%');

    await waitFor(() =>
      expect(
        apiMock.markSiteDesignation.searchMarkSiteDesignationsByTimberMark,
      ).not.toHaveBeenCalled(),
    );
  });

  it('upper-cases the timber mark from the URL', async () => {
    renderPage('tm1234');

    await waitFor(() =>
      expect(
        apiMock.markSiteDesignation.searchMarkSiteDesignationsByTimberMark,
      ).toHaveBeenCalled(),
    );
    const [arg] = apiMock.markSiteDesignation.searchMarkSiteDesignationsByTimberMark.mock.calls[0];
    expect(String(arg)).toContain('TM1234');
  });

});
