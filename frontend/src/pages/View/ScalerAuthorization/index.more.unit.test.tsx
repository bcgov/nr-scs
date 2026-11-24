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
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import ViewScalerAuthorization from './index';

const authorization = (overrides: Record<string, unknown> = {}) => ({
  scalerAuthorizationId: 5,
  scalerLicenceNo: 'S1234',
  scalerName: 'Jane Smith',
  effectiveDate: '2026-01-01',
  expiryDate: '2026-12-31',
  districtWideInd: 'Y',
  conditions: [],
  scaleSites: [],
  jobFunctions: [],
  forestProducts: [],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue(authorization());
  apiMock.scalerAuthorizations.deleteScalerAuthorization.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

const renderPage = (route = '/scaler-authorizations/5') =>
  renderWithProviders(<ViewScalerAuthorization />, { route, path: '/scaler-authorizations/:scalerAuthorizationId' });
const ready = () => waitFor(() => expect(screen.getByRole('button', { name: /Delete$/i })).toBeInTheDocument());
const del = () => userEvent.click(screen.getByRole('button', { name: /Delete$/i }));

describe('View Scaler Authorization — more', () => {
  it('refuses an id that is not a number', async () => {
    renderPage('/scaler-authorizations/abc');

    expect(await screen.findByText('Invalid ID')).toBeInTheDocument();
    expect(apiMock.scalerAuthorizations.getScalerAuthorization).not.toHaveBeenCalled();
  });

  it('will not delete an authorization that has a letter, and says why', async () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue(authorization({ letterExists: true }));
    // happy-dom ships no window.alert, so one is installed rather than spied on.
    const alert = vi.fn();
    (window as unknown as { alert: typeof alert }).alert = alert;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    await ready();
    await del();

    expect(alert).toHaveBeenCalledWith(expect.stringMatching(/cannot be deleted/));
    expect(confirm).not.toHaveBeenCalled();
    expect(apiMock.scalerAuthorizations.deleteScalerAuthorization).not.toHaveBeenCalled();
  });

  it('returns to the scaler once deleted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    await ready();
    await del();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/scalers/view/S1234?tab=authorizations'));
  });

  it('goes back in history when the deleted record named no scaler', async () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue(authorization({ scalerLicenceNo: null }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    await ready();
    await del();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(-1));
  });

  it('still shows the authorization when the scaler summary cannot be fetched', async () => {
    apiMock.scalers.getScalerSummary.mockRejectedValue(new Error('down'));
    apiMock.scalers.getScalerTombstone.mockRejectedValue(new Error('down'));
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'authorized-scaler-licence')).toHaveValue('S1234'));
    expect(apiMock.scalers.getScalerSummary).toHaveBeenCalled();
  });
});
