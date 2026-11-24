import { fireEvent, screen, waitFor } from '@testing-library/react';
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
  authorizationEffectiveDate: '2026-01-01',
  authorizationExpiryDate: '2026-12-31',
  expectedScaleVolume: 100,
  cancellationDate: '',
  cancellationReasonTxt: '',
  conditions: [],
  ...overrides,
});

const load = (a: unknown) => apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization.mockResolvedValue(a as never);
const update = () => apiMock.scaleSiteAuthorizations.updateScaleSiteAuthorization;

beforeEach(() => {
  resetApiMock();
  load(authorization());
  update().mockResolvedValue({ scaleSiteAuthorizationId: 5 });
});

const renderPage = (route = '/scale-site-authorizations/5/edit') =>
  renderWithProviders(<EditScaleSiteAuthorization />, { route, path: '/scale-site-authorizations/:scaleSiteAuthorizationId/edit' });
const loaded = (container: HTMLElement) => waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1'));
const save = () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

describe('Edit Scale Site Authorization — more', () => {
  it('refuses an id that is not a number', async () => {
    renderPage('/scale-site-authorizations/abc/edit');

    expect(await screen.findByText('Invalid ID')).toBeInTheDocument();
    expect(apiMock.scaleSiteAuthorizations.getScaleSiteAuthorization).not.toHaveBeenCalled();
  });

  it('skips validation once a letter exists and sends the record as it stands', async () => {
    load(authorization({ letterExists: true, expectedScaleVolume: null, scaleSiteIdNmbr: 'ss-1' }));
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue('ss-1'));
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(update().mock.calls[0][1]).toMatchObject({ scaleSiteIdNmbr: 'SS-1', expectedScaleVolume: 0 });
  });

  it('keeps the record\'s conditions past the mandatory seed and sends those with an id, defaulting their class', async () => {
    apiMock.scaleSiteAuthorizations.searchActiveScaleSiteAuthConditions.mockResolvedValue([
      { scaleAuthConditionId: 99, scaleConditionClassCode: 'SIA', ministryStandardInd: 'Y' },
    ] as never);
    load(
      authorization({
        conditions: [
          { scaleAuthConditionId: 1, scaleConditionClassCode: 'SIA', scaleAuthConditionTitle: 'Bark' },
          { scaleAuthConditionId: 2, scaleAuthConditionTitle: 'No class' },
          { scaleConditionClassCode: 'SIA', scaleAuthConditionTitle: 'No id' },
        ],
      }),
    );
    const { container } = renderPage();

    await loaded(container);
    await waitFor(() => expect(apiMock.scaleSiteAuthorizations.searchActiveScaleSiteAuthConditions).toHaveBeenCalled());
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(update().mock.calls[0][1].conditions).toEqual([
      { scaleAuthConditionId: 1, scaleConditionClassCode: 'SIA' },
      { scaleAuthConditionId: 2, scaleConditionClassCode: 'SIA' },
    ]);
  });

  it('forgets a complaint once the field is corrected', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'expected-annual-scale-volume'), { target: { value: '' } });
    await save();
    await screen.findAllByText(/Expected Annual Scale Volume/);
    expect(update()).not.toHaveBeenCalled();

    fireEvent.change(controlById(container, 'expected-annual-scale-volume'), { target: { value: '250' } });
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(update().mock.calls[0][1]).toMatchObject({ expectedScaleVolume: 250 });
  });
});
