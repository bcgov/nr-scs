import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import * as authModule from '@/context/auth/useAuth';

import ScalerAuthorizationEditPage from './index';

const mockNavigate = vi.fn();
const mockGetScalerAuthorization = vi.fn();
const mockUpdate = vi.fn();
const mockGetStaticLov = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return Object.assign({}, actual, {
    useNavigate: () => mockNavigate,
    useParams: () => ({ scalerAuthorizationId: '5' }),
  });
});

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    scalerAuthorizations: {
      getScalerAuthorization: (...args: unknown[]) => mockGetScalerAuthorization(...args),
      updateScalerAuthorization: (...args: unknown[]) => mockUpdate(...args),
      searchActiveScaleAuthConditions: vi.fn(),
      getScaleAuthTemplateConditions: vi.fn(),
    },
    lov: { getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args) },
    scaleSites: { searchScaleSites: vi.fn() },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/core/DateInput', () => ({
  default: ({ id, value = '', onChange, ariaLabel, disabled, invalidText }: { id: string; value?: string; onChange?: (v: string) => void; ariaLabel?: string; disabled?: boolean; invalidText?: string }) => (
    <>
      <input id={id} aria-label={ariaLabel ?? id} value={value} disabled={disabled} onChange={(e) => onChange?.(e.target.value)} />
      <span>{invalidText}</span>
    </>
  ),
}));

vi.mock('@/components/core/DistrictSelect', () => ({
  default: ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
    <select aria-label="Reg / Dist" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select</option>
      <option value="1">1</option>
    </select>
  ),
}));

vi.mock('@/components/Form/ActiveMultiSelect', () => ({
  default: ({ id, invalidText }: { id?: string; invalidText?: string }) => (
    <div data-testid={id ?? 'active-multi-select'}>{invalidText}</div>
  ),
}));

vi.mock('@/components/Form/AuthorizationConditionsSection', () => ({
  default: () => <div>Authorization Conditions</div>,
}));

vi.mock('@/components/Form/TableResource', () => ({
  default: () => <div>Scale Sites Table</div>,
}));

vi.mock('@/components/Modal/ScaleSiteSearchModal', () => ({
  default: () => <div />,
}));

const baseDetail = {
  scalerAuthorizationId: 5,
  scalerLicenceNo: '8437',
  orgUnitNo: 1,
  districtWideInd: 'Y',
  authorizationEffectiveDate: '2026-01-01',
  authorizationExpiryDate: '2026-12-31',
  letterExists: false,
  jobFunctions: ['P'],
  authForestProducts: [],
  scaleSites: [],
  conditions: [],
};

const licenceInput = () => document.getElementById('authorized-scaler-licence') as HTMLInputElement;
const districtWideSelect = () => document.getElementById('district-wide') as HTMLSelectElement;

describe('ScalerAuthorizationEditPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const authValue = (): AuthContextType => ({
    user: undefined,
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  const renderEdit = (detail: Record<string, unknown>) => {
    mockGetScalerAuthorization.mockResolvedValue(detail);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ScalerAuthorizationEditPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetScalerAuthorization.mockReset();
    mockUpdate.mockReset();
    mockUpdate.mockResolvedValue({ scalerAuthorizationId: 5 });
    mockGetStaticLov.mockReset();
    mockGetStaticLov.mockResolvedValue([]);
    mockUseAuth.mockReturnValue(authValue());
  });

  it('loads the record and populates the form fields', async () => {
    renderEdit({ ...baseDetail });

    await waitFor(() => expect(licenceInput()).toHaveValue('8437'));
    expect(screen.getByLabelText('Expiry Date')).toHaveValue('2026-12-31');
    expect(districtWideSelect()).toHaveValue('Y');
  });

  it('letter-lock disables everything except Cancellation Date and Reason', async () => {
    renderEdit({ ...baseDetail, letterExists: true });

    await waitFor(() => expect(licenceInput()).toBeDisabled());
    // Expiry is locked once a letter exists — only cancellation fields stay editable.
    expect(screen.getByLabelText('Expiry Date')).toBeDisabled();
    expect(screen.getByLabelText('Cancellation Date')).not.toBeDisabled();
    expect(screen.getByLabelText('Cancellation Reason')).not.toBeDisabled();
  });

  it('letter-lock saves even with the other fields blank (cancellation fields are optional)', async () => {
    // A letter-locked record whose other fields are blank must still save — nothing is required.
    renderEdit({
      ...baseDetail,
      letterExists: true,
      scalerLicenceNo: '',
      orgUnitNo: null,
      districtWideInd: '',
      authorizationEffectiveDate: '',
      authorizationExpiryDate: '2026-12-31',
      jobFunctions: [],
    });

    await waitFor(() => expect(licenceInput()).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith('/scaler-authorizations/view/5');
  });

  it('letter-lock lets the user record a cancellation and saves it', async () => {
    renderEdit({ ...baseDetail, letterExists: true });

    await waitFor(() => expect(licenceInput()).toBeDisabled());
    fireEvent.change(screen.getByLabelText('Cancellation Date'), { target: { value: '2026-06-30' } });
    fireEvent.change(screen.getByLabelText('Cancellation Reason'), { target: { value: 'No longer active' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const payload = mockUpdate.mock.calls[0][1];
    expect(payload).toMatchObject({ cancellationDate: '2026-06-30', cancellationReasonTxt: 'No longer active' });
    expect(mockNavigate).toHaveBeenCalledWith('/scaler-authorizations/view/5');
  });

  it('non-letter validation delegates to the create rules (blank licence blocks save)', async () => {
    renderEdit({ ...baseDetail }); // letterExists:false, districtWide Y, has a job function

    await waitFor(() => expect(licenceInput()).toHaveValue('8437'));
    fireEvent.change(licenceInput(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => expect(screen.getByText('Licence # is required')).toBeInTheDocument());
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('Reset restores the loaded snapshot (not blanks)', async () => {
    renderEdit({ ...baseDetail });

    await waitFor(() => expect(licenceInput()).toHaveValue('8437'));
    fireEvent.change(licenceInput(), { target: { value: '9999' } });
    expect(licenceInput()).toHaveValue('9999');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(licenceInput()).toHaveValue('8437');
  });

  it('switching District Wide to No reveals the Scale Sites section', async () => {
    renderEdit({ ...baseDetail, districtWideInd: 'Y' });

    await waitFor(() => expect(districtWideSelect()).toHaveValue('Y'));
    expect(screen.queryByText('Scale Sites')).not.toBeInTheDocument();

    fireEvent.change(districtWideSelect(), { target: { value: 'N' } });

    expect(screen.getByText('Scale Sites')).toBeInTheDocument();
    expect(document.getElementById('scale-site-number')).toBeInTheDocument();
  });
});
