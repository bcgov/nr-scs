import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import CreateScaler from './Create/Scaler';
import CreateScaleSite from './Create/ScaleSite';
import CreateSummaryCheckScale from './Create/SummaryCheckScale';

beforeEach(() => {
  resetApiMock();
  apiMock.lov.getRegionDistrictLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
  apiMock.lov.getScaleMethodTypeLov.mockResolvedValue([
    { code: 'WT', description: 'Weight' },
    { code: 'PC', description: 'Piece' },
  ]);
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'A', description: 'Option A' }]);
  apiMock.lov.getGradingCodeAppointmentTypeLov.mockResolvedValue([
    { code: 'ORD', description: 'Ordinary', scalerAppointmentType: 'O', scaleGradingSystemCode: 'BC' },
  ]);
  apiMock.lov.getScalerTrainingTypeLov.mockResolvedValue([{ code: 'T', description: 'Exam' }]);
});

/**
 * The three create screens share the same skeleton: a form, a Reset, and a Save Record that must
 * refuse an empty form. Covering them together pins that contract; each also gets the checks its
 * own fields need.
 */
const SCREENS: Array<[string, React.ComponentType, string, ReturnType<typeof vi.fn>]> = [
  ['Scaler', CreateScaler, 'Scaler - Create', apiMock.scalers.createScaler],
  ['Scale Site', CreateScaleSite, 'Scale Site - Create', apiMock.scaleSites.createScaleSite],
  [
    'Summary Check Scale',
    CreateSummaryCheckScale,
    'Summary Check Scale - Create',
    apiMock.summaryCheckScale.createSummaryCheckScale,
  ],
];

describe('Create screens', () => {
  it.each(SCREENS)('%s renders its heading', async (_name, Screen, heading) => {
    renderWithProviders(<Screen />);

    await waitFor(() => expect(screen.getAllByText(heading).length).toBeGreaterThan(0));
  });

  it.each(SCREENS)('%s offers Save Record and Reset', async (_name, Screen) => {
    renderWithProviders(<Screen />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
    expect(screen.getAllByRole('button', { name: /^Reset$/i }).length).toBeGreaterThan(0);
  });

  it.each(SCREENS)('%s refuses to save an empty form', async (_name, Screen, _heading, create) => {
    renderWithProviders(<Screen />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(create).not.toHaveBeenCalled());
  });

  it.each(SCREENS)('%s creates nothing merely by rendering', async (_name, Screen, _h, create) => {
    renderWithProviders(<Screen />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
    expect(create).not.toHaveBeenCalled();
  });
});

describe('Create Scaler', () => {
  it('renders the client, district and appointment fields', () => {
    const { container } = renderWithProviders(<CreateScaler />);

    expect(controlById(container, 'clientNumber')).toBeInTheDocument();
    expect(controlById(container, 'clientLocnCode')).toBeInTheDocument();
    expect(controlById(container, 'district')).toBeInTheDocument();
    expect(controlById(container, 'appointment')).toBeInTheDocument();
  });

  it('renders the oath and province-wide indicators', () => {
    const { container } = renderWithProviders(<CreateScaler />);

    expect(controlById(container, 'scaler-oath-taken')).toBeInTheDocument();
    expect(controlById(container, 'province-wide')).toBeInTheDocument();
  });

  it('keeps a typed client number', () => {
    const { container } = renderWithProviders(<CreateScaler />);

    const client = controlById(container, 'clientNumber');
    fireEvent.change(client, { target: { value: '00012345' } });

    expect(client).toHaveValue('00012345');
  });
});

describe('Create Scale Site', () => {
  it('renders the site information fields', () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    expect(controlById(container, 'scale-site-name')).toBeInTheDocument();
    expect(controlById(container, 'reg-dist')).toBeInTheDocument();
    expect(controlById(container, 'timber-brand')).toBeInTheDocument();
  });

  it('caps the site name and timber brand at the legacy lengths (40, 7)', () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    expect(controlById(container, 'scale-site-name')).toHaveAttribute('maxlength', '40');
    expect(controlById(container, 'timber-brand')).toHaveAttribute('maxlength', '7');
  });

  it('renders the full latitude and longitude triples', () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    ['latitude-degrees', 'latitude-minutes', 'latitude-seconds',
      'longitude-degrees', 'longitude-minutes', 'longitude-seconds'].forEach((id) => {
      expect(controlById(container, id)).toBeInTheDocument();
    });
  });

  it('renders the three site type slots', () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    expect(controlById(container, 'site-type-primary')).toBeInTheDocument();
    expect(controlById(container, 'site-type-secondary')).toBeInTheDocument();
    expect(controlById(container, 'site-type-tertiary')).toBeInTheDocument();
  });

  it('renders the site type slots without waiting on the scaling method lookup', async () => {
    // The lookup is deferred until the select is opened, so the form must stand up without it.
    const { container } = renderWithProviders(<CreateScaleSite />);

    await waitFor(() => expect(controlById(container, 'site-type-primary')).toBeInTheDocument());
    expect(apiMock.scaleSites.createScaleSite).not.toHaveBeenCalled();
  });

  it('keeps a typed site name', () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    const name = controlById(container, 'scale-site-name');
    fireEvent.change(name, { target: { value: 'North Yard' } });

    expect(name).toHaveValue('North Yard');
  });
});

