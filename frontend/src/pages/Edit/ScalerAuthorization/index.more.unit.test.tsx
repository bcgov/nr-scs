import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

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
  jobFunctions: ['P'],
  authForestProducts: [],
  ...overrides,
});

const load = (a: unknown) => apiMock.scalerAuthorizations.getScalerAuthorization.mockResolvedValue(a as never);
const update = () => apiMock.scalerAuthorizations.updateScalerAuthorization;
const payload = () => update().mock.calls[0][1];

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  load(authorization());
  apiMock.lov.getRegionDistrictLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
  apiMock.lov.getStaticLov.mockImplementation(({ tableKey }: { tableKey: string }) =>
    Promise.resolve(
      tableKey === 'SCALE_METHOD_TYPE_CODE'
        ? [
            { code: 'P', description: 'Piece scale' },
            { code: 'S', description: 'Special products' },
            { code: 'Z', description: 'Not a job function' },
          ]
        : [{ code: 'FP1', description: 'Poles' }],
    ),
  );
  update().mockResolvedValue({ scalerAuthorizationId: 5 });
});

const renderPage = (route = '/scaler-authorizations/5/edit') =>
  renderWithProviders(<EditScalerAuthorization />, {
    route,
    path: '/scaler-authorizations/:scalerAuthorizationId/edit',
  });

const loaded = async (container: HTMLElement) =>
  waitFor(() => expect(controlById(container, 'authorized-scaler-licence')).toHaveValue('S1234'));
const save = async () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
const set = (container: HTMLElement, id: string, value: string) =>
  fireEvent.change(controlById(container, id), { target: { value } });

describe('Edit Scaler Authorization — loading', () => {
  it('refuses an id that is not a number', async () => {
    renderPage('/scaler-authorizations/abc/edit');

    expect(await screen.findByText('Invalid ID')).toBeInTheDocument();
    expect(apiMock.scalerAuthorizations.getScalerAuthorization).not.toHaveBeenCalled();
  });

  it('counts the recorded job functions and products, known or not, skipping blanks', async () => {
    load(authorization({ jobFunctions: ['P', 'ZZ', '', null], authForestProducts: ['FP1', 'Q9', ''] }));
    const { container } = renderPage();

    await loaded(container);

    // Carbon's filterable multi-select shows a selection-count tag rather than the names.
    const jobs = container.querySelector('#job-functions') as HTMLElement;
    const products = container.querySelector('#sfp-products') as HTMLElement;
    await waitFor(() => expect(jobs.textContent?.trim()).toBe('2'));
    expect(products.textContent?.trim()).toBe('2');
  });

  it('shows the load error message the service gives', async () => {
    apiMock.scalerAuthorizations.getScalerAuthorization.mockRejectedValue(new Error('Gone away.'));
    renderPage();

    expect(await screen.findByText('Gone away.')).toBeInTheDocument();
  });
});

describe('Edit Scaler Authorization — saving', () => {
  it('sends the conditions with ids, the sites when not district wide, and no cancellation when blank', async () => {
    load(
      authorization({
        districtWideInd: 'N',
        scaleSites: [{ scaleSiteIdNmbr: 'SS-1', siteName: 'Yard' }, { scaleSiteIdNmbr: 7, siteName: null }],
        conditions: [
          { scaleAuthConditionId: 1, scaleConditionClassCode: 'SCA' },
          { scaleAuthConditionId: 2 },
          { scaleAuthConditionId: null, scaleConditionClassCode: 'SCA' },
        ],
      }),
    );
    const { container } = renderPage();

    await loaded(container);
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(payload()).toMatchObject({
      districtWideInd: 'N',
      scaleSites: ['SS-1', '7'],
      conditions: [
        { scaleAuthConditionId: 1, scaleConditionClassCode: 'SCA' },
        { scaleAuthConditionId: 2, scaleConditionClassCode: 'SCA' },
      ],
      jobFunctions: ['P'],
    });
    expect(payload().cancellationDate).toBeUndefined();
    expect(payload().cancellationReasonTxt).toBeUndefined();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/scaler-authorizations/view/5'));
  });

  it('sends both cancellation fields when they are filled', async () => {
    const { container } = renderPage();

    await loaded(container);
    set(container, 'cancellation-date', '2026-06-01');
    set(container, 'cancellation-reason', 'Licence surrendered');
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(payload()).toMatchObject({ cancellationDate: '2026-06-01', cancellationReasonTxt: 'Licence surrendered' });
    expect(payload()).not.toHaveProperty('scaleSites');
  });

  it('skips the job function and site rules once a letter exists', async () => {
    load(authorization({ letterExists: true, jobFunctions: [], districtWideInd: 'N', scaleSites: [] }));
    const { container } = renderPage();

    await loaded(container);
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(payload()).toMatchObject({ jobFunctions: [], scaleSites: [] });
  });

  it('insists on a special forest product for the S job function', async () => {
    load(authorization({ jobFunctions: ['S'], authForestProducts: [] }));
    const { container } = renderPage();

    await loaded(container);
    await save();

    expect(
      (await screen.findAllByText('At least one Special Forest Product is required when Special Forest Product is selected.')).length,
    ).toBeGreaterThan(0);
    expect(update()).not.toHaveBeenCalled();
  });
});

describe('Edit Scaler Authorization — scale sites', () => {
  const siteAdd = (container: HTMLElement) =>
    within(controlById(container, 'scale-site-number').closest('.scs__form__grid, form') as HTMLElement).getByRole('button', { name: /^Add$/ });

  it('adds a looked-up site and can remove it again', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }]);
    load(authorization({ districtWideInd: 'N', scaleSites: [] }));
    const { container } = renderPage();

    await loaded(container);
    set(container, 'scale-site-number', 'SS-77');
    await userEvent.click(siteAdd(container));
    expect((await screen.findAllByText(/North Yard/)).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Remove scale site SS-77' }));
    await waitFor(() => expect(screen.queryByText(/North Yard/)).not.toBeInTheDocument());
  });

  it('reports a site lookup that fails', async () => {
    apiMock.scaleSites.searchScaleSites.mockRejectedValue(new Error('Lookup unavailable.'));
    load(authorization({ districtWideInd: 'N', scaleSites: [] }));
    const { container } = renderPage();

    await loaded(container);
    set(container, 'scale-site-number', 'SS-77');
    await userEvent.click(siteAdd(container));

    expect((await screen.findAllByText(/Lookup unavailable\.|Could not add scale site\./)).length).toBeGreaterThan(0);
  });
});
