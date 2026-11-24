import { fireEvent, screen, waitFor } from '@testing-library/react';
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

import CreateScaleSiteAuthorization from './index';

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
});

const renderPage = () => renderWithProviders(<CreateScaleSiteAuthorization />);
const addConditions = async () =>
  userEvent.click(screen.getByRole('button', { name: /Add Conditions/i }));

describe('Create Scale Site Authorization', () => {
  it('renders the authorization fields', () => {
    const { container } = renderPage();

    expect(controlById(container, 'scale-site-number')).toBeInTheDocument();
    expect(controlById(container, 'effective-date')).toBeInTheDocument();
    expect(controlById(container, 'expiry-date')).toBeInTheDocument();
    expect(controlById(container, 'expected-annual-scale-volume')).toBeInTheDocument();
  });

  it('shows Add Conditions before the conditions section is open', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /Add Conditions/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Record/i })).not.toBeInTheDocument();
  });

  it('reports every required field on an empty form', async () => {
    renderPage();

    await addConditions();

    expect(await screen.findByText('Scale Site # is required.')).toBeInTheDocument();
    expect(screen.getByText('Effective Date is required.')).toBeInTheDocument();
    expect(screen.getByText('Expiry Date is required.')).toBeInTheDocument();
    expect(screen.getByText('Expected Annual Scale Volume is required.')).toBeInTheDocument();
  });

  it('rejects a non-numeric expected volume', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scale-site-number'), { target: { value: 'SS-1' } });
    fireEvent.change(controlById(container, 'effective-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2026-12-31' } });
    fireEvent.change(controlById(container, 'expected-annual-scale-volume'), {
      target: { value: 'lots' },
    });
    await addConditions();

    expect(
      await screen.findByText('Expected Annual Scale Volume must be a number.'),
    ).toBeInTheDocument();
  });

  it('rejects an expiry date that is not after the effective date', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scale-site-number'), { target: { value: 'SS-1' } });
    fireEvent.change(controlById(container, 'effective-date'), { target: { value: '2026-12-31' } });
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'expected-annual-scale-volume'), {
      target: { value: '100' },
    });
    await addConditions();

    expect(
      await screen.findByText('Expiry Date must be after Effective Date.'),
    ).toBeInTheDocument();
  });

  it('creates nothing while the form is invalid', async () => {
    renderPage();

    await addConditions();

    await waitFor(() =>
      expect(
        apiMock.scaleSiteAuthorizations.createScaleSiteAuthorization,
      ).not.toHaveBeenCalled(),
    );
  });

  it('opens the conditions section once the basics are valid', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scale-site-number'), { target: { value: 'SS-1' } });
    fireEvent.change(controlById(container, 'effective-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2026-12-31' } });
    fireEvent.change(controlById(container, 'expected-annual-scale-volume'), {
      target: { value: '100' },
    });
    await addConditions();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
  });

  it('accepts a zero expected volume', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scale-site-number'), { target: { value: 'SS-1' } });
    fireEvent.change(controlById(container, 'effective-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2026-12-31' } });
    fireEvent.change(controlById(container, 'expected-annual-scale-volume'), {
      target: { value: '0' },
    });
    await addConditions();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
  });

  it('clears the form on reset', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scale-site-number'), { target: { value: 'SS-1' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Reset$/i })[0]);

    await waitFor(() => expect(controlById(container, 'scale-site-number')).toHaveValue(''));
  });
});

describe('Create Scale Site Authorization — through to save', () => {
  const fillAndOpen = async (container: HTMLElement) => {
    fireEvent.change(controlById(container, 'scale-site-number'), { target: { value: 'ss-1' } });
    fireEvent.change(controlById(container, 'effective-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2026-12-31' } });
    fireEvent.change(controlById(container, 'expected-annual-scale-volume'), { target: { value: '100' } });
    await addConditions();
    await waitFor(() => expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument());
  };

  it('creates the authorization and opens the new record', async () => {
    apiMock.scaleSiteAuthorizations.createScaleSiteAuthorization.mockResolvedValue({ scaleSiteAuthorizationId: 9 });
    const { container } = renderPage();

    await fillAndOpen(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.scaleSiteAuthorizations.createScaleSiteAuthorization).toHaveBeenCalled());
    const [payload] = apiMock.scaleSiteAuthorizations.createScaleSiteAuthorization.mock.calls[0];
    // The site number is upper-cased and the volume sent as a number, not the typed string.
    expect(payload).toMatchObject({ scaleSiteIdNmbr: 'SS-1', expectedScaleVolume: 100, authorizationEffectiveDate: '2026-01-01' });
    expect(navigate).toHaveBeenCalledWith('/scale-site-authorizations/view/9');
  });

  it('stays on the form when the create returns no id', async () => {
    apiMock.scaleSiteAuthorizations.createScaleSiteAuthorization.mockResolvedValue({});
    const { container } = renderPage();

    await fillAndOpen(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.scaleSiteAuthorizations.createScaleSiteAuthorization).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports a failed create and keeps the entered values', async () => {
    apiMock.scaleSiteAuthorizations.createScaleSiteAuthorization.mockRejectedValue(new Error('Create refused.'));
    const { container } = renderPage();

    await fillAndOpen(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText(/Create refused\./i)).length).toBeGreaterThan(0);
    expect(controlById(container, 'expected-annual-scale-volume')).toHaveValue('100');
    expect(navigate).not.toHaveBeenCalled();
  });
});
