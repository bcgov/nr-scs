// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import ScaleSiteInspectionCreatePage from './index';

const mockNavigate = vi.fn();
const mockGetStaticLov = vi.fn();
const mockGetScaleMethodTypeLov = vi.fn();
const mockGetScaleSiteInspectionCreateInit = vi.fn();
const mockCreateScaleSiteInspection = vi.fn();

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
      getScaleMethodTypeLov: (...args: unknown[]) => mockGetScaleMethodTypeLov(...args),
    },
    scaleSiteInspections: {
      getScaleSiteInspectionCreateInit: (...args: unknown[]) => mockGetScaleSiteInspectionCreateInit(...args),
      createScaleSiteInspection: (...args: unknown[]) => mockCreateScaleSiteInspection(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/core/DateInput', () => ({
  default: ({
    id,
    value = '',
    onChange,
    labelText,
    invalid = false,
    invalidText,
  }: {
    id: string;
    value?: string;
    onChange?: (value: string) => void;
    labelText?: React.ReactNode;
    invalid?: boolean;
    invalidText?: string;
  }) => (
    <label htmlFor={id}>
      {labelText}
      <input
        id={id}
        value={value}
        aria-invalid={invalid}
        onChange={(event) => onChange?.(event.target.value)}
      />
      {invalid && invalidText ? <div>{invalidText}</div> : null}
    </label>
  ),
}));