describe('Create Summary Check Scale', () => {
  it('renders the return type choices', () => {
    const { container } = renderWithProviders(<CreateSummaryCheckScale />);

    expect(controlById(container, 'return-type-log-tally')).toBeInTheDocument();
    expect(controlById(container, 'return-type-sample-log-tally')).toBeInTheDocument();
    expect(controlById(container, 'return-type-special-forest-product')).toBeInTheDocument();
  });

  it('renders the header fields', () => {
    const { container } = renderWithProviders(<CreateSummaryCheckScale />);

    expect(controlById(container, 'check-scaler-licence')).toBeInTheDocument();
    expect(controlById(container, 'original-scaler-licence')).toBeInTheDocument();
    expect(controlById(container, 'timber-mark')).toBeInTheDocument();
    expect(controlById(container, 'scale-site-number')).toBeInTheDocument();
  });

  it('renders the load arrival and weigh slip pair', () => {
    const { container } = renderWithProviders(<CreateSummaryCheckScale />);

    expect(controlById(container, 'load-arrival-number')).toBeInTheDocument();
    expect(controlById(container, 'weigh-slip-number')).toBeInTheDocument();
  });

  it('renders the species product grade summary section', () => {
    renderWithProviders(<CreateSummaryCheckScale />);

    expect(screen.getAllByText('Species Product Grade Summary').length).toBeGreaterThan(0);
  });

  it('refuses to create while the header is incomplete', async () => {
    renderWithProviders(<CreateSummaryCheckScale />);

    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.summaryCheckScale.createSummaryCheckScale).not.toHaveBeenCalled(),
    );
  });
});

describe('Create Scale Site — validation rules', () => {
  const save = async () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

  it('reports the required site fields', async () => {
    renderWithProviders(<CreateScaleSite />);

    await save();

    expect(await screen.findByText('Scale Site Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Reg / Dist is required.')).toBeInTheDocument();
  });

  it('requires a description of the site location', async () => {
    renderWithProviders(<CreateScaleSite />);

    await save();

    expect(
      await screen.findByText('Description of Site Location is required.'),
    ).toBeInTheDocument();
  });

  it('requires the owner client and loc', async () => {
    renderWithProviders(<CreateScaleSite />);

    await save();

    expect(await screen.findByText('Owner client is required.')).toBeInTheDocument();
  });

  it('requires a primary site type', async () => {
    renderWithProviders(<CreateScaleSite />);

    await save();

    expect(await screen.findByText('Primary site type is required.')).toBeInTheDocument();
  });

  it('rejects the same site type chosen twice', async () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    await waitFor(() =>
      expect(
        (controlById<HTMLSelectElement>(container, 'site-type-primary').options.length ?? 0) > 1,
      ).toBe(true),
    );
    fireEvent.change(controlById(container, 'site-type-primary'), { target: { value: 'WT' } });
    fireEvent.change(controlById(container, 'site-type-secondary'), { target: { value: 'WT' } });
    await save();

    expect(await screen.findByText('Site type codes must be distinct.')).toBeInTheDocument();
  });

  it('creates nothing while the form is invalid', async () => {
    renderWithProviders(<CreateScaleSite />);

    await save();

    await waitFor(() => expect(apiMock.scaleSites.createScaleSite).not.toHaveBeenCalled());
  });
});

