import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import WorkBench from './index';

const siteRow = { scaleSiteAuthorizationId: 3, scaleSiteNumber: 'SS-77', scaleSiteName: 'North Yard', expiryDate: '2026-05-01' };
const markRow = { haulingMarkAuthorizationId: 9, timberMark: 'TM9999', expiryDate: '2026-04-01' };

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

const renderPage = () => renderWithProviders(<WorkBench />);
const rowFor = async (text: string) => (await screen.findByText(text)).closest('tr') as HTMLElement;

describe('Work Bench — more', () => {
  it('reports a scale site workbench that fails to load, and lets the banner be closed', async () => {
    apiMock.scaleSiteAuthorizations.searchScaleSiteAuthorizations.mockRejectedValue(new Error('Site queue down.'));
    renderPage();

    expect(await screen.findByText('Failed to load Expiring Scale Site Authorizations')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /close notification/i })[0]);
    await waitFor(() => expect(screen.queryByText('Failed to load Expiring Scale Site Authorizations')).not.toBeInTheDocument());
  });

  it('reports a mark site workbench that fails to load', async () => {
    apiMock.markSiteDesignation.searchMarkSiteDesignations.mockRejectedValue(new Error('Mark queue down.'));
    renderPage();

    expect(await screen.findByText('Failed to load Expiring Mark Site Designations')).toBeInTheDocument();
  });

  it('removes a mark site designation through its own endpoint', async () => {
    apiMock.markSiteDesignation.searchMarkSiteDesignations.mockResolvedValue([markRow]);
    apiMock.markSiteDesignation.removeMarkSiteDesignationFromWorkbench.mockResolvedValue(undefined);
    renderPage();

    const row = await rowFor('TM9999');
    await userEvent.click(within(row).getByRole('button', { name: /Remove$/i }));

    await waitFor(() =>
      expect(apiMock.markSiteDesignation.removeMarkSiteDesignationFromWorkbench).toHaveBeenCalledWith(9, expect.anything()),
    );
    await waitFor(() => expect(screen.queryByText('TM9999')).not.toBeInTheDocument());
  });

  it('renews a scale site authorization and opens the new record', async () => {
    apiMock.scaleSiteAuthorizations.searchScaleSiteAuthorizations.mockResolvedValue([siteRow]);
    apiMock.scaleSiteAuthorizations.renewScaleSiteAuthorization.mockResolvedValue({ newAuthorizationId: 42 });
    renderPage();

    const row = await rowFor('SS-77');
    await userEvent.click(within(row).getByRole('button', { name: /^Add$/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteAuthorizations.renewScaleSiteAuthorization).toHaveBeenCalledWith(3, expect.anything()),
    );
    expect(navigate).toHaveBeenCalledWith('/scale-site-authorizations/view/42');
  });

  it('reports a renewal the service refuses', async () => {
    apiMock.scaleSiteAuthorizations.searchScaleSiteAuthorizations.mockResolvedValue([siteRow]);
    apiMock.scaleSiteAuthorizations.renewScaleSiteAuthorization.mockRejectedValue(new Error('Renewal refused.'));
    renderPage();

    const row = await rowFor('SS-77');
    await userEvent.click(within(row).getByRole('button', { name: /^Add$/i }));

    expect((await screen.findAllByText(/Renewal refused\.|Renew failed/)).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('removes a scale site authorization and drops it from the list', async () => {
    apiMock.scaleSiteAuthorizations.searchScaleSiteAuthorizations.mockResolvedValue([siteRow]);
    apiMock.scaleSiteAuthorizations.removeScaleSiteAuthorizationFromWorkbench.mockResolvedValue(undefined);
    renderPage();

    const row = await rowFor('SS-77');
    await userEvent.click(within(row).getByRole('button', { name: /Remove$/i }));

    await waitFor(() => expect(screen.queryByText('SS-77')).not.toBeInTheDocument());
  });
});