describe('ScaleSiteInspectionCreatePage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const toggleSiteTypeCheckbox = async (label: string) => {
    fireEvent.click(await screen.findByRole('checkbox', { name: label }));
  };

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

  const renderPage = (initialEntry = '/scale-sites/SITE001/inspections/create') => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/scale-sites/:scaleSiteIdNmbr/inspections/create" element={<ScaleSiteInspectionCreatePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetStaticLov.mockReset();
    mockGetScaleMethodTypeLov.mockReset();
    mockGetScaleSiteInspectionCreateInit.mockReset();
    mockCreateScaleSiteInspection.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());

    mockGetStaticLov.mockResolvedValue([
      { code: 'COM', description: 'Compliance' },
      { code: 'AUT', description: 'Automated' },
    ]);
    mockGetScaleMethodTypeLov.mockResolvedValue([
      { code: 'W', description: 'Weight Scale' },
      { code: 'P', description: 'Piece Scale' },
    ]);
    mockGetScaleSiteInspectionCreateInit.mockResolvedValue({
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      siteLocation: 'Nanaimo',
      siteOwnerName: 'ACME FOREST PRODUCTS LTD.',
      inspectionTypeCode: 'COM',
      inspectionTypeDescription: 'Compliance',
      siteTypeCodes: ['W'],
      siteTypeDisplay: 'Weight Scale',
      recipientOptions: [{ value: '77', label: 'Jordan Smith' }],
      recipient: '',
      siteOperatorPresentInd: 'Y',
      inspector: 'F5E59074276C40558FF6A17CF1AB3EC2',
      inspectionDate: '2026-03-11',
      previousInspectionId: null,
      comments: 'Created from staged workflow.',
      questionResponses: [],
    });
    mockCreateScaleSiteInspection.mockResolvedValue({
      inspectionId: 12345,
      scaleSiteIdNmbr: 'SITE001',
    });
  });

  it('shows an empty-state message when the scale site route param is blank after trimming', async () => {
    renderPage('/scale-sites/%20%20/inspections/create');

    expect(await screen.findByText('Inspection create not available')).toBeTruthy();
    expect(screen.getByText('A valid scale site number was not provided in the route.')).toBeTruthy();
    expect(mockGetStaticLov).not.toHaveBeenCalled();
    expect(mockGetScaleMethodTypeLov).not.toHaveBeenCalled();
  });

  it('validates the stage-1 inspection type and site type selections before loading the create form', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockGetStaticLov).toHaveBeenCalledWith({ tableKey: 'SCALE_SITE_INSPCTN_TYPE_CODE' }, 'token');
      expect(mockGetScaleMethodTypeLov).toHaveBeenCalledWith(undefined, 'token');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Inspection Type is required.')).toBeTruthy();
    expect(screen.getByText('Site Type is required.')).toBeTruthy();
    expect(mockGetScaleSiteInspectionCreateInit).not.toHaveBeenCalled();
  });

  it('loads the stage-2 create form after valid stage-1 selections', async () => {
    renderPage();

    const inspectionTypeSelect = await screen.findByRole('combobox', { name: /Inspection Type/i });
    fireEvent.change(inspectionTypeSelect, { target: { value: 'COM' } });
    await toggleSiteTypeCheckbox('Weight Scale');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(mockGetScaleSiteInspectionCreateInit).toHaveBeenCalledWith('SITE001', 'COM', ['W'], 'token');
    });

    expect(await screen.findByText('Inspection Report Details')).toBeTruthy();
    expect((screen.getByLabelText('Scale Site #') as HTMLInputElement).value).toBe('SITE001');
    expect((screen.getByLabelText('Inspection Type') as HTMLInputElement).value).toBe('Compliance');
    expect(screen.getByDisplayValue('F5E59074276C40558FF6A17CF1AB3EC2')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-03-11')).toBeTruthy();
    expect(screen.getByDisplayValue('Created from staged workflow.')).toBeTruthy();
    expect(screen.getByText('This inspection context does not require any question responses before save.')).toBeTruthy();
  });

  it('keeps site type selections visible through stage-1 checkboxes', async () => {
    renderPage();

    const inspectionTypeSelect = await screen.findByRole('combobox', { name: /Inspection Type/i });
    fireEvent.change(inspectionTypeSelect, { target: { value: 'COM' } });

    const weightScaleCheckbox = await screen.findByRole('checkbox', { name: 'Weight Scale' });
    const pieceScaleCheckbox = await screen.findByRole('checkbox', { name: 'Piece Scale' });

    fireEvent.click(weightScaleCheckbox);
    fireEvent.click(pieceScaleCheckbox);

    expect((weightScaleCheckbox as HTMLInputElement).checked).toBe(true);
    expect((pieceScaleCheckbox as HTMLInputElement).checked).toBe(true);
  });

  it('submits the create request and redirects to the new inspection detail with scale-site return context', async () => {
    renderPage();

    const inspectionTypeSelect = await screen.findByRole('combobox', { name: /Inspection Type/i });
    fireEvent.change(inspectionTypeSelect, { target: { value: 'COM' } });
    await toggleSiteTypeCheckbox('Weight Scale');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await screen.findByText('Inspection Report Details');

    fireEvent.change(screen.getByRole('combobox', { name: /Site Operator \(if different from owner\)/i }), {
      target: { value: '77' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => {
      expect(mockCreateScaleSiteInspection).toHaveBeenCalledWith(
        'SITE001',
        {
          inspectionTypeCode: 'COM',
          siteTypeCodes: ['W'],
          inspectionDate: '2026-03-11',
          inspector: 'F5E59074276C40558FF6A17CF1AB3EC2',
          previousInspectionId: null,
          recipient: '77',
          siteOperatorPresentInd: 'Y',
          comments: 'Created from staged workflow.',
          questionResponses: [],
        },
        'token',
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/SITE001/inspections/view/12345');
    });
  });

  it('blocks the create and shows an inline error when the inspector is not a valid GUID', async () => {
    renderPage();

    const inspectionTypeSelect = await screen.findByRole('combobox', { name: /Inspection Type/i });
    fireEvent.change(inspectionTypeSelect, { target: { value: 'COM' } });
    await toggleSiteTypeCheckbox('Weight Scale');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Inspection Report Details');

    const inspectorInput = await screen.findByLabelText(/Inspector #/i);
    fireEvent.change(inspectorInput, { target: { value: 'not-a-guid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    // Rendered both inline (TextInput invalidText) and in the validation banner, so match all.
    expect((await screen.findAllByText('Inspector must be a valid user GUID.')).length).toBeGreaterThan(0);
    expect(mockCreateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('shows an inline error when the create-init request fails', async () => {
    mockGetScaleSiteInspectionCreateInit.mockRejectedValueOnce(new Error('Create-init backend unavailable'));

    renderPage();

    const inspectionTypeSelect = await screen.findByRole('combobox', { name: /Inspection Type/i });
    fireEvent.change(inspectionTypeSelect, { target: { value: 'COM' } });
    await toggleSiteTypeCheckbox('Weight Scale');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Could not load inspection create form')).toBeTruthy();
    expect(screen.getByText('Create-init backend unavailable')).toBeTruthy();
  });

  it('auto-selects Weight Scale for automated inspections before loading stage 2', async () => {
    renderPage();

    const inspectionTypeSelect = await screen.findByRole('combobox', { name: /Inspection Type/i });
    fireEvent.change(inspectionTypeSelect, { target: { value: 'AUT' } });

    expect(
      await screen.findByText('Automated inspections require Weight Scale and this selection has been applied automatically.'),
    ).toBeTruthy();

    const weightScaleCheckbox = await screen.findByRole('checkbox', { name: 'Weight Scale' });
    const pieceScaleCheckbox = await screen.findByRole('checkbox', { name: 'Piece Scale' });

    expect((weightScaleCheckbox as HTMLInputElement).checked).toBe(true);
    expect((weightScaleCheckbox as HTMLInputElement).disabled).toBe(true);
    expect((pieceScaleCheckbox as HTMLInputElement).checked).toBe(false);
    expect((pieceScaleCheckbox as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(mockGetScaleSiteInspectionCreateInit).toHaveBeenCalledWith('SITE001', 'AUT', ['W'], 'token');
    });
  });
});

