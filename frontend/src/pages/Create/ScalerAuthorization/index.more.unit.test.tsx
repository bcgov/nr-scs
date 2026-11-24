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

import CreateScalerAuthorization from './index';

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.lov.getRegionDistrictLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
  // Job functions come from the scale-method LOV, filtered to P/W/S; 'Z' must be dropped.
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
});

const renderPage = () => renderWithProviders(<CreateScalerAuthorization />);

const fillBasics = async (container: HTMLElement) => {
  await waitFor(() =>
    expect(controlById<HTMLSelectElement>(container, 'district').options.length).toBeGreaterThan(1),
  );
  fireEvent.change(controlById(container, 'authorized-scaler-licence'), { target: { value: 'S1234' } });
  fireEvent.change(controlById(container, 'effective-date'), { target: { value: '2026-01-01' } });
  fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2026-12-31' } });
  fireEvent.change(controlById(container, 'district'), { target: { value: '43' } });
  fireEvent.change(controlById(container, 'district-wide'), { target: { value: 'Y' } });
};

const openConditions = async (container: HTMLElement) => {
  await fillBasics(container);
  await userEvent.click(screen.getByRole('button', { name: /Add Conditions/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument());
};

// Filterable multi-select: open with its toggle, click the option, then close it again --
// a menu left open swallows the next multi-select's toggle click as an outside click.
const pick = async (container: HTMLElement, id: string, label: string) => {
  const toggle = container.querySelector(`#${id}-toggle-button`) as HTMLElement;
  fireEvent.click(toggle);
  const menu = container.querySelector(`#${id}__menu`) as HTMLElement;
  await waitFor(() => expect(menu.textContent).toContain(label));
  fireEvent.click(Array.from(menu.querySelectorAll('[role="option"]')).find((o) => o.textContent?.includes(label))!);
  fireEvent.click(toggle);
  await waitFor(() => expect(menu.querySelectorAll('[role="option"]').length).toBe(0));
};

const save = async () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

describe('Create Scaler Authorization — saving', () => {
  it('creates a district-wide authorization and opens it', async () => {
    apiMock.scalerAuthorizations.createScalerAuthorization.mockResolvedValue({ scalerAuthorizationId: 9 });
    const { container } = renderPage();

    await openConditions(container);
    await pick(container, 'job-functions', 'Piece scale');
    await save();

    await waitFor(() => expect(apiMock.scalerAuthorizations.createScalerAuthorization).toHaveBeenCalled());
    const [payload] = apiMock.scalerAuthorizations.createScalerAuthorization.mock.calls[0];
    expect(payload).toMatchObject({
      scalerLicenceNo: 'S1234',
      orgUnitNo: 43,
      districtWideInd: 'Y',
      authorizationEffectiveDate: '2026-01-01',
      authorizationExpiryDate: '2026-12-31',
      jobFunctions: ['P'],
      authForestProducts: [],
      conditions: [],
    });
    expect(payload).not.toHaveProperty('scaleSites');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/scaler-authorizations/view/9'));
  });

  it('offers only the job functions a scaler can hold', async () => {
    const { container } = renderPage();

    await openConditions(container);
    fireEvent.click(container.querySelector('#job-functions-toggle-button')!);

    expect(await screen.findByText('Piece scale')).toBeInTheDocument();
    expect(screen.getByText('Special products')).toBeInTheDocument();
    expect(screen.queryByText('Not a job function')).not.toBeInTheDocument();
  });

  it('sends the chosen special forest products with an S job function', async () => {
    apiMock.scalerAuthorizations.createScalerAuthorization.mockResolvedValue({ scalerAuthorizationId: 10 });
    const { container } = renderPage();

    await openConditions(container);
    await pick(container, 'job-functions', 'Special products');
    await pick(container, 'sfp-products', 'Poles');
    await save();

    await waitFor(() => expect(apiMock.scalerAuthorizations.createScalerAuthorization).toHaveBeenCalled());
    expect(apiMock.scalerAuthorizations.createScalerAuthorization.mock.calls[0][0]).toMatchObject({
      jobFunctions: ['S'],
      authForestProducts: ['FP1'],
    });
  });

  it('insists on a special forest product once the S job function is chosen', async () => {
    const { container } = renderPage();

    await openConditions(container);
    await pick(container, 'job-functions', 'Special products');
    await save();

    expect(
      (await screen.findAllByText('At least one Special Forest Product is required when Special Forest Product is selected.')).length,
    ).toBeGreaterThan(0);
    expect(apiMock.scalerAuthorizations.createScalerAuthorization).not.toHaveBeenCalled();
  });

  it('reports a refused create and stays on the form', async () => {
    apiMock.scalerAuthorizations.createScalerAuthorization.mockRejectedValue(new Error('Licence is suspended.'));
    const { container } = renderPage();

    await openConditions(container);
    await pick(container, 'job-functions', 'Piece scale');
    await save();

    expect((await screen.findAllByText(/Licence is suspended\.|Could not create scaler authorization\./)).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument();
  });

  it('goes nowhere when the create returns no id', async () => {
    apiMock.scalerAuthorizations.createScalerAuthorization.mockResolvedValue({});
    const { container } = renderPage();

    await openConditions(container);
    await pick(container, 'job-functions', 'Piece scale');
    await save();

    await waitFor(() => expect(apiMock.scalerAuthorizations.createScalerAuthorization).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
  });

  it('copes with the job function lookup failing', async () => {
    apiMock.lov.getStaticLov.mockRejectedValue(new Error('down'));
    const { container } = renderPage();

    await openConditions(container);
    fireEvent.click(container.querySelector('#job-functions-toggle-button')!);

    expect(screen.queryByText('Piece scale')).not.toBeInTheDocument();
    await save();
    expect((await screen.findAllByText('At least one Job Function is required.')).length).toBeGreaterThan(0);
  });
});

describe('Create Scaler Authorization — scale sites when not district wide', () => {
  const siteAdd = (container: HTMLElement) =>
    within(container.querySelector('.scale-sites-section__button-group') as HTMLElement).getByRole('button', { name: /^Add$/ });

  it('sends the added sites with the create', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }]);
    apiMock.scalerAuthorizations.createScalerAuthorization.mockResolvedValue({ scalerAuthorizationId: 11 });
    const { container } = renderPage();

    await openConditions(container);
    fireEvent.change(controlById(container, 'district-wide'), { target: { value: 'N' } });
    await waitFor(() => expect(container.querySelector('#scale-site-number')).not.toBeNull());
    fireEvent.change(container.querySelector('#scale-site-number')!, { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));
    await screen.findAllByText(/North Yard/);
    await pick(container, 'job-functions', 'Piece scale');
    await save();

    await waitFor(() => expect(apiMock.scalerAuthorizations.createScalerAuthorization).toHaveBeenCalled());
    expect(apiMock.scalerAuthorizations.createScalerAuthorization.mock.calls[0][0]).toMatchObject({
      districtWideInd: 'N',
      scaleSites: ['SS-77'],
    });
  });

  it('forgets a field complaint once the field is corrected', async () => {
    const { container } = renderPage();

    await waitFor(() =>
      expect(controlById<HTMLSelectElement>(container, 'district').options.length).toBeGreaterThan(1),
    );
    await userEvent.click(screen.getByRole('button', { name: /Add Conditions/i }));
    await screen.findByText('Licence # is required');

    fireEvent.change(controlById(container, 'authorized-scaler-licence'), { target: { value: 'S1234' } });

    expect(screen.queryByText('Licence # is required')).not.toBeInTheDocument();
  });
});
