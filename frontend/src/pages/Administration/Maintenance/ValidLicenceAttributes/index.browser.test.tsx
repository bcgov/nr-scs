import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../config/tests/setup-env';
import type { AuthContextType } from '../../../../context/auth/AuthContext';
import * as authModule from '../../../../context/auth/useAuth';

import ValidLicenceAttributesAdminPage from './index';

const mockSearch = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockGetGradingCodeAppointmentTypeLov = vi.fn();
const mockGetAppointmentTypeLov = vi.fn();
const mockGetStaticLov = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    validLicenceAttributes: {
      searchValidLicenceAttributes: (...args: unknown[]) => mockSearch(...args),
      getValidLicenceAttribute: (...args: unknown[]) => mockGet(...args),
      createValidLicenceAttribute: (...args: unknown[]) => mockCreate(...args),
      updateValidLicenceAttribute: (...args: unknown[]) => mockUpdate(...args),
      deleteValidLicenceAttribute: (...args: unknown[]) => mockDelete(...args),
    },
    lov: {
      getGradingCodeAppointmentTypeLov: (...args: unknown[]) => mockGetGradingCodeAppointmentTypeLov(...args),
      getAppointmentTypeLov: (...args: unknown[]) => mockGetAppointmentTypeLov(...args),
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));

const listRow = {
  scaleGradingSystemCode: 'C',
  scalerAppointmentType: 'CS',
  scalerAppointmentTypeDescription: 'CS - Coastal',
};
const detail = { ...listRow, effectiveDate: '2020-01-01', expiryDate: null, scalerAppointmentTypeActing: 'N', dependentChildExists: false };

// The page reads the query client (to drop the cached appointment LOV after a write), so the
// harness has to mirror the real tree from main.tsx: QueryClientProvider outside the router.
const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<ValidLicenceAttributesAdminPage />, { wrapper });
};

describe('ValidLicenceAttributesAdminPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    [mockSearch, mockGet, mockCreate, mockUpdate, mockDelete, mockGetGradingCodeAppointmentTypeLov, mockGetAppointmentTypeLov, mockGetStaticLov].forEach(
      (m) => m.mockReset(),
    );
    mockSearch.mockResolvedValue([listRow]);
    mockGet.mockResolvedValue(detail);
    mockDelete.mockResolvedValue(undefined);
    mockGetGradingCodeAppointmentTypeLov.mockResolvedValue([
      { scaleGradingSystemCode: 'C', scalerAppointmentType: 'CS', description: 'CS - Coastal', scalerAppointmentTypeActing: 'N' },
    ]);
    // The Add-Attribute Appointment Type dropdown is sourced from the full appointment-type LOV,
    // which includes types not (yet) cross-referenced to any grading code — e.g. NW below.
    mockGetAppointmentTypeLov.mockResolvedValue([
      { code: 'CS', description: 'Coastal Scaler' },
      { code: 'NW', description: 'New Type' },
    ]);
    // 'Both' (B) has no appointment-type combos but must still name/open its row, so the static
    // grading-system LOV carries it alongside 'Coastal' (C).
    mockGetStaticLov.mockResolvedValue([
      { code: 'B', description: 'Both' },
      { code: 'C', description: 'Coastal' },
    ]);
    mockUseAuth.mockReturnValue({
      // An administrator: these cases exercise Add, Edit and Delete, which now name their own §J
      // permissions. Signed in as `undefined` they would pass for the wrong reason — nothing rendered.
      user: { roles: ['SCS_SYS_ADMIN'], privileges: {} },
      isLoggedIn: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn().mockResolvedValue('token'),
    } as AuthContextType);
  });

  it('renders the list with the derived grading-system name', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: 'Coastal' })).toBeInTheDocument();
  });

  // Regression: "Both" (B) is a selectable grading system with no grading-code/appointment-type
  // combos. Naming the column from that combo LOV left the cell blank, and since the cell IS the
  // row's only link, the record could not be opened to view/edit/delete it.
  it('names and opens a row whose grading system has no appointment-type combos ("Both")', async () => {
    const bothRow = {
      scaleGradingSystemCode: 'B',
      scalerAppointmentType: 'A',
      scalerAppointmentTypeDescription: 'Assistant - Both',
    };
    mockSearch.mockResolvedValue([bothRow]);
    mockGet.mockResolvedValue({ ...bothRow, effectiveDate: '2020-01-01', expiryDate: null, scalerAppointmentTypeActing: 'N', dependentChildExists: false });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Both' }));

    expect(await screen.findByText('Maintain Valid Licence Attributes - Details')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('B', 'A', 'token');
  });

  it('validates the create form (grading system and appointment type required)', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Coastal' });
    fireEvent.click(screen.getByRole('button', { name: /Add Attribute/ }));
    await screen.findByText('Maintain Valid Licence Attributes - Create');
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    expect(await screen.findByText('Grading System Code is required.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('allows expiry equal to the effective date', async () => {
    mockCreate.mockResolvedValue(detail);
    const { container } = renderPage();
    await screen.findByRole('button', { name: 'Coastal' });
    fireEvent.click(screen.getByRole('button', { name: /Add Attribute/ }));
    await screen.findByText('Maintain Valid Licence Attributes - Create');

    fireEvent.change(container.querySelector('#vla-grading-system')!, { target: { value: 'C' } });
    fireEvent.change(container.querySelector('#vla-appointment-type')!, { target: { value: 'CS' } });

    const eff = container.querySelector('#vla-effective-date')! as HTMLInputElement;
    fireEvent.change(eff, { target: { value: '2026-06-15' } });
    fireEvent.blur(eff);
    const exp = container.querySelector('#vla-expiry-date')! as HTMLInputElement;
    fireEvent.change(exp, { target: { value: '2026-06-15' } });
    fireEvent.blur(exp);

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    // Equal dates must pass the cross-field rule (guards against a `<=` regression).
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toEqual({
      scaleGradingSystemCode: 'C',
      scalerAppointmentType: 'CS',
      effectiveDate: '2026-06-15',
      expiryDate: '2026-06-15',
    });
    expect(screen.queryByText('Expiry Date must be on or after Effective Date.')).not.toBeInTheDocument();
  });

  it('offers appointment types with no grading-code xref in the Add dropdown', async () => {
    // Regression: the dropdown used to derive its options from the grading-code xref, so a newly
    // added appointment type (no xref row yet) could never be selected. It now reads the full
    // appointment-type LOV — 'NW' has no xref row above yet must still be selectable.
    const { container } = renderPage();
    await screen.findByRole('button', { name: 'Coastal' });
    fireEvent.click(screen.getByRole('button', { name: /Add Attribute/ }));
    await screen.findByText('Maintain Valid Licence Attributes - Create');

    const select = container.querySelector('#vla-appointment-type') as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toContain('CS');
    expect(optionValues).toContain('NW');
  });

  it('still renders the list and filter when the appointment-type LOV fails', async () => {
    // The appointment-type LOV feeds only the Add-Attribute dropdown; its failure must not blank
    // the grading-code xref (list/description columns) or grading-system LOV (filter).
    mockGetAppointmentTypeLov.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByRole('button', { name: 'Coastal' })).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by Grading System')).toBeInTheDocument();
  });

  it('re-queries automatically when a filter option is selected', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Coastal' });
    fireEvent.change(screen.getByLabelText('Filter by Grading System'), { target: { value: 'C' } });
    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2));
    expect(mockSearch.mock.calls[1][0]).toEqual({ scaleGradingSystemCode: 'C' });
  });

  it('blocks delete when the attribute has dependents', async () => {
    mockGet.mockResolvedValue({ ...detail, dependentChildExists: true });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Coastal' }));
    await screen.findByText('Maintain Valid Licence Attributes - Details');
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    expect(await screen.findByText(/cannot be deleted/i)).toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes with its composite key when there are no dependents', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Coastal' }));
    await screen.findByText('Maintain Valid Licence Attributes - Details');
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    const confirm = await screen.findByText('Are you sure you want to delete this record?');
    fireEvent.click(within(confirm.closest('.cds--modal')!).getByRole('button', { name: /OK/ }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('C', 'CS', 'token'));
  });
});
