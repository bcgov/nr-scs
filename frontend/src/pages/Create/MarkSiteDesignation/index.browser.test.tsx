import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import MarkSiteDesignationCreateForm from './index';

const mockNavigate = vi.fn();
const mockGetStaticLov = vi.fn();
const mockScaleSitesSection = vi.fn();
const mockLookup = vi.fn();
const mockCreate = vi.fn();
const mockSearchScaleSites = vi.fn();

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
    markSiteDesignation: {
      getMarkSiteDesignationTimberMarkLookup: (...args: unknown[]) => mockLookup(...args),
      createMarkSiteDesignation: (...args: unknown[]) => mockCreate(...args),
    },
    scaleSites: {
      searchScaleSites: (...args: unknown[]) => mockSearchScaleSites(...args),
    },
    scalerAuthorizations: {
      searchActiveScaleAuthConditions: vi.fn(),
      getScaleAuthTemplateConditions: vi.fn(),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/core/DateInput', () => ({
  default: ({ id, value = '', onChange, ariaLabel }: { id: string; value?: string; onChange?: (value: string) => void; ariaLabel?: string }) => (
    <input id={id} aria-label={ariaLabel ?? id} value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

vi.mock('@/components/core/DistrictSelect', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <select aria-label="Reg / Dist" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select</option>
      <option value="100">100</option>
    </select>
  ),
}));

vi.mock('@/components/Form/ActiveMultiSelect', () => ({
  default: () => <div>Active Multi Select</div>,
}));

vi.mock('@/components/Form/AuthorizationConditionsSection', () => ({
  default: () => <div>Authorization Conditions</div>,
}));

// Mirrors the stub in the edit screen's test: the Site # input and Add button are exposed so the
// add-by-number flow (and the errors it raises) is drivable from here, not just the section's presence.
vi.mock('@/components/Form/ScaleSitesSection', () => ({
  __esModule: true,
  default: (props: {
    districtWideInd: string;
    invalid?: boolean;
    invalidText?: string;
    sectionError?: string | null;
    scaleSiteInput?: string;
    scaleSites?: { scaleSiteIdNmbr: string; siteName: string | null }[];
    onScaleSiteInputChange?: (value: string) => void;
    onAddScaleSite?: () => void;
  }) => (
    <div
      data-testid="scale-sites-section"
      data-district-wide={props.districtWideInd}
      data-invalid={props.invalid ? 'true' : 'false'}
      data-invalidtext={props.invalidText ?? ''}
      data-section-error={props.sectionError ?? ''}
    >
      Scale Sites
      <input
        aria-label="Site #"
        value={props.scaleSiteInput ?? ''}
        onChange={(e) => props.onScaleSiteInputChange?.(e.target.value)}
      />
      <button type="button" onClick={() => props.onAddScaleSite?.()}>
        Add Scale Site
      </button>
      <ul>
        {(props.scaleSites ?? []).map((s) => (
          <li key={s.scaleSiteIdNmbr}>{s.scaleSiteIdNmbr}</li>
        ))}
      </ul>
    </div>
  ),
}));

vi.mock('@/components/Modal/ScaleSiteSearchModal', () => ({
  default: () => <div />,
}));

