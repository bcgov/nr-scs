import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import ViewScaleSiteAuthorization from './index';

const authorization = (overrides: Record<string, unknown> = {}) => ({
  scaleSiteAuthorizationId: 5,
  scaleSiteIdNmbr: 'SS-1',
  scaleSiteName: 'North Yard',
  effectiveDate: '2026-01-01',
  expiryDate: '2026-12-31',
  expectedAnnualScaleVolume: 100,
  conditions: [],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue(authorization());
});

const renderPage = () =>
  renderWithProviders(<ViewScaleSiteAuthorization />, {
    route: '/scale-site-authorizations/5',
    path: '/scale-site-authorizations/:scaleSiteAuthorizationId',
  });

describe('View Scale Site Authorization', () => {
  it('loads the authorization named in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization).toHaveBeenCalled(),
    );
  });

  it('shows the scale site number and name', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1'));
    // The site name is resolved separately from the authorization record.
    expect(controlById(container, 'scale-site-name')).toBeInTheDocument();
  });

  it('shows the authorization dates', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'effective-date')).toBeInTheDocument());
    expect(controlById(container, 'expiry-date')).toBeInTheDocument();
  });

  it('shows the expected annual volume', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'expected-volume')).toBeInTheDocument());
  });

  it('renders the scale site and conditions sections', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Scale Site')).toBeInTheDocument());
    expect(screen.getByText('Conditions')).toBeInTheDocument();
  });

  it('offers the record actions', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Create Letter/i })).toBeInTheDocument();
  });

  it('navigates to the edit screen', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Edit Record/i }));

    expect(navigate).toHaveBeenCalled();
  });

  it('deletes nothing without confirmation', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );

    expect(
      apiMock.scaleSiteAuthorizations.deleteScaleSiteAuthorization,
    ).not.toHaveBeenCalled();
  });

  it('surfaces a load failure', async () => {
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockRejectedValue(
      new Error('Authorization not available.'),
    );
    renderPage();

    expect(await screen.findByText(/Authorization not available\./i)).toBeInTheDocument();
  });

  it('shows the cancellation fields', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'cancellation-date')).toBeInTheDocument());
    expect(controlById(container, 'cancellation-reason')).toBeInTheDocument();
  });
});

describe('View Scale Site Authorization — delete and letter', () => {
  const ready = async () =>
    waitFor(() => expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument());

  it('does nothing when the delete confirmation is declined', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));

    expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete this record?');
    expect(apiMock.scaleSiteAuthorizations.deleteScaleSiteAuthorization).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('deletes the authorization once confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    apiMock.scaleSiteAuthorizations.deleteScaleSiteAuthorization.mockResolvedValue(undefined);
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteAuthorizations.deleteScaleSiteAuthorization).toHaveBeenCalledWith(5, expect.anything()),
    );
    confirm.mockRestore();
  });

  it('reports a failed delete and stays on the record', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    apiMock.scaleSiteAuthorizations.deleteScaleSiteAuthorization.mockRejectedValue(new Error('Delete refused.'));
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));

    expect((await screen.findAllByText(/Delete refused\./i)).length).toBeGreaterThan(0);
    confirm.mockRestore();
  });

  it('goes to the letter options when no letter exists yet', async () => {
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /Create Letter/i }));

    expect(navigate).toHaveBeenCalledWith('/scale-site-authorizations/5/letter');
    expect(apiMock.scaleSiteAuthorizations.getScaleSiteAuthorizationLetter).not.toHaveBeenCalled();
  });

  it('downloads the existing letter instead of creating another', async () => {
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue(authorization({ letterExists: true }));
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorizationLetter.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'auth.pdf' });
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /View Letter/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteAuthorizations.getScaleSiteAuthorizationLetter).toHaveBeenCalledWith(5, expect.anything()),
    );
  });

  it('reports a failed letter download', async () => {
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue(authorization({ letterExists: true }));
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorizationLetter.mockRejectedValue(new Error('Letter unavailable.'));
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /View Letter/i }));

    expect((await screen.findAllByText(/Letter unavailable\./i)).length).toBeGreaterThan(0);
  });
});
