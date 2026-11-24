import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import ViewScaleSiteAuthorization from './index';

const authorization = (overrides: Record<string, unknown> = {}) => ({
  scaleSiteAuthorizationId: 5,
  scaleSiteIdNmbr: 'SS-1',
  authorizationEffectiveDate: '2026-01-01',
  authorizationExpiryDate: '2026-12-31',
  expectedScaleVolume: 100,
  status: 'Active',
  conditions: [],
  ...overrides,
});

const alert = vi.fn();

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  alert.mockClear();
  (window as unknown as { alert: typeof alert }).alert = alert;
  apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue(authorization());
  apiMock.scaleSiteAuthorizations.deleteScaleSiteAuthorization.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

const renderPage = (route = '/scale-site-authorizations/5') =>
  renderWithProviders(<ViewScaleSiteAuthorization />, { route, path: '/scale-site-authorizations/:scaleSiteAuthorizationId' });
const ready = () => waitFor(() => expect(screen.getByRole('button', { name: /Delete$/i })).toBeInTheDocument());

describe('View Scale Site Authorization — more', () => {
  it('refuses an id that is not a number', async () => {
    renderPage('/scale-site-authorizations/abc');

    expect(await screen.findByText('Invalid ID')).toBeInTheDocument();
    expect(apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization).not.toHaveBeenCalled();
  });

  it('will not delete an authorization that has a letter, and says why', async () => {
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue(authorization({ letterExists: true }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));

    expect(alert).toHaveBeenCalledWith(expect.stringMatching(/cannot be deleted/));
    expect(confirm).not.toHaveBeenCalled();
    expect(apiMock.scaleSiteAuthorizations.deleteScaleSiteAuthorization).not.toHaveBeenCalled();
  });

  it('will not start a letter for a cancelled authorization', async () => {
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue(authorization({ status: 'Cancelled' }));
    renderPage();
    await ready();

    await userEvent.click(screen.getByRole('button', { name: /Letter/i }));

    expect(alert).toHaveBeenCalledWith('This authorization is cancelled and cannot have a letter created.');
    expect(navigate).not.toHaveBeenCalledWith(expect.stringMatching(/letter/));
  });

  it('goes back to the scale site authorizations tab, or back in history without a site', async () => {
    renderPage();
    await ready();
    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));
    expect(navigate).toHaveBeenCalledWith('/scale-sites/view/SS-1?tab=authorizations');

    navigate.mockClear();
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue(authorization({ scaleSiteIdNmbr: null }));
    const second = renderPage();
    await waitFor(() => expect(second.container.querySelectorAll('button').length).toBeGreaterThan(0));
    await userEvent.click(screen.getAllByRole('button', { name: /^Back$/i }).at(-1)!);
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('still shows the authorization when the scale site lookup fails', async () => {
    apiMock.scaleSites.searchScaleSites.mockRejectedValue(new Error('down'));
    renderPage();

    await ready();
    expect(apiMock.scaleSites.searchScaleSites).toHaveBeenCalled();
  });
});
