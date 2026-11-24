import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import CreateScalerAuthorization from './index';

beforeEach(() => {
  resetApiMock();
  // The district select is LOV-backed; without options it cannot be set and every form that
  // needs a district stays invalid.
  apiMock.lov.getRegionDistrictLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
});

const renderPage = () => renderWithProviders(<CreateScalerAuthorization />);
const addConditions = async () =>
  userEvent.click(screen.getByRole('button', { name: /Add Conditions/i }));

const fillBasics = async (container: HTMLElement) => {
  await waitFor(() =>
    expect(controlById<HTMLSelectElement>(container, 'district').options.length).toBeGreaterThan(1),
  );
  fireEvent.change(controlById(container, 'authorized-scaler-licence'), {
    target: { value: 'S1234' },
  });
  fireEvent.change(controlById(container, 'effective-date'), { target: { value: '2026-01-01' } });
  fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2026-12-31' } });
  fireEvent.change(controlById(container, 'district'), { target: { value: '43' } });
  fireEvent.change(controlById(container, 'district-wide'), { target: { value: 'Y' } });
};

describe('Create Scaler Authorization', () => {
  it('renders the authorization fields', () => {
    const { container } = renderPage();

    expect(controlById(container, 'authorized-scaler-licence')).toBeInTheDocument();
    expect(controlById(container, 'effective-date')).toBeInTheDocument();
    expect(controlById(container, 'expiry-date')).toBeInTheDocument();
    expect(controlById(container, 'district')).toBeInTheDocument();
    expect(controlById(container, 'district-wide')).toBeInTheDocument();
  });

  it('shows Add Conditions before the conditions section is open', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /Add Conditions/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Record/i })).not.toBeInTheDocument();
  });

  it('reports the required fields on an empty form', async () => {
    renderPage();

    await addConditions();

    expect(await screen.findByText('Licence # is required')).toBeInTheDocument();
    expect(screen.getByText('Effective Date is required.')).toBeInTheDocument();
    expect(screen.getByText('Expiry Date is required.')).toBeInTheDocument();
    expect(screen.getByText('Reg / Dist is required.')).toBeInTheDocument();
  });

  it('rejects an expiry date that is not after the effective date', async () => {
    const { container } = renderPage();

    await fillBasics(container);
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2025-01-01' } });
    await addConditions();

    expect(
      await screen.findByText('Expiry Date must be after Effective Date.'),
    ).toBeInTheDocument();
  });

  it('creates nothing while the form is invalid', async () => {
    renderPage();

    await addConditions();

    await waitFor(() =>
      expect(apiMock.scalerAuthorizations.createScalerAuthorization).not.toHaveBeenCalled(),
    );
  });

  it('opens the conditions section once the basics are valid', async () => {
    const { container } = renderPage();

    await fillBasics(container);
    await addConditions();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
  });

  it('keeps a typed licence number', () => {
    const { container } = renderPage();

    const licence = controlById(container, 'authorized-scaler-licence');
    fireEvent.change(licence, { target: { value: 'S1234' } });

    expect(licence).toHaveValue('S1234');
  });

  it('clears the form on reset', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'authorized-scaler-licence'), {
      target: { value: 'S1234' },
    });
    await userEvent.click(screen.getAllByRole('button', { name: /^Reset$/i })[0]);

    await waitFor(() =>
      expect(controlById(container, 'authorized-scaler-licence')).toHaveValue(''),
    );
  });

  it('requires a district wide choice', async () => {
    const { container } = renderPage();

    await fillBasics(container);
    fireEvent.change(controlById(container, 'district-wide'), { target: { value: '' } });
    await addConditions();

    expect(await screen.findByText('District Wide is required.')).toBeInTheDocument();
  });
});

describe('Create Scaler Authorization — save gate', () => {
  it('opens conditions, then refuses to save without a job function', async () => {
    const { container } = renderPage();

    await fillBasics(container);
    await addConditions();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('At least one Job Function is required.')).length).toBeGreaterThan(0);
    expect(apiMock.scalerAuthorizations.createScalerAuthorization).not.toHaveBeenCalled();
  });

  it('requires a scale site when District Wide is No', async () => {
    const { container } = renderPage();

    await fillBasics(container);
    fireEvent.change(controlById(container, 'district-wide'), { target: { value: 'N' } });
    await addConditions();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(
      (await screen.findAllByText('At least one Scale Site is required when District Wide is No.'))
        .length,
    ).toBeGreaterThan(0);
    expect(apiMock.scalerAuthorizations.createScalerAuthorization).not.toHaveBeenCalled();
  });
});