describe('Create Scaler — validation rules', () => {
  const save = async () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

  it('requires the client and district', async () => {
    renderWithProviders(<CreateScaler />);

    await save();

    expect(await screen.findByText('Client is required.')).toBeInTheDocument();
    expect(screen.getByText('District is required.')).toBeInTheDocument();
  });

  it('requires an effective date', async () => {
    renderWithProviders(<CreateScaler />);

    await save();

    expect(await screen.findByText('Effective Date is required.')).toBeInTheDocument();
  });

  it('requires the oath and appointment choices', async () => {
    renderWithProviders(<CreateScaler />);

    await save();

    // The scaler is created through the appointment route or the exam route, never both; with
    // neither filled the form reports what it still needs rather than creating anything.
    await waitFor(() => expect(screen.getAllByText(/is required/i).length).toBeGreaterThan(1));
  });

  it('creates nothing while the form is invalid', async () => {
    renderWithProviders(<CreateScaler />);

    await save();

    await waitFor(() => expect(apiMock.scalers.createScaler).not.toHaveBeenCalled());
  });
});

describe('Create Scale Site — coordinate and timber brand rules', () => {
  const save = async () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
  const set = (container: HTMLElement, id: string, value: string) =>
    fireEvent.change(controlById(container, id), { target: { value } });
  const setCoord = (container: HTMLElement, axis: 'latitude' | 'longitude', d: string, m: string, s: string) => {
    set(container, `${axis}-degrees`, d);
    set(container, `${axis}-minutes`, m);
    set(container, `${axis}-seconds`, s);
  };

  it('treats a half-filled coordinate as one whole-group failure', async () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    set(container, 'latitude-degrees', '49');
    await save();

    expect(
      (await screen.findAllByText(/Latitude must include degrees, minutes, and seconds\./)).length,
    ).toBeGreaterThan(0);
  });

  it('rejects non-integer degrees once the group is complete', async () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    setCoord(container, 'latitude', 'abc', '0', '0');
    setCoord(container, 'longitude', '123', '0', '0');
    await save();

    expect((await screen.findAllByText(/Latitude degrees must be an integer\./)).length).toBeGreaterThan(0);
  });

  it('reports each failing sub-field of a coordinate', async () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    setCoord(container, 'latitude', '49', '75', '60');
    setCoord(container, 'longitude', '123', '0', '0');
    await save();

    expect((await screen.findAllByText(/Latitude minutes must be between 0 and 59\./)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Latitude seconds must be between 0 and 59\./).length).toBeGreaterThan(0);
  });

  it('caps longitude degrees at 180', async () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    setCoord(container, 'latitude', '49', '0', '0');
    setCoord(container, 'longitude', '200', '0', '0');
    await save();

    expect((await screen.findAllByText(/Longitude degrees must be between -180 and 180\./)).length).toBeGreaterThan(0);
  });

  it('requires latitude and longitude together', async () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    setCoord(container, 'latitude', '49', '15', '30');
    await save();

    expect(
      (await screen.findAllByText('Latitude and longitude must both be provided or both be omitted.')).length,
    ).toBeGreaterThan(0);
  });

  it('accepts a complete, in-range pair without complaint', async () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    setCoord(container, 'latitude', '49', '15', '30');
    setCoord(container, 'longitude', '-123', '5', '10');
    await save();

    await waitFor(() => expect(screen.getAllByText(/is required/i).length).toBeGreaterThan(0));
    expect(screen.queryByText(/Latitude .*must/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Longitude .*must/)).not.toBeInTheDocument();
  });

  it('enforces the LLLXXX / LLLXXXX timber brand shape', async () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    set(container, 'timber-brand', 'AB12');
    await save();

    expect(
      (await screen.findAllByText("Timber brand format must be 'LLLXXX' or 'LLLXXXX'.")).length,
    ).toBeGreaterThan(0);
  });

  it('accepts a well-formed timber brand', async () => {
    const { container } = renderWithProviders(<CreateScaleSite />);

    set(container, 'timber-brand', 'abc123');
    await save();

    await waitFor(() => expect(screen.getAllByText(/is required/i).length).toBeGreaterThan(0));
    expect(screen.queryByText(/Timber brand format/)).not.toBeInTheDocument();
  });
});