describe('MarkSiteDesignationCreateForm', () => {
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
    mockGetStaticLov.mockResolvedValue([]);
    mockScaleSitesSection.mockReset();
    mockSearchScaleSites.mockReset();
    mockSearchScaleSites.mockResolvedValue([]);
    mockLookup.mockReset();
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({ haulingMarkAuthorizationId: 999 });
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('reveals the shared Scale Sites section when the advanced area opens', async () => {
    render(
      <MemoryRouter>
        <MarkSiteDesignationCreateForm />
      </MemoryRouter>,
    );

    fireEvent.change(document.getElementById('timber-mark') as HTMLInputElement, { target: { value: 'ABC123' } });
    fireEvent.change(screen.getByLabelText('Effective Date'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Expiry Date'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Reg / Dist'), { target: { value: '100' } });
    fireEvent.change(document.getElementById('district-wide') as HTMLSelectElement, { target: { value: 'N' } });

    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));

    await waitFor(() => {
      expect(screen.getByTestId('scale-sites-section')).toBeInTheDocument();
    });

    expect(screen.getByTestId('scale-sites-section')).toHaveAttribute('data-district-wide', 'N');
  });

  it('rejects a scale site that is already in the list with the legacy message', async () => {
    // Create carried the identical silent de-dup as the edit screen (QA reported only edit). Adding the
    // same site twice returned `prev` and then cleared the input, so it looked like the add had worked.
    mockSearchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: '1006', siteName: 'Existing Site' }]);

    render(
      <MemoryRouter>
        <MarkSiteDesignationCreateForm />
      </MemoryRouter>,
    );

    fireEvent.change(document.getElementById('timber-mark') as HTMLInputElement, { target: { value: 'ABC123' } });
    fireEvent.change(screen.getByLabelText('Effective Date'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Expiry Date'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Reg / Dist'), { target: { value: '100' } });
    fireEvent.change(document.getElementById('district-wide') as HTMLSelectElement, { target: { value: 'N' } });
    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));

    await waitFor(() => {
      expect(screen.getByTestId('scale-sites-section')).toBeInTheDocument();
    });

    // First add succeeds.
    fireEvent.change(screen.getByLabelText('Site #'), { target: { value: '1006' } });
    fireEvent.click(screen.getByRole('button', { name: /add scale site/i }));
    await waitFor(() => {
      expect(screen.getByText('1006')).toBeInTheDocument();
    });

    // Second add of the same site is rejected rather than swallowed.
    fireEvent.change(screen.getByLabelText('Site #'), { target: { value: '1006' } });
    fireEvent.click(screen.getByRole('button', { name: /add scale site/i }));

    await waitFor(() => {
      expect(screen.getByTestId('scale-sites-section')).toHaveAttribute(
        'data-invalidtext',
        'The Scale Site 1006 has already been added.',
      );
    });
    expect(screen.getAllByText('1006')).toHaveLength(1);
    expect(screen.getByLabelText('Site #')).toHaveValue('1006');
  });

  it('surfaces the timber-mark lookup error immediately (before any save attempt)', async () => {
    // Regression lock for the error-banner gate fix: a failed "Update Timber Mark" lookup sets formError,
    // and the banner now renders on formError alone (formerly gated behind submitAttempted, so it was hidden
    // until Save). Clicking Update — with no Save/Add-Conditions — must reveal the error banner.
    mockLookup.mockRejectedValue({ response: { status: 404, data: { message: 'not found' } } });

    render(
      <MemoryRouter>
        <MarkSiteDesignationCreateForm />
      </MemoryRouter>,
    );

    fireEvent.change(document.getElementById('timber-mark') as HTMLInputElement, { target: { value: 'ZZZQ999' } });
    fireEvent.click(screen.getByRole('button', { name: /update timber mark/i }));

    await waitFor(() => {
      expect(screen.getByText('Please fix the errors below.')).toBeInTheDocument();
    });
    // The create write must not have fired (this is a lookup, not a save).
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // ERR-019..ERR-022 (catalogued on UC-MSD-002; the legacy validator ran on both paths). The screens
  // had no length rule, so an over-length value only produced the generic "Please fix the errors
  // below." banner with no field named. The gate is "Add Conditions" here, because all four fields
  // live in the first section — the same place the Est. Volume / Est. Truck Loads checks run.
  it.each([
    ['geographic-location', 41, 'Geographic Location can not be greater than 40 characters.'],
    ['timber-description', 41, 'Timber Description can not be greater than 40 characters.'],
    ['transportation-date-desc', 201, 'Transportation Date Desc can not be greater than 200 characters.'],
    ['other-requirements', 4001, 'Other Requirements can not be greater than 4000 characters.'],
  ])('blocks Add Conditions and names the field when %s exceeds its limit', async (domId, length, message) => {
    render(
      <MemoryRouter>
        <MarkSiteDesignationCreateForm />
      </MemoryRouter>,
    );

    fireEvent.change(document.getElementById('timber-mark') as HTMLInputElement, { target: { value: 'ABC123' } });
    fireEvent.change(screen.getByLabelText('Effective Date'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Expiry Date'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Reg / Dist'), { target: { value: '100' } });
    fireEvent.change(document.getElementById('district-wide') as HTMLSelectElement, { target: { value: 'Y' } });
    fireEvent.change(document.getElementById(domId) as HTMLTextAreaElement, {
      target: { value: 'X'.repeat(length) },
    });

    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));

    await waitFor(() => {
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    // The advanced section stays shut and nothing is created.
    expect(screen.queryByRole('button', { name: /save record/i })).not.toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('lets a free-text value that is exactly at its limit through to the create payload', async () => {
    render(
      <MemoryRouter>
        <MarkSiteDesignationCreateForm />
      </MemoryRouter>,
    );

    fireEvent.change(document.getElementById('timber-mark') as HTMLInputElement, { target: { value: 'ABC123' } });
    fireEvent.change(screen.getByLabelText('Effective Date'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Expiry Date'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Reg / Dist'), { target: { value: '100' } });
    fireEvent.change(document.getElementById('district-wide') as HTMLSelectElement, { target: { value: 'Y' } });
    fireEvent.change(document.getElementById('geographic-location') as HTMLTextAreaElement, {
      target: { value: 'X'.repeat(40) },
    });

    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /save record/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect((mockCreate.mock.calls[0][0] as Record<string, unknown>).geographicLocation).toBe('X'.repeat(40));
  });

  it('sends an exceptions array in the create payload (Exceptions wired end-to-end)', async () => {
    render(
      <MemoryRouter>
        <MarkSiteDesignationCreateForm />
      </MemoryRouter>,
    );

    // District Wide=Y so no scale site is required to reach Save.
    fireEvent.change(document.getElementById('timber-mark') as HTMLInputElement, { target: { value: 'ABC123' } });
    fireEvent.change(screen.getByLabelText('Effective Date'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Expiry Date'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Reg / Dist'), { target: { value: '100' } });
    fireEvent.change(document.getElementById('district-wide') as HTMLSelectElement, { target: { value: 'Y' } });

    fireEvent.click(screen.getByRole('button', { name: /add conditions/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /save record/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /save record/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());

    // Exceptions are now wired (legacy Exemptions parity; former MSD Divergence #4). With the mocked
    // multi-select nothing is selected, so the create payload carries an empty `exceptions` array
    // rather than dropping the field. The legacy `exemptions`/`selectedExceptions` shapes are not sent.
    const createPayload = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(createPayload).toHaveProperty('exceptions');
    expect(createPayload.exceptions).toEqual([]);
    expect(createPayload).not.toHaveProperty('exemptions');
    expect(createPayload).not.toHaveProperty('selectedExceptions');
  });
});
