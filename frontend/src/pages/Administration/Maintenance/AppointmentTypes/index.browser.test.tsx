import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../../../../config/tests/setup-env';
import type { AuthContextType } from '../../../../context/auth/AuthContext';
import * as authModule from '../../../../context/auth/useAuth';

import AppointmentTypesAdminPage from './index';

const mockSearch = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('@/services/APIs', () => ({
  default: {
    appointmentTypes: {
      searchAppointmentTypes: (...args: unknown[]) => mockSearch(...args),
      createAppointmentType: (...args: unknown[]) => mockCreate(...args),
      updateAppointmentType: (...args: unknown[]) => mockUpdate(...args),
      deleteAppointmentType: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

const CS = {
  code: 'CS',
  description: 'Check Scaler',
  actingInd: 'Y' as const,
  effectiveDate: '2020-01-01',
  expiryDate: '2030-12-31',
};

// The page reads the query client (to drop the cached appointment LOVs after a write), so the
// harness mirrors the real tree from main.tsx: QueryClientProvider outside the router.
const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<AppointmentTypesAdminPage />, { wrapper });
};

describe('AppointmentTypesAdminPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  beforeEach(() => {
    mockSearch.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
    mockSearch.mockResolvedValue([CS]);
    mockCreate.mockResolvedValue(CS);
    mockDelete.mockResolvedValue(undefined);
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

  it('renders the list from the search service', async () => {
    renderPage();
    expect(await screen.findByText('Check Scaler')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CS' })).toBeInTheDocument();
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('paginates the list to the default page size', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...CS,
      code: `C${String(i).padStart(2, '0')}`,
      description: `Type ${i}`,
    }));
    mockSearch.mockResolvedValue(many);

    renderPage();
    // First page shows the default 10 rows...
    expect(await screen.findByRole('button', { name: 'C00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C09' })).toBeInTheDocument();
    // ...and the 11th/12th rows are on a later page (not rendered yet).
    expect(screen.queryByRole('button', { name: 'C10' })).not.toBeInTheDocument();
  });

  it('opens the create modal from the Add button', async () => {
    renderPage();
    await screen.findByText('Check Scaler');
    fireEvent.click(screen.getByRole('button', { name: /Add Appointment Type/ }));
    expect(await screen.findByText('Maintain Appointment Types - Create')).toBeInTheDocument();
  });

  it('shows validation errors and does not save an empty create form', async () => {
    renderPage();
    await screen.findByText('Check Scaler');
    fireEvent.click(screen.getByRole('button', { name: /Add Appointment Type/ }));
    await screen.findByText('Maintain Appointment Types - Create');

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    expect(await screen.findByText('Code is required.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('opens a record for view and switches to edit', async () => {
    renderPage();
    await screen.findByText('Check Scaler');
    fireEvent.click(screen.getByRole('button', { name: 'CS' }));

    expect(await screen.findByText('Appointment Type Detail')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Edit Appointment/ }));
    expect(await screen.findByText('Maintain Appointment Types - Edit')).toBeInTheDocument();
  });

  it('creates a record and returns to the view screen', async () => {
    const { container } = renderPage();
    await screen.findByText('Check Scaler');
    fireEvent.click(screen.getByRole('button', { name: /Add Appointment Type/ }));
    await screen.findByText('Maintain Appointment Types - Create');

    fireEvent.change(container.querySelector('#appointment-code')!, { target: { value: 'cs' } });
    fireEvent.change(container.querySelector('#appointment-description')!, {
      target: { value: 'Check Scaler' },
    });
    fireEvent.change(container.querySelector('#appointment-acting')!, { target: { value: 'yes' } });

    const eff = container.querySelector('#appointment-effective-date')! as HTMLInputElement;
    fireEvent.change(eff, { target: { value: '2026-01-01' } });
    fireEvent.blur(eff);
    const exp = container.querySelector('#appointment-expiry-date')! as HTMLInputElement;
    fireEvent.change(exp, { target: { value: '2026-12-31' } });
    fireEvent.blur(exp);

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toEqual({
      code: 'CS',
      description: 'Check Scaler',
      actingInd: 'Y',
      effectiveDate: '2026-01-01',
      expiryDate: '2026-12-31',
    });
    // Back to view, and the list is reloaded.
    expect(await screen.findByText('Appointment Type Detail')).toBeInTheDocument();
    expect(mockSearch).toHaveBeenCalledTimes(2);
  });

  it('allows expiry equal to the effective date', async () => {
    const { container } = renderPage();
    await screen.findByText('Check Scaler');
    fireEvent.click(screen.getByRole('button', { name: /Add Appointment Type/ }));
    await screen.findByText('Maintain Appointment Types - Create');

    fireEvent.change(container.querySelector('#appointment-code')!, { target: { value: 'cs' } });
    fireEvent.change(container.querySelector('#appointment-description')!, {
      target: { value: 'Check Scaler' },
    });
    fireEvent.change(container.querySelector('#appointment-acting')!, { target: { value: 'yes' } });

    const eff = container.querySelector('#appointment-effective-date')! as HTMLInputElement;
    fireEvent.change(eff, { target: { value: '2026-06-15' } });
    fireEvent.blur(eff);
    const exp = container.querySelector('#appointment-expiry-date')! as HTMLInputElement;
    fireEvent.change(exp, { target: { value: '2026-06-15' } });
    fireEvent.blur(exp);

    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));

    // Equal dates must pass the cross-field rule (guards against a `<=` regression).
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toEqual({
      code: 'CS',
      description: 'Check Scaler',
      actingInd: 'Y',
      effectiveDate: '2026-06-15',
      expiryDate: '2026-06-15',
    });
    expect(screen.queryByText('Expiry date cannot be before effective date.')).not.toBeInTheDocument();
  });

  it('accepts a 120-character description and rejects 121 with the legacy message', async () => {
    // Legacy limit is 120 (matching ScalerAppointmentTypeValidator). Exactly 120 saves; 121 shows
    // the specific "Appointment Description can not be greater than 120 characters." message and
    // does not submit — replacing the old 100-char / generic-error behaviour.
    const { container } = renderPage();
    await screen.findByText('Check Scaler');
    fireEvent.click(screen.getByRole('button', { name: /Add Appointment Type/ }));
    await screen.findByText('Maintain Appointment Types - Create');

    const fillCommon = () => {
      fireEvent.change(container.querySelector('#appointment-code')!, { target: { value: 'cs' } });
      fireEvent.change(container.querySelector('#appointment-acting')!, { target: { value: 'yes' } });
      const eff = container.querySelector('#appointment-effective-date')! as HTMLInputElement;
      fireEvent.change(eff, { target: { value: '2026-01-01' } });
      fireEvent.blur(eff);
      const exp = container.querySelector('#appointment-expiry-date')! as HTMLInputElement;
      fireEvent.change(exp, { target: { value: '2026-12-31' } });
      fireEvent.blur(exp);
    };

    // 121 characters -> specific message, no submit.
    fillCommon();
    fireEvent.change(container.querySelector('#appointment-description')!, { target: { value: 'A'.repeat(121) } });
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    expect(await screen.findByText('Appointment Description can not be greater than 120 characters.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();

    // Exactly 120 characters -> accepted.
    fireEvent.change(container.querySelector('#appointment-description')!, { target: { value: 'A'.repeat(120) } });
    fireEvent.click(screen.getByRole('button', { name: /Save Record/ }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].description).toBe('A'.repeat(120));
  });

  it('deletes a record through the confirm modal', async () => {
    renderPage();
    await screen.findByText('Check Scaler');
    fireEvent.click(screen.getByRole('button', { name: 'CS' }));
    await screen.findByText('Appointment Type Detail');

    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));

    const confirm = await screen.findByText('Are you sure you want to delete this record?');
    fireEvent.click(within(confirm.closest('.cds--modal')!).getByRole('button', { name: /OK/ }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('CS', 'token'));
    expect(mockSearch).toHaveBeenCalledTimes(2);
  });
});
