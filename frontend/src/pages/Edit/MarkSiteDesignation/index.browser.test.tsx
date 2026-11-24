import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import * as authModule from '@/context/auth/useAuth';
import type { MarkSiteDesignationDetail } from '@/services/markSiteDesignation.service';

import MarkSiteDesignationEditPage from './index';

const mockNavigate = vi.fn();
const mockGetMarkSiteDesignation = vi.fn();
const mockUpdateMarkSiteDesignation = vi.fn();
const mockGetStaticLov = vi.fn();
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
    markSiteDesignation: {
      getMarkSiteDesignation: (...args: unknown[]) => mockGetMarkSiteDesignation(...args),
      updateMarkSiteDesignation: (...args: unknown[]) => mockUpdateMarkSiteDesignation(...args),
    },
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
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
  default: ({ id, value = '', onChange, ariaLabel, disabled, invalid, invalidText }: { id: string; value?: string; onChange?: (value: string) => void; ariaLabel?: string; disabled?: boolean; invalid?: boolean; invalidText?: string }) => (
    <>
      <input id={id} aria-label={ariaLabel ?? id} value={value} disabled={disabled} onChange={(e) => onChange?.(e.target.value)} />
      {invalid && invalidText ? <div>{invalidText}</div> : null}
    </>
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

vi.mock('@/components/Form/ScaleSitesSection', () => ({
  default: (props: {
    districtWideInd: string;
    invalid?: boolean;
    invalidText?: string;
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

const makeDetail = (overrides: Partial<MarkSiteDesignationDetail> = {}): MarkSiteDesignationDetail => ({
  haulingMarkAuthorizationId: 42,
  timberMark: 'TM-001',
  markHolderClient: 'CLIENT1',
  markHolderLoc: 'LOC1',
  markHolderName: 'Test Holder',
  markStatus: 'ACTIVE',
  effectiveDate: '2026-01-01',
  expiryDate: '2026-12-31',
  orgUnitNo: 100,
  districtWideInd: 'N',
  letterExists: false,
  geographicLocation: 'South Valley',
  population: null,
  estimatedVolume: null,
  estimatedTruckLoads: null,
  timberDescription: null,
  transportationDateDesc: null,
  otherRequirements: null,
  scaleSites: [],
  speciesContent: [],
  conditions: [],
  ...overrides,
});

const renderPage = (id = '42') =>
  render(
    <MemoryRouter initialEntries={[`/mark-site-designations/edit/${id}`]}>
      <Routes>
        <Route path="/mark-site-designations/edit/:authorizationId" element={<MarkSiteDesignationEditPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('MarkSiteDesignationEditPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const authContext = (): AuthContextType => ({
    user: undefined,
    isLoggedIn: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    userToken: vi.fn().mockResolvedValue('token'),
  });

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetMarkSiteDesignation.mockReset();
    mockUpdateMarkSiteDesignation.mockReset();
    mockSearchScaleSites.mockReset();
    mockGetStaticLov.mockReset();
    // The Exceptions multi-select is populated from the EXEMPT_MARK_METHOD_CODE LOV; return one option
    // so the edit page can resolve a saved exception code back to its LOV item on load.
    mockGetStaticLov.mockImplementation((params: { tableKey?: string }) =>
      Promise.resolve(
        params?.tableKey === 'EXEMPT_MARK_METHOD_CODE'
          ? [{ code: '21', description: 'Exception 21' }]
          : [],
      ));
    mockUseAuth.mockReturnValue(authContext());
  });

  it('loads the record and populates form fields', async () => {
    mockGetMarkSiteDesignation.mockResolvedValue(makeDetail());

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/expiry date/i)).toHaveValue('2026-12-31');
    });

    expect(screen.getByLabelText(/effective date/i)).toHaveValue('2026-01-01');
    expect(screen.getByLabelText(/reg \/ dist/i)).toHaveValue('100');
  });

  it('renders the letter-locked banner and disables non-expiry inputs when letterExists is true', async () => {
    mockGetMarkSiteDesignation.mockResolvedValue(makeDetail({ letterExists: true }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/letter has been issued/i)).toBeInTheDocument();
    });

    // Effective date input should be disabled
    expect(screen.getByLabelText(/effective date/i)).toBeDisabled();

    // Expiry date input should remain enabled
    expect(screen.getByLabelText(/expiry date/i)).not.toBeDisabled();
  });

  it('clears scale sites when District Wide is set to Y', async () => {
    mockGetMarkSiteDesignation.mockResolvedValue(
      makeDetail({
        districtWideInd: 'N',
        scaleSites: [{ scaleSiteIdNmbr: 'SS-001', siteName: 'Test Site' }],
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('scale-sites-section')).toHaveAttribute('data-district-wide', 'N');
    });

    fireEvent.change(document.getElementById('district-wide') as HTMLSelectElement, {
      target: { value: 'Y' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('scale-sites-section')).toHaveAttribute('data-district-wide', 'Y');
    });
  });

  it('calls updateMarkSiteDesignation and navigates on successful save', async () => {
    // District Wide=Y so the ≥1-scale-site rule (validateSave) does not apply.
    mockGetMarkSiteDesignation.mockResolvedValue(makeDetail({ districtWideInd: 'Y' }));
    mockUpdateMarkSiteDesignation.mockResolvedValue(makeDetail({ districtWideInd: 'Y' }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/expiry date/i)).toHaveValue('2026-12-31');
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateMarkSiteDesignation).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ expiryDate: '2026-12-31' }),
        'token',
      );
    });

    // Exceptions are now wired end-to-end (legacy Exemptions parity; former MSD Divergence #4). With
    // nothing selected the update payload carries an empty `exceptions` array rather than dropping the
    // field. The legacy `exemptions`/`selectedExceptions` shapes are still never sent.
    const updatePayload = mockUpdateMarkSiteDesignation.mock.calls[0][1] as Record<string, unknown>;
    expect(updatePayload).toHaveProperty('exceptions');
    expect(updatePayload.exceptions).toEqual([]);
    expect(updatePayload).not.toHaveProperty('exemptions');
    expect(updatePayload).not.toHaveProperty('selectedExceptions');

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('haulingMarkAuthorizationId=42'),
    );
  });

  it('hydrates the Exceptions selection from the saved record and persists it on update', async () => {
    // Round-trip lock for the Exceptions wiring: a saved exempt-mark-method code is resolved to its LOV
    // item on load and sent back on save, even when the user does not touch the control.
    mockGetMarkSiteDesignation.mockResolvedValue(makeDetail({ districtWideInd: 'Y', exceptions: ['21'] }));
    mockUpdateMarkSiteDesignation.mockResolvedValue(makeDetail({ districtWideInd: 'Y' }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/expiry date/i)).toHaveValue('2026-12-31');
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateMarkSiteDesignation).toHaveBeenCalled();
    });

    const updatePayload = mockUpdateMarkSiteDesignation.mock.calls[0][1] as Record<string, unknown>;
    expect(updatePayload.exceptions).toEqual(['21']);
  });

  it('adds a scale site when the number is entered in lowercase (case-insensitive match)', async () => {
    // Regression lock: adding a Scale Site by number must not be case-sensitive. The backend searches
    // case-insensitively and returns the canonical uppercase scaleSiteIdNmbr; the add flow must accept a
    // lowercase input that matches, not reject it with "was not found".
    mockGetMarkSiteDesignation.mockResolvedValue(makeDetail({ districtWideInd: 'N', scaleSites: [] }));
    mockSearchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'AB123', siteName: 'Canonical Site' }]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('scale-sites-section')).toHaveAttribute('data-district-wide', 'N');
    });

    fireEvent.change(screen.getByLabelText('Site #'), { target: { value: 'ab123' } });
    fireEvent.click(screen.getByRole('button', { name: /add scale site/i }));

    // The canonical uppercase site is added to the list...
    await waitFor(() => {
      expect(screen.getByText('AB123')).toBeInTheDocument();
    });

    // ...and no "was not found" error is shown.
    expect(screen.getByTestId('scale-sites-section')).toHaveAttribute('data-invalidtext', '');
    expect(mockSearchScaleSites).toHaveBeenCalledWith({ scaleSiteIdNmbr: 'ab123' }, 'token');
  });

  it('rejects a scale site that is already in the list with the legacy message', async () => {
    // The duplicate used to be swallowed: the setScaleSites updater returned `prev` and execution fell
    // through to clear the input and clear the error, so the screen looked exactly like a successful add
    // while nothing had been added. Legacy rejected it (scaleSiteAuthorization.duplicateScaleSite).
    mockGetMarkSiteDesignation.mockResolvedValue(
      makeDetail({ districtWideInd: 'N', scaleSites: [{ scaleSiteIdNmbr: '1006', siteName: 'Existing Site' }] }),
    );
    mockSearchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: '1006', siteName: 'Existing Site' }]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('1006')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Site #'), { target: { value: '1006' } });
    fireEvent.click(screen.getByRole('button', { name: /add scale site/i }));

    await waitFor(() => {
      expect(screen.getByTestId('scale-sites-section')).toHaveAttribute(
        'data-invalidtext',
        'The Scale Site 1006 has already been added.',
      );
    });

    // Shown at add time, not gated behind a save attempt (UC-MSD-002 Divergence #2)...
    expect(screen.getByTestId('scale-sites-section')).toHaveAttribute('data-invalid', 'true');
    // ...the site is listed once, not twice...
    expect(screen.getAllByText('1006')).toHaveLength(1);
    // ...and the rejected value stays in the field instead of being cleared as if it had worked.
    expect(screen.getByLabelText('Site #')).toHaveValue('1006');
  });

  it('blocks the save when District Wide is No and no scale site is present (validateSave rule)', async () => {
    // Regression lock for the ported ERR-011 rule (Edit validateSave now takes scaleSiteCount):
    // District Wide=N with zero scale sites must block the save with the same message the create screen shows.
    mockGetMarkSiteDesignation.mockResolvedValue(makeDetail({ districtWideInd: 'N', scaleSites: [] }));
    mockUpdateMarkSiteDesignation.mockResolvedValue(makeDetail());

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('scale-sites-section')).toHaveAttribute('data-district-wide', 'N');
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId('scale-sites-section')).toHaveAttribute(
        'data-invalidtext',
        'At least one Scale Site is required when District Wide is No.',
      );
    });

    // The write must NOT have left the browser.
    expect(mockUpdateMarkSiteDesignation).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('blocks the save when Expiry Date precedes Effective Date and a letter exists', async () => {
    // Regression lock for ERR-007 on the letter-locked path: validateSave used to return early on
    // letterExists after only the required check, so an expiry before the (locked) effective date
    // saved silently. Expiry stays editable there, so the rule must still run.
    mockGetMarkSiteDesignation.mockResolvedValue(
      makeDetail({ letterExists: true, effectiveDate: '2026-01-01', expiryDate: '2026-12-31' }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/letter has been issued/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/expiry date/i), { target: { value: '2025-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Expiry Date must be on or after Effective Date.'),
      ).toBeInTheDocument();
    });

    expect(mockUpdateMarkSiteDesignation).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ERR-019..ERR-022: an over-length free-text value used to produce only the generic "Please fix
  // the errors below." banner — no field named, no limit stated — because the screens carried no
  // length rule at all and the value went to the API.
  it.each([
    ['geographic-location', 41, 'Geographic Location can not be greater than 40 characters.'],
    ['timber-description', 41, 'Timber Description can not be greater than 40 characters.'],
    ['transportation-date-desc', 201, 'Transportation Date Desc can not be greater than 200 characters.'],
    ['other-requirements', 4001, 'Other Requirements can not be greater than 4000 characters.'],
  ])('blocks the save and names the field when %s exceeds its limit', async (domId, length, message) => {
    mockGetMarkSiteDesignation.mockResolvedValue(makeDetail({ districtWideInd: 'Y' }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/expiry date/i)).toHaveValue('2026-12-31');
    });

    fireEvent.change(document.getElementById(domId) as HTMLTextAreaElement, {
      target: { value: 'X'.repeat(length) },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    expect(mockUpdateMarkSiteDesignation).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('allows a free-text value that is exactly at its limit', async () => {
    mockGetMarkSiteDesignation.mockResolvedValue(makeDetail({ districtWideInd: 'Y' }));
    mockUpdateMarkSiteDesignation.mockResolvedValue(makeDetail({ districtWideInd: 'Y' }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/expiry date/i)).toHaveValue('2026-12-31');
    });

    fireEvent.change(document.getElementById('geographic-location') as HTMLTextAreaElement, {
      target: { value: 'X'.repeat(40) },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateMarkSiteDesignation).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ geographicLocation: 'X'.repeat(40) }),
        'token',
      );
    });
  });

  it('allows the save when Expiry Date equals Effective Date and a letter exists', async () => {
    // The rule is "on or after" — a same-day expiry must still go through.
    mockGetMarkSiteDesignation.mockResolvedValue(
      makeDetail({ letterExists: true, effectiveDate: '2026-01-01', expiryDate: '2026-12-31' }),
    );
    mockUpdateMarkSiteDesignation.mockResolvedValue(makeDetail({ letterExists: true }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/letter has been issued/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/expiry date/i), { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateMarkSiteDesignation).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ expiryDate: '2026-01-01' }),
        'token',
      );
    });
  });
});
