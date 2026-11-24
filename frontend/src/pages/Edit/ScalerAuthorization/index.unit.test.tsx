import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import EditScalerAuthorization from './index';

const authorization = (overrides: Record<string, unknown> = {}) => ({
  scalerAuthorizationId: 5,
  scalerLicenceNo: 'S1234',
  authorizationEffectiveDate: '2026-01-01',
  authorizationExpiryDate: '2026-12-31',
  orgUnitNo: 43,
  districtWideInd: 'Y',
  cancellationDate: '',
  cancellationReasonTxt: '',
  conditions: [],
  scaleSites: [],
  jobFunctions: [],
  forestProducts: [],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue(authorization());
});

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const renderPage = () =>
  renderWithProviders(<EditScalerAuthorization />, {
    route: '/scaler-authorizations/5/edit',
    path: '/scaler-authorizations/:scalerAuthorizationId/edit',
  });

const loaded = async (container: HTMLElement) =>
  waitFor(() =>
    expect(controlById(container, 'authorized-scaler-licence')).toHaveValue('S1234'),
  );

/**
 * The page's own action bar is not `.form-actions` — that class belongs to the embedded scale site
 * search panel, which carries its own Search/Reset pair. The page actions are found from the Save
 * Record button, which is unique.
 */
const saveButton = () => screen.getByRole('button', { name: /Save Record/i });

const save = async () => {
  await userEvent.click(saveButton());
};

const pageAction = (name: RegExp) =>
  within(saveButton().parentElement as HTMLElement).getByRole('button', { name });

describe('Edit Scaler Authorization', () => {
  it('loads the authorization named in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scalerAuthorizations.getScalerAuthorization).toHaveBeenCalled(),
    );
  });

  it('fills the form from the loaded record', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'effective-date')).toHaveValue('2026-01-01');
    expect(controlById(container, 'expiry-date')).toHaveValue('2026-12-31');
  });

  it('renders the cancellation fields', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'cancellation-date')).toBeInTheDocument();
    expect(controlById(container, 'cancellation-reason')).toBeInTheDocument();
  });

  it('renders the job function and forest product selectors', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(container.querySelector('#job-functions')).not.toBeNull();
    expect(container.querySelector('#sfp-products')).not.toBeNull();
  });

  it('renders the conditions section', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(container.textContent ?? '').toContain('Conditions');
  });

  it('refuses to save without an effective date', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'effective-date'), { target: { value: '' } });
    await save();

    expect(await screen.findByText('Effective Date is required.')).toBeInTheDocument();
    expect(apiMock.scalerAuthorizations.updateScalerAuthorization).not.toHaveBeenCalled();
  });

  it('refuses an expiry date that is not after the effective date', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2025-01-01' } });
    await save();

    expect(
      await screen.findByText('Expiry Date must be after Effective Date.'),
    ).toBeInTheDocument();
  });

  it('requires at least one job function', async () => {
    const { container } = renderPage();

    await loaded(container);
    await save();

    expect(
      await screen.findByText('At least one Job Function is required.'),
    ).toBeInTheDocument();
    expect(apiMock.scalerAuthorizations.updateScalerAuthorization).not.toHaveBeenCalled();
  });

  it('demands both cancellation fields when only one is entered', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'cancellation-date'), {
      target: { value: '2026-06-01' },
    });
    await save();

    expect(
      await screen.findByText(
        'If either Cancellation Date or Cancellation Reason is entered then both are required.',
      ),
    ).toBeInTheDocument();
  });

  it('restores the loaded values on reset', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2027-01-01' } });
    await userEvent.click(pageAction(/^Reset$/i));

    await waitFor(() =>
      expect(controlById(container, 'expiry-date')).toHaveValue('2026-12-31'),
    );
  });

  it('surfaces a load failure', async () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockRejectedValue(
      new Error('Authorization not available.'),
    );
    renderPage();

    expect(await screen.findByText(/Authorization not available\./i)).toBeInTheDocument();
  });

  it('offers Back without saving anything', async () => {
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));

    expect(apiMock.scalerAuthorizations.updateScalerAuthorization).not.toHaveBeenCalled();
  });
});

