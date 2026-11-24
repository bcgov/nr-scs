import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import EditScaleSiteAuthorization from './index';

const authorization = (overrides: Record<string, unknown> = {}) => ({
  scaleSiteAuthorizationId: 5,
  scaleSiteIdNmbr: 'SS-1',
  // The detail carries the authorization-prefixed date keys, not the bare ones.
  authorizationEffectiveDate: '2026-01-01',
  authorizationExpiryDate: '2026-12-31',
  expectedScaleVolume: 100,
  cancellationDate: '',
  cancellationReasonTxt: '',
  conditions: [],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue(authorization());
});

const renderPage = () =>
  renderWithProviders(<EditScaleSiteAuthorization />, {
    route: '/scale-site-authorizations/5/edit',
    path: '/scale-site-authorizations/:scaleSiteAuthorizationId/edit',
  });

const save = async (container: HTMLElement) => {
  const actions = container.querySelector('.form-actions') as HTMLElement;
  const button = actions
    ? within(actions).queryByRole('button', { name: /Save Record/i })
    : screen.queryByRole('button', { name: /Save Record/i });
  if (button) {
    await userEvent.click(button);
  }
  return button;
};

describe('Edit Scale Site Authorization', () => {
  it('loads the authorization named in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization).toHaveBeenCalled(),
    );
  });

  it('fills the form from the loaded record', async () => {
    const { container } = renderPage();

    await waitFor(() =>
      expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1'),
    );
    expect(controlById(container, 'effective-date')).toHaveValue('2026-01-01');
    expect(controlById(container, 'expiry-date')).toHaveValue('2026-12-31');
  });

  it('renders the cancellation fields', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'cancellation-date')).toBeInTheDocument());
    expect(controlById(container, 'cancellation-reason')).toBeInTheDocument();
  });

  it('renders the conditions section', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByText('Conditions').length).toBeGreaterThan(0));
  });

  it('refuses to save without an expected annual volume', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1'));
    fireEvent.change(controlById(container, 'expected-annual-scale-volume'), {
      target: { value: '' },
    });
    await save(container);

    expect(
      await screen.findByText('Expected Annual Scale Volume is required.'),
    ).toBeInTheDocument();
    expect(
      apiMock.scaleSiteAuthorizations.updateScaleSiteAuthorization,
    ).not.toHaveBeenCalled();
  });

  it('refuses an expiry date that is not after the effective date', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1'));
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2025-01-01' } });
    await save(container);

    expect(
      await screen.findByText('Expiry Date must be after Effective Date.'),
    ).toBeInTheDocument();
  });

  it('saves a valid form through the update endpoint', async () => {
    apiMock.scaleSiteAuthorizations.updateScaleSiteAuthorization.mockResolvedValue({
      scaleSiteAuthorizationId: 5,
    });
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1'));
    await save(container);

    await waitFor(() =>
      expect(apiMock.scaleSiteAuthorizations.updateScaleSiteAuthorization).toHaveBeenCalled(),
    );
  });

  it('surfaces a failed save without losing what was entered', async () => {
    apiMock.scaleSiteAuthorizations.updateScaleSiteAuthorization.mockRejectedValue(
      new Error('Save rejected.'),
    );
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1'));
    fireEvent.change(controlById(container, 'expected-annual-scale-volume'), {
      target: { value: '250' },
    });
    await save(container);

    expect(await screen.findByText(/Save rejected\./i)).toBeInTheDocument();
    expect(controlById(container, 'expected-annual-scale-volume')).toHaveValue('250');
  });

  it('restores the loaded values on reset', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1'));
    fireEvent.change(controlById(container, 'expected-annual-scale-volume'), {
      target: { value: '999' },
    });
    const actions = container.querySelector('.form-actions') as HTMLElement;
    await userEvent.click(within(actions).getByRole('button', { name: /^Reset$/i }));

    await waitFor(() =>
      expect(controlById(container, 'expected-annual-scale-volume')).toHaveValue('100'),
    );
  });

  it('surfaces a load failure', async () => {
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockRejectedValue(
      new Error('Authorization not available.'),
    );
    renderPage();

    expect(await screen.findByText(/Authorization not available\./i)).toBeInTheDocument();
  });
});

describe('Edit Scale Site Authorization — sparse and fully populated records', () => {
  it('renders an authorization with the optional fields absent', async () => {
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue({
      scaleSiteAuthorizationId: 5,
      scaleSiteIdNmbr: 'SS-1',
      authorizationEffectiveDate: null,
      authorizationExpiryDate: null,
      expectedScaleVolume: null,
      cancellationDate: null,
      cancellationReasonTxt: null,
      conditions: null,
    });
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1'));
    expect(controlById(container, 'expected-annual-scale-volume')).toHaveValue('');
    expect(controlById(container, 'effective-date')).toHaveValue('');
  });

  it('renders an authorization carrying conditions and a cancellation', async () => {
    apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue(
      authorization({
        cancellationDate: '2026-06-01',
        cancellationReasonTxt: 'Site closed',
        conditions: [{ scaleAuthConditionId: 12, scaleAuthConditionTitle: 'No night hauling', scaleAuthConditionDesc: 'Daylight only', ministryStandardInd: 'Y', scaleConditionClassCode: 'SIA' }],
      }),
    );
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1'));
    expect(controlById(container, 'cancellation-date')).toHaveValue('2026-06-01');
    expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });
});
