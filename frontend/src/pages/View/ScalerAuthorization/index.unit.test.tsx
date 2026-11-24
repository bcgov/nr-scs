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
});

const renderPage = () =>
  renderWithProviders(<ViewScalerAuthorization />, {
    route: '/scaler-authorizations/5',
    path: '/scaler-authorizations/:scalerAuthorizationId',
  });

describe('View Scaler Authorization', () => {
  it('loads the authorization named in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scalerAuthorizations.getScalerAuthorization).toHaveBeenCalled(),
    );
  });

  it('shows the authorized scaler licence', async () => {
    const { container } = renderPage();

    await waitFor(() =>
      expect(controlById(container, 'authorized-scaler-licence')).toHaveValue('S1234'),
    );
  });

  it('shows the authorization dates', async () => {
    const { container } = renderPage();

    await waitFor(() =>
      expect(controlById(container, 'authorized-scaler-licence')).toHaveValue('S1234'),
    );
    expect(controlById(container, 'effective-date')).toBeInTheDocument();
    expect(controlById(container, 'expiry-date')).toBeInTheDocument();
  });

  it('renders each detail section', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(screen.getByText('Authorized Scaler')).toBeInTheDocument());
    const text = container.textContent ?? '';
    ['Job Functions', 'Special Forest Products', 'Conditions'].forEach((section) => {
      expect(text).toContain(section);
    });
  });

  it('offers the record actions', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Create Letter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Back$/i })).toBeInTheDocument();
  });

  it('navigates to the edit screen', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Edit Record/i }));

    expect(navigate).toHaveBeenCalled();
  });

  it('surfaces a load failure', async () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockRejectedValue(
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

  it('does not delete without confirmation', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );

    expect(apiMock.scalerAuthorizations.deleteScalerAuthorization).not.toHaveBeenCalled();
  });
});

describe('View Scaler Authorization — delete and letter', () => {
  const ready = async () =>
    waitFor(() => expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument());

  it('does nothing when the delete confirmation is declined', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));

    expect(apiMock.scalerAuthorizations.deleteScalerAuthorization).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('deletes the authorization once confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    apiMock.scalerAuthorizations.deleteScalerAuthorization.mockResolvedValue(undefined);
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));

    await waitFor(() =>
      expect(apiMock.scalerAuthorizations.deleteScalerAuthorization).toHaveBeenCalledWith(5, expect.anything()),
    );
    confirm.mockRestore();
  });

  it('reports a failed delete', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    apiMock.scalerAuthorizations.deleteScalerAuthorization.mockRejectedValue(new Error('Delete refused.'));
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

    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/letter'));
    expect(apiMock.scalerAuthorizations.getScalerAuthorizationLetter).not.toHaveBeenCalled();
  });

  it('downloads the existing letter instead of creating another', async () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue(authorization({ letterExists: true }));
    apiMock.scalerAuthorizations.getScalerAuthorizationLetter.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'auth.pdf' });
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /View Letter/i }));

    await waitFor(() =>
      expect(apiMock.scalerAuthorizations.getScalerAuthorizationLetter).toHaveBeenCalledWith(5, expect.anything()),
    );
  });
});

describe('View Scaler Authorization — sparse and fully populated records', () => {
  it('renders an authorization with every optional field absent', async () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue({
      scalerAuthorizationId: 5,
      scalerLicenceNo: 'S1234',
      authorizationEffectiveDate: null,
      authorizationExpiryDate: null,
      cancellationDate: null,
      cancellationReasonTxt: null,
      orgUnitNo: null,
      districtWideInd: null,
      status: null,
      letterExists: false,
      jobFunctions: null,
      authForestProducts: null,
      scaleSites: null,
      conditions: null,
    });
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'authorized-scaler-licence')).toHaveValue('S1234'));
    expect(controlById(container, 'cancellation-date')).toHaveValue('');
  });

  it('renders an authorization carrying every collection and a cancellation', async () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue(
      authorization({
        districtWideInd: 'N',
        orgUnitNo: 43,
        status: 'CANCELLED',
        cancellationDate: '2026-06-01',
        cancellationReasonTxt: 'Licence surrendered',
        jobFunctions: ['A', 'S'],
        authForestProducts: ['CEDAR'],
        scaleSites: [{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }],
        conditions: [{ scaleAuthConditionId: 12, scaleAuthConditionTitle: 'No night hauling', scaleAuthConditionDesc: 'Daylight only', ministryStandardInd: 'N' }],
      }),
    );
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'authorized-scaler-licence')).toHaveValue('S1234'));
    expect(controlById(container, 'cancellation-date')).toHaveValue('2026-06-01');
    expect(container.textContent ?? '').toContain('SS-77');
    expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });
});