describe('Edit Scaler Authorization — district wide', () => {
  it('requires a scale site once District Wide is switched to No', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'district-wide'), { target: { value: 'N' } });
    await save();

    expect(
      (await screen.findAllByText('At least one Scale Site is required when District Wide is No.'))
        .length,
    ).toBeGreaterThan(0);
  });

  it('clears the scale site error when District Wide goes back to Yes', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'district-wide'), { target: { value: 'N' } });
    await save();
    await screen.findAllByText('At least one Scale Site is required when District Wide is No.');

    fireEvent.change(controlById(container, 'district-wide'), { target: { value: 'Y' } });

    await waitFor(() =>
      expect(
        screen.queryByText('At least one Scale Site is required when District Wide is No.'),
      ).not.toBeInTheDocument(),
    );
  });
});

describe('Edit Scaler Authorization — once a letter exists', () => {
  // A letter locks the authorization: only the cancellation pair stays editable, and the job
  // function / scale site rules no longer apply, so the save path is reachable without them.
  const lockedRender = () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue(authorization({ letterExists: true }));
    navigate.mockClear();
    return renderPage();
  };

  it('saves through the update endpoint and opens the record', async () => {
    apiMock.scalerAuthorizations.updateScalerAuthorization.mockResolvedValue({ scalerAuthorizationId: 5 });
    const { container } = lockedRender();

    await loaded(container);
    await save();

    await waitFor(() =>
      expect(apiMock.scalerAuthorizations.updateScalerAuthorization).toHaveBeenCalledWith(5, expect.anything(), expect.anything()),
    );
    expect(navigate).toHaveBeenCalledWith('/scaler-authorizations/view/5');
  });

  it('stays on the form when the update returns no id', async () => {
    apiMock.scalerAuthorizations.updateScalerAuthorization.mockResolvedValue({});
    const { container } = lockedRender();

    await loaded(container);
    await save();

    await waitFor(() => expect(apiMock.scalerAuthorizations.updateScalerAuthorization).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports a refused update', async () => {
    apiMock.scalerAuthorizations.updateScalerAuthorization.mockRejectedValue(new Error('Update refused.'));
    const { container } = lockedRender();

    await loaded(container);
    await save();

    expect((await screen.findAllByText(/Update refused\./i)).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('still enforces the cancellation pairing while locked', async () => {
    const { container } = lockedRender();

    await loaded(container);
    fireEvent.change(controlById(container, 'cancellation-date'), { target: { value: '2026-06-01' } });
    await save();

    expect(
      (await screen.findAllByText('If either Cancellation Date or Cancellation Reason is entered then both are required.')).length,
    ).toBeGreaterThan(0);
    expect(apiMock.scalerAuthorizations.updateScalerAuthorization).not.toHaveBeenCalled();
  });
});

describe('Edit Scaler Authorization — fully populated record', () => {
  it('seeds the sites, functions, products and conditions from the record', async () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue(
      authorization({
        districtWideInd: 'N',
        cancellationDate: '2026-06-01',
        cancellationReasonTxt: 'Licence surrendered',
        jobFunctions: ['A', 'S'],
        authForestProducts: ['CEDAR'],
        scaleSites: [{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }],
        conditions: [{ scaleAuthConditionId: 12, scaleAuthConditionTitle: 'No night hauling', scaleAuthConditionDesc: 'Daylight only', ministryStandardInd: 'Y' }],
      }),
    );
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'cancellation-date')).toHaveValue('2026-06-01');
    expect(container.textContent ?? '').toContain('SS-77');
    expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });

  it('renders a record whose optional fields are absent', async () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue({
      scalerAuthorizationId: 5,
      scalerLicenceNo: 'S1234',
      authorizationEffectiveDate: null,
      authorizationExpiryDate: null,
      orgUnitNo: null,
      districtWideInd: null,
      cancellationDate: null,
      cancellationReasonTxt: null,
      jobFunctions: null,
      authForestProducts: null,
      scaleSites: null,
      conditions: null,
    });
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'effective-date')).toHaveValue('');
  });
});
