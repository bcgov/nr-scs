import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';
import API from '@/services/APIs';

import ScalerAuthorizationCreatePage from './index';

const mockNavigate = vi.fn();
const mockGetStaticLov = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return Object.assign({}, actual, {
    useNavigate: () => mockNavigate,
  });
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
    },
    scalerAuthorizations: {
      createScalerAuthorization: vi.fn(),
      searchActiveScaleAuthConditions: vi.fn(),
      getScaleAuthTemplateConditions: vi.fn(),
    },
    scaleSites: {
      searchScaleSites: vi.fn(),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

// invalidText is rendered alongside the control so date/district validation messages stay
// assertable — the real components surface it, but the headless stand-ins must too.
vi.mock('@/components/core/DateInput', () => ({
  default: ({ id, value = '', onChange, ariaLabel, invalidText }: { id: string; value?: string; onChange?: (value: string) => void; ariaLabel?: string; invalidText?: string }) => (
    <>
      <input id={id} aria-label={ariaLabel ?? id} value={value} onChange={(e) => onChange?.(e.target.value)} />
      <span>{invalidText}</span>
    </>
  ),
}));

vi.mock('@/components/core/DistrictSelect', () => ({
  default: ({ value, onChange, invalidText }: { value: string; onChange: (value: string) => void; invalidText?: string }) => (
    <>
      <select aria-label="Reg / Dist" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        <option value="1">1</option>
      </select>
      <span>{invalidText}</span>
    </>
  ),
}));

vi.mock('@/components/Form/ActiveMultiSelect', () => ({
  // Render the id + invalidText so field-level validation messages are assertable (the real Carbon
  // FilterableMultiSelect can't be driven headlessly here). Each LOV item also gets a plain button
  // that appends it to the selection, so selection-dependent rules (e.g. the SFP rule, which only
  // applies once job function 'S' is picked) can be driven.
  default: ({ id, items, selectedItems, onChange, invalidText }: {
    id?: string;
    items?: Array<{ code?: string | null; description?: string | null }>;
    selectedItems?: Array<{ code?: string | null }>;
    onChange?: (event: { selectedItems: Array<{ code?: string | null }> }) => void;
    invalidText?: string;
  }) => (
    <div data-testid={id ?? 'active-multi-select'}>
      {(items ?? []).map((item) => (
        <button
          key={String(item.code)}
          type="button"
          onClick={() => onChange?.({ selectedItems: [...(selectedItems ?? []), item] })}
        >
          {`pick ${id}:${item.code}`}
        </button>
      ))}
      <span>{invalidText}</span>
    </div>
  ),
}));

vi.mock('@/components/Form/AuthorizationConditionsSection', () => ({
  default: () => <div>Authorization Conditions</div>,
}));

vi.mock('@/components/Form/ScaleSitesSection', () => ({
  __esModule: true,
  default: (props: { districtWideInd: string; invalid?: boolean; sectionError?: string | null; invalidText?: string }) => (
    <div
      data-testid="scale-sites-section"
      data-district-wide={props.districtWideInd}
      data-invalid={props.invalid ? 'true' : 'false'}
      data-section-error={props.sectionError ?? ''}
    >
      Scale Sites
      <span>{props.invalidText}</span>
    </div>
  ),
}));

vi.mock('@/components/Modal/ScalerSearchModal', () => ({
  default: () => <div />,
}));

vi.mock('@/components/Modal/ScaleSiteSearchModal', () => ({
  default: () => <div />,
}));

describe('ScalerAuthorizationCreatePage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const createAuthContextValue = (): AuthContextType => ({
    // An administrator, so permission-gated controls render: these tests are about the
    // component behaviour, not authorization (see permissions.unit.test.ts for that).
    user: { roles: [SYS_ADMIN_ROLE], privileges: { [SYS_ADMIN_ROLE]: null } },
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetStaticLov.mockReset();
    mockGetStaticLov.mockImplementation(async ({ tableKey }: { tableKey: string }) =>
      tableKey === 'SCALE_METHOD_TYPE_CODE'
        ? [
            { code: 'P', description: 'Piece Scaling' },
            { code: 'S', description: 'Special Forest Products' },
          ]
        : [{ code: 'SHAKE', description: 'Shake Blocks' }],
    );
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  const renderCreate = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ScalerAuthorizationCreatePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  /** Fills the five "basics" the Add Conditions gate requires. */
  const fillBasics = (overrides: Partial<Record<'licence' | 'effective' | 'expiry' | 'regDist' | 'districtWide', string>> = {}) => {
    const values = {
      licence: '8437',
      effective: '2026-01-01',
      expiry: '2026-12-31',
      regDist: '1',
      districtWide: 'Y',
      ...overrides,
    };
    fireEvent.change(document.getElementById('authorized-scaler-licence') as HTMLInputElement, { target: { value: values.licence } });
    fireEvent.change(screen.getByLabelText('Effective Date'), { target: { value: values.effective } });
    fireEvent.change(screen.getByLabelText('Expiry Date'), { target: { value: values.expiry } });
    fireEvent.change(screen.getByLabelText('Reg / Dist'), { target: { value: values.regDist } });
    fireEvent.change(document.getElementById('district-wide') as HTMLSelectElement, { target: { value: values.districtWide } });
  };

  /** Passes the Add Conditions gate and waits for the Save Record button to appear. */
  const openConditions = async () => {
    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Record' })).toBeInTheDocument());
  };

  it('reveals the shared Scale Sites section when the advanced area opens', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ScalerAuthorizationCreatePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(document.getElementById('authorized-scaler-licence') as HTMLInputElement, { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText('Effective Date'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Expiry Date'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Reg / Dist'), { target: { value: '1' } });
    fireEvent.change(document.getElementById('district-wide') as HTMLSelectElement, { target: { value: 'N' } });

    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));

    await waitFor(() => {
      expect(screen.getByTestId('scale-sites-section')).toBeInTheDocument();
    });

    expect(screen.getByTestId('scale-sites-section')).toHaveAttribute('data-district-wide', 'N');
  });

  it('prefills the licence from the ?scalerLicenceNo query parameter', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/scaler-authorizations/create?scalerLicenceNo=12345678']}>
          <ScalerAuthorizationCreatePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(document.getElementById('authorized-scaler-licence')).toHaveValue('12345678');
  });

  it('blocks Add Conditions and flags the missing licence when basics are empty', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ScalerAuthorizationCreatePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));

    // Basics validation fired (licence is a real Carbon field → its invalidText renders)…
    expect(screen.getByText('Licence # is required')).toBeInTheDocument();
    // …and the Conditions area did NOT open, so there is no Save Record yet.
    expect(screen.queryByRole('button', { name: 'Save Record' })).not.toBeInTheDocument();
  });

  it('blocks Save with job-function and scale-site errors when District Wide is No', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ScalerAuthorizationCreatePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(document.getElementById('authorized-scaler-licence') as HTMLInputElement, { target: { value: '8437' } });
    fireEvent.change(screen.getByLabelText('Effective Date'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Expiry Date'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Reg / Dist'), { target: { value: '1' } });
    fireEvent.change(document.getElementById('district-wide') as HTMLSelectElement, { target: { value: 'N' } });

    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Record' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => {
      expect(screen.getByText('At least one Job Function is required.')).toBeInTheDocument();
    });
    expect(
      screen.getByText('At least one Scale Site is required when District Wide is No.'),
    ).toBeInTheDocument();
    // validate() failed → no create request, no navigation.
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('flags every missing basic on the Add Conditions gate, not just the licence', () => {
    renderCreate();

    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));

    expect(screen.getByText('Licence # is required')).toBeInTheDocument();
    expect(screen.getByText('Effective Date is required.')).toBeInTheDocument();
    expect(screen.getByText('Expiry Date is required.')).toBeInTheDocument();
    expect(screen.getByText('Reg / Dist is required.')).toBeInTheDocument();
    expect(screen.getByText('District Wide is required.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Record' })).not.toBeInTheDocument();
  });

  it('requires District Wide even when every other basic is filled', () => {
    renderCreate();

    fillBasics({ districtWide: '' });
    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));

    expect(screen.getByText('District Wide is required.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Record' })).not.toBeInTheDocument();
  });

  it('rejects an expiry date that is not after the effective date', () => {
    renderCreate();

    fillBasics({ effective: '2026-06-01', expiry: '2026-01-01' });
    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));

    expect(screen.getByText('Expiry Date must be after Effective Date.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Record' })).not.toBeInTheDocument();
  });

  it('rejects an expiry date equal to the effective date', () => {
    renderCreate();

    fillBasics({ effective: '2026-06-01', expiry: '2026-06-01' });
    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));

    // The rule is strictly-after: equal dates are invalid.
    expect(screen.getByText('Expiry Date must be after Effective Date.')).toBeInTheDocument();
  });

  it('rejects an unparseable date', () => {
    renderCreate();

    fillBasics({ effective: 'not-a-date' });
    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));

    expect(screen.getByText('Effective Date is not a valid date.')).toBeInTheDocument();
  });

  it('requires a Special Forest Product once the SFP job function is selected', async () => {
    renderCreate();

    fillBasics();
    await openConditions();

    // Pick job function 'S' (Special Forest Products) but no product.
    fireEvent.click(await screen.findByRole('button', { name: 'pick job-functions:S' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => {
      expect(
        screen.getByText('At least one Special Forest Product is required when Special Forest Product is selected.'),
      ).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not require a Special Forest Product for a non-SFP job function', async () => {
    renderCreate();

    fillBasics();
    await openConditions();

    fireEvent.click(await screen.findByRole('button', { name: 'pick job-functions:P' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => {
      expect(
        screen.queryByText('At least one Special Forest Product is required when Special Forest Product is selected.'),
      ).not.toBeInTheDocument();
    });
    // Piece scaling alone clears the job-function rule too.
    expect(screen.queryByText('At least one Job Function is required.')).not.toBeInTheDocument();
  });

  it('clears the SFP error once a product is picked', async () => {
    renderCreate();

    fillBasics();
    await openConditions();

    fireEvent.click(await screen.findByRole('button', { name: 'pick job-functions:S' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));
    await waitFor(() =>
      expect(
        screen.getByText('At least one Special Forest Product is required when Special Forest Product is selected.'),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'pick sfp-products:SHAKE' }));

    await waitFor(() =>
      expect(
        screen.queryByText('At least one Special Forest Product is required when Special Forest Product is selected.'),
      ).not.toBeInTheDocument(),
    );
  });

  it('clears the cached authorization lists so the new record shows on return, then navigates', async () => {
    // Regression: with the global refetchOnMount:false + 3h staleTime, the scaler's Authorizations
    // tab served a stale cached list on the way back, hiding the just-created record until a full
    // app refresh. The create must drop those caches so the tab refetches when reopened.
    const client = new QueryClient();
    const removeSpy = vi.spyOn(client, 'removeQueries');
    vi.mocked(API.scalerAuthorizations.createScalerAuthorization).mockResolvedValue({
      scalerAuthorizationId: 777,
    } as never);

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ScalerAuthorizationCreatePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fillBasics({ licence: '8437', districtWide: 'Y' });
    await openConditions();
    fireEvent.click(await screen.findByRole('button', { name: 'pick job-functions:P' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/scaler-authorizations/view/777'));
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['scaler-authorizations', '8437'] });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['workbench', 'scaler-authorizations'] });
  });
});
