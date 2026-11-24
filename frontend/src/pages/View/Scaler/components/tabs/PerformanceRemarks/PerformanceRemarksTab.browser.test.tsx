// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import PerformanceRemarksTab from './PerformanceRemarksTab';

import type { ScalerSummary } from '@/services/scalers.service';

const mockGetScalerPerformanceRemarks = vi.fn();
const mockCreateScalerPerformanceRemark = vi.fn();
const mockUpdateScalerPerformanceRemark = vi.fn();
const mockDeleteScalerPerformanceRemark = vi.fn();
const mockUpdateLicenceCancelledDate = vi.fn();
const mockGetStaticLov = vi.fn();

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    scalerPerformanceRemarks: {
      getScalerPerformanceRemarks: (...args: unknown[]) =>
        mockGetScalerPerformanceRemarks(...args),
      createScalerPerformanceRemark: (...args: unknown[]) =>
        mockCreateScalerPerformanceRemark(...args),
      updateScalerPerformanceRemark: (...args: unknown[]) =>
        mockUpdateScalerPerformanceRemark(...args),
      deleteScalerPerformanceRemark: (...args: unknown[]) =>
        mockDeleteScalerPerformanceRemark(...args),
    },
    scalers: {
      updateLicenceCancelledDate: (...args: unknown[]) =>
        mockUpdateLicenceCancelledDate(...args),
    },
    lov: {
      getStaticLov: (...args: unknown[]) => mockGetStaticLov(...args),
    },
  },
  BackendApiConfig: { BASE: '/api', TOKEN: async () => null },
}));

describe('PerformanceRemarksTab', () => {
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

  const renderTab = (
    isActive = true,
    scalerLicenceNo = '1234',
    summary: ScalerSummary = { licenceCancelledDate: null },
  ) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const ui = (currentSummary: ScalerSummary) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PerformanceRemarksTab
            isActive={isActive}
            scalerLicenceNo={scalerLicenceNo}
            summary={currentSummary}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const view = render(ui(summary));
    return {
      ...view,
      queryClient,
      rerenderWithSummary: (next: ScalerSummary) => view.rerender(ui(next)),
    };
  };

  const cancelDateInput = () =>
    document.querySelector<HTMLInputElement>('#scaler-licence-cancelled-date');

  beforeEach(() => {
    mockGetScalerPerformanceRemarks.mockReset();
    mockCreateScalerPerformanceRemark.mockReset();
    mockUpdateScalerPerformanceRemark.mockReset();
    mockDeleteScalerPerformanceRemark.mockReset();
    mockUpdateLicenceCancelledDate.mockReset();
    mockGetStaticLov.mockReset();
    // Issue Type dropdowns: Action + Outcome static LOVs, keyed by the requested table.
    mockGetStaticLov.mockImplementation((params?: { tableKey?: string }) => {
      if (params?.tableKey === 'SCALER_PERFORMANCE_ACTN_CODE') {
        return Promise.resolve([{ code: 'W', description: 'Warning' }]);
      }
      if (params?.tableKey === 'SCALER_PERFORMANCE_OUTCM_CODE') {
        return Promise.resolve([{ code: 'R', description: 'Resolved' }]);
      }
      return Promise.resolve([]);
    });
    mockUseAuth.mockReturnValue(createAuthContextValue());
  });

  it('renders remark rows with the resolved Issue Type', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1001,
        scalerLicenceNo: '1234',
        loggedTimestamp: '2025-01-10',
        performanceRemarkDesc: 'Late submission',
        scalerPerformanceActnCode: 'W',
        scalerPerformanceActnDescription: 'Warning',
        scalerPerformanceOutcmCode: 'R',
        scalerPerformanceOutcmDescription: 'Resolved',
        checkScaleId: 55001,
      },
    ]);

    renderTab();

    const table = within(await screen.findByRole('table'));
    expect(table.getByText('1001')).toBeInTheDocument();
    expect(table.getByText('2025-01-10')).toBeInTheDocument();
    expect(table.getByText('Warning Resolved')).toBeInTheDocument();
    expect(table.getByText('Late submission')).toBeInTheDocument();
    // The Associated Check Scale # links to the check-scale view (legacy checkScaleView).
    expect(table.getByRole('link', { name: '55001' })).toHaveAttribute(
      'href',
      '/check-scales/view/55001',
    );
  });

  it('opens the read-only detail view when an Issue # is clicked, then returns to the list on Back', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1001,
        scalerLicenceNo: '1234',
        loggedTimestamp: '2025-01-10',
        performanceRemarkDesc: 'Late submission',
        scalerPerformanceActnCode: 'W',
        scalerPerformanceActnDescription: 'Warning',
        outcomeDesc: 'Resolved after review',
        suspendStartDate: '2025-02-01',
        suspendEndDate: '2025-03-01',
        checkScaleId: 55001,
      },
    ]);

    renderTab();

    const table = within(await screen.findByRole('table'));
    await userEvent.click(table.getByRole('button', { name: '1001' }));

    // The detail panel replaces the list — a read-only version of the create/edit form.
    expect(await screen.findByText('Scaler Performance Remark')).toBeInTheDocument();
    // Issue Type shows the resolved description here, matching the summary table (not the raw code).
    expect(screen.getByDisplayValue('Warning')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Late submission')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Resolved after review')).toBeInTheDocument();
    // The Associated Check Scale # keeps its link to the check-scale view.
    expect(screen.getByRole('link', { name: '55001' })).toHaveAttribute(
      'href',
      '/check-scales/view/55001',
    );

    await userEvent.click(screen.getByRole('button', { name: /Back/ }));

    // Back returns to the summary list.
    expect(
      await screen.findByRole('button', { name: /Add Performance Remark/ }),
    ).toBeInTheDocument();
  });

  it('opens the edit form seeded from the row via Edit Record on the detail view', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1001,
        scalerLicenceNo: '1234',
        loggedTimestamp: '2025-01-10',
        performanceRemarkDesc: 'Late submission',
        scalerPerformanceActnCode: 'W',
        scalerPerformanceActnDescription: 'Warning',
        checkScaleId: 55001,
      },
    ]);

    renderTab();

    const table = within(await screen.findByRole('table'));
    await userEvent.click(table.getByRole('button', { name: '1001' }));

    expect(await screen.findByText('Scaler Performance Remark')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Edit Record/ }));

    expect(
      await screen.findByText('Scaler Performance Remark - Update'),
    ).toBeInTheDocument();
    expect(
      document.querySelector<HTMLInputElement>('#performance-remark-issue-number')!.value,
    ).toBe('1001');
  });

  it('shows the outcome description as the Issue Type on the detail view for an outcome-only remark', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1002,
        scalerLicenceNo: '1234',
        loggedTimestamp: '2025-01-11',
        performanceRemarkDesc: 'Resolved on appeal',
        scalerPerformanceOutcmCode: 'R',
        scalerPerformanceOutcmDescription: 'Resolved',
        checkScaleId: 55002,
      },
    ]);

    renderTab();

    const table = within(await screen.findByRole('table'));
    await userEvent.click(table.getByRole('button', { name: '1002' }));

    expect(await screen.findByText('Scaler Performance Remark')).toBeInTheDocument();
    // An outcome remark surfaces its resolved outcome description in the single "Issue Type" field
    // (not the action code), consistent with how the summary table renders the same value.
    expect(screen.getByDisplayValue('Resolved')).toBeInTheDocument();
  });

  it('shows an em dash and no link when the detail remark has no associated check scale', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1003,
        scalerLicenceNo: '1234',
        loggedTimestamp: '2025-01-12',
        performanceRemarkDesc: 'No check scale',
        scalerPerformanceActnCode: 'W',
        scalerPerformanceActnDescription: 'Warning',
      },
    ]);

    renderTab();

    const table = within(await screen.findByRole('table'));
    await userEvent.click(table.getByRole('button', { name: '1003' }));

    expect(await screen.findByText('Scaler Performance Remark')).toBeInTheDocument();
    // No check scale → the field falls back to the read-only text input (em dash), no link rendered.
    const checkScaleField =
      document.querySelector<HTMLInputElement>('#performance-remark-check-scale-id');
    expect(checkScaleField).not.toBeNull();
    expect(checkScaleField!.tagName).toBe('INPUT');
    expect(checkScaleField!.value).toBe('—');
    // With no check scale the panel renders no links at all (Back / Edit Record are buttons).
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('sorts rows numerically by clicking a column header and restores server order on the third click', async () => {
    // Server order is logged_timestamp desc (900, 1001, 50); a numeric sort must not order these
    // lexicographically.
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      { scalerPerformanceRemarkId: 900, loggedTimestamp: '2025-03-01', performanceRemarkDesc: 'c' },
      { scalerPerformanceRemarkId: 1001, loggedTimestamp: '2025-01-10', performanceRemarkDesc: 'a' },
      { scalerPerformanceRemarkId: 50, loggedTimestamp: '2025-02-15', performanceRemarkDesc: 'b' },
    ]);

    renderTab();

    const issueNumbersInOrder = () =>
      within(screen.getByRole('table'))
        .getAllByRole('row')
        .slice(1) // drop the header row
        .map((row) => within(row).getAllByRole('cell')[0].textContent);

    await screen.findByRole('table');
    // Initial render preserves server order.
    expect(issueNumbersInOrder()).toEqual(['900', '1001', '50']);

    // First click on the Issue # header → ascending numeric.
    await userEvent.click(screen.getByRole('button', { name: /Issue #/ }));
    expect(issueNumbersInOrder()).toEqual(['50', '900', '1001']);

    // Second click → descending numeric.
    await userEvent.click(screen.getByRole('button', { name: /Issue #/ }));
    expect(issueNumbersInOrder()).toEqual(['1001', '900', '50']);

    // Third click → back to the untouched server order.
    await userEvent.click(screen.getByRole('button', { name: /Issue #/ }));
    expect(issueNumbersInOrder()).toEqual(['900', '1001', '50']);
  });

  it('enables the Add, Edit, and Delete actions', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1001,
        scalerLicenceNo: '1234',
        loggedTimestamp: '2025-01-10',
        performanceRemarkDesc: 'Late submission',
        scalerPerformanceActnDescription: 'Warning',
        scalerPerformanceOutcmDescription: 'Resolved',
        checkScaleId: 55001,
      },
    ]);

    renderTab();

    const addButton = await screen.findByRole('button', {
      name: /Add Performance Remark/,
    });
    expect(addButton).toBeEnabled();

    const table = within(await screen.findByRole('table'));
    expect(table.getByRole('button', { name: /Edit/ })).toBeEnabled();
    expect(table.getByRole('button', { name: /Delete/ })).toBeEnabled();
  });

  it('deletes a remark after confirming, then refreshes the list', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1001,
        scalerLicenceNo: '1234',
        loggedTimestamp: '2025-01-10',
        performanceRemarkDesc: 'Late submission',
        scalerPerformanceActnDescription: 'Warning',
        checkScaleId: 55001,
      },
    ]);
    mockDeleteScalerPerformanceRemark.mockResolvedValue(undefined);

    renderTab();

    const table = within(await screen.findByRole('table'));
    await userEvent.click(table.getByRole('button', { name: /Delete/ }));

    // A confirmation modal gates the delete.
    expect(
      await screen.findByText('Are you sure you want to delete this record?'),
    ).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: /Confirm Delete/ }));

    await waitFor(() =>
      expect(mockDeleteScalerPerformanceRemark).toHaveBeenCalledWith('1234', 1001, 'token'),
    );
    // The list is re-fetched on success (initial load + post-delete invalidation).
    await waitFor(() =>
      expect(mockGetScalerPerformanceRemarks.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
  });

  it('does not delete when the confirmation is cancelled', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1001,
        scalerLicenceNo: '1234',
        loggedTimestamp: '2025-01-10',
        performanceRemarkDesc: 'Late submission',
        scalerPerformanceActnDescription: 'Warning',
      },
    ]);

    renderTab();

    const table = within(await screen.findByRole('table'));
    await userEvent.click(table.getByRole('button', { name: /Delete/ }));
    expect(
      await screen.findByText('Are you sure you want to delete this record?'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockDeleteScalerPerformanceRemark).not.toHaveBeenCalled();
  });

  it('surfaces the delete-error banner when the delete fails', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1001,
        scalerLicenceNo: '1234',
        loggedTimestamp: '2025-01-10',
        performanceRemarkDesc: 'Late submission',
        scalerPerformanceActnDescription: 'Warning',
      },
    ]);
    mockDeleteScalerPerformanceRemark.mockRejectedValue({
      response: {
        status: 500,
        data: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while processing your request.',
        },
      },
    });

    renderTab();

    const table = within(await screen.findByRole('table'));
    await userEvent.click(table.getByRole('button', { name: /Delete/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Confirm Delete/ }));

    expect(
      await screen.findByText('Could not delete the performance remark.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('An unexpected error occurred while processing your request.'),
    ).toBeInTheDocument();
  });

  it('opens the edit page seeded from the row, submits the update, and returns to the list', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([
      {
        scalerPerformanceRemarkId: 1001,
        scalerLicenceNo: '1234',
        loggedTimestamp: '2025-01-10',
        performanceRemarkDesc: 'Late submission',
        scalerPerformanceActnCode: 'W',
        scalerPerformanceActnDescription: 'Warning',
        scalerPerformanceOutcmCode: null,
        outcomeDesc: null,
        suspendStartDate: null,
        suspendEndDate: null,
        checkScaleId: 55001,
      },
    ]);
    mockUpdateScalerPerformanceRemark.mockResolvedValue({
      scalerPerformanceRemarkId: 1001,
      scalerLicenceNo: '1234',
    });

    renderTab();

    const table = within(await screen.findByRole('table'));
    await userEvent.click(table.getByRole('button', { name: /Edit/ }));

    expect(
      await screen.findByText('Scaler Performance Remark - Update'),
    ).toBeInTheDocument();

    // The form is seeded from the clicked row: read-only Issue # and the existing editable values.
    expect(
      document.querySelector<HTMLInputElement>('#performance-remark-issue-number')!.value,
    ).toBe('1001');
    expect(
      document.querySelector<HTMLInputElement>('#performance-remark-logged-timestamp')!.value,
    ).toBe('2025-01-10');
    expect(
      document.querySelector<HTMLSelectElement>('#performance-remark-action-code')!.value,
    ).toBe('W');
    expect(
      document.querySelector<HTMLTextAreaElement>('#performance-remark-description')!.value,
    ).toBe('Late submission');

    fireEvent.change(
      document.querySelector<HTMLTextAreaElement>('#performance-remark-description')!,
      { target: { value: 'Late submission (updated)' } },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() =>
      expect(mockUpdateScalerPerformanceRemark).toHaveBeenCalledWith(
        '1234',
        1001,
        expect.objectContaining({
          loggedTimestamp: '2025-01-10',
          scalerPerformanceActnCode: 'W',
          performanceRemarkDesc: 'Late submission (updated)',
        }),
        'token',
      ),
    );

    // On success the page returns to the list view.
    expect(
      await screen.findByRole('button', { name: /Add Performance Remark/ }),
    ).toBeInTheDocument();
  });

  it('opens the create page, submits a valid remark, and returns to the list', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([]);
    mockCreateScalerPerformanceRemark.mockResolvedValue({
      scalerPerformanceRemarkId: 2001,
      scalerLicenceNo: '1234',
    });

    renderTab();

    await userEvent.click(
      await screen.findByRole('button', { name: /Add Performance Remark/ }),
    );

    expect(
      await screen.findByText('Scaler Performance Remark - Create'),
    ).toBeInTheDocument();

    // Date of Incident flows through the shared DateInput (change + blur), matching legacy calendar.
    const dateInput = document.querySelector<HTMLInputElement>(
      '#performance-remark-logged-timestamp',
    )!;
    fireEvent.change(dateInput, { target: { value: '2025-01-10' } });
    fireEvent.blur(dateInput);

    // Issue Type = Action (one of Action / Outcome, never both).
    await userEvent.selectOptions(
      document.querySelector<HTMLSelectElement>('#performance-remark-action-code')!,
      'W',
    );

    fireEvent.change(
      document.querySelector<HTMLTextAreaElement>('#performance-remark-description')!,
      { target: { value: 'Late submission of scale data' } },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() =>
      expect(mockCreateScalerPerformanceRemark).toHaveBeenCalledWith(
        '1234',
        expect.objectContaining({
          loggedTimestamp: '2025-01-10',
          scalerPerformanceActnCode: 'W',
          performanceRemarkDesc: 'Late submission of scale data',
        }),
        'token',
      ),
    );

    // On success the page returns to the list view (Add button visible again).
    expect(
      await screen.findByRole('button', { name: /Add Performance Remark/ }),
    ).toBeInTheDocument();
  });

  it('switches Issue Type to Outcome and submits the outcome code only', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([]);
    mockCreateScalerPerformanceRemark.mockResolvedValue({
      scalerPerformanceRemarkId: 2002,
      scalerLicenceNo: '1234',
    });

    renderTab();

    await userEvent.click(
      await screen.findByRole('button', { name: /Add Performance Remark/ }),
    );
    expect(
      await screen.findByText('Scaler Performance Remark - Create'),
    ).toBeInTheDocument();

    // Action input shows by default; selecting Outcome swaps it for the Outcome input.
    expect(document.querySelector('#performance-remark-action-code')).not.toBeNull();
    await userEvent.selectOptions(
      document.querySelector<HTMLSelectElement>('#performance-remark-issue-type')!,
      'OUTCOME',
    );
    expect(document.querySelector('#performance-remark-action-code')).toBeNull();

    const dateInput = document.querySelector<HTMLInputElement>(
      '#performance-remark-logged-timestamp',
    )!;
    fireEvent.change(dateInput, { target: { value: '2025-01-10' } });
    fireEvent.blur(dateInput);

    await userEvent.selectOptions(
      document.querySelector<HTMLSelectElement>('#performance-remark-outcome-code')!,
      'R',
    );

    fireEvent.change(
      document.querySelector<HTMLTextAreaElement>('#performance-remark-description')!,
      { target: { value: 'Resolved after review' } },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() =>
      expect(mockCreateScalerPerformanceRemark).toHaveBeenCalledWith(
        '1234',
        expect.objectContaining({
          scalerPerformanceOutcmCode: 'R',
          scalerPerformanceActnCode: undefined,
        }),
        'token',
      ),
    );
  });

  it('shows the backend check-scale error beneath the Associated Check Scale # input', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([]);
    mockCreateScalerPerformanceRemark.mockRejectedValue({
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for one or more fields.',
          fieldErrors: [
            { field: 'checkScaleId', message: 'A check scale could not be found for 1121.' },
          ],
        },
      },
    });

    renderTab();

    await userEvent.click(
      await screen.findByRole('button', { name: /Add Performance Remark/ }),
    );
    expect(
      await screen.findByText('Scaler Performance Remark - Create'),
    ).toBeInTheDocument();

    const dateInput = document.querySelector<HTMLInputElement>(
      '#performance-remark-logged-timestamp',
    )!;
    fireEvent.change(dateInput, { target: { value: '2025-01-10' } });
    fireEvent.blur(dateInput);

    await userEvent.selectOptions(
      document.querySelector<HTMLSelectElement>('#performance-remark-action-code')!,
      'W',
    );
    fireEvent.change(
      document.querySelector<HTMLTextAreaElement>('#performance-remark-description')!,
      { target: { value: 'Late submission of scale data' } },
    );
    fireEvent.change(
      document.querySelector<HTMLInputElement>('#performance-remark-check-scale-id')!,
      { target: { value: '1121' } },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    // The field-specific error renders as the input's invalidText, not the generic form banner.
    const checkScaleInput = document.querySelector<HTMLInputElement>(
      '#performance-remark-check-scale-id',
    )!;
    await waitFor(() =>
      expect(checkScaleInput.getAttribute('aria-invalid')).toBe('true'),
    );
    expect(
      screen.getByText('A check scale could not be found for 1121.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Please fix the performance remark form.'),
    ).not.toBeInTheDocument();
  });

  it('blocks submit and surfaces inline field errors (no banner) when required fields are missing', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([]);

    renderTab();

    await userEvent.click(
      await screen.findByRole('button', { name: /Add Performance Remark/ }),
    );
    expect(
      await screen.findByText('Scaler Performance Remark - Create'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    // Each requirement is reported beneath its own input — the general banner is not used.
    expect(await screen.findByText('Date of Incident is required.')).toBeInTheDocument();
    expect(screen.getByText('Action is required.')).toBeInTheDocument();
    expect(screen.getByText('Description is required.')).toBeInTheDocument();
    expect(
      screen.queryByText('Could not save the performance remark.'),
    ).not.toBeInTheDocument();
    expect(mockCreateScalerPerformanceRemark).not.toHaveBeenCalled();
  });

  it('shows the empty state when there are no remarks', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([]);

    renderTab();

    expect(
      await screen.findByText('No performance remarks found for this scaler.'),
    ).toBeInTheDocument();
  });

  it('shows an error notification when the remark request fails', async () => {
    mockGetScalerPerformanceRemarks.mockRejectedValue(new Error('Boom'));

    renderTab();

    expect(
      await screen.findByText('Performance remarks unavailable.'),
    ).toBeInTheDocument();
  });

  it('does not call the remarks API when the tab is inactive', () => {
    renderTab(false);

    expect(mockGetScalerPerformanceRemarks).not.toHaveBeenCalled();
  });

  it('saves the licence cancelled date seeded from the summary', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([]);
    mockUpdateLicenceCancelledDate.mockResolvedValue({
      licenceCancelledDate: '2026-06-30',
    });

    renderTab(true, '1234', { licenceCancelledDate: '2026-06-30' });

    // The field is seeded from the summary the parent already loaded (no extra scaler fetch).
    await waitFor(() => expect(cancelDateInput()?.value).toBe('2026-06-30'));

    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() =>
      expect(mockUpdateLicenceCancelledDate).toHaveBeenCalledWith(
        '1234',
        '2026-06-30',
        'token',
      ),
    );
  });

  it('clears the saved banner when the field is edited after a successful save', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([]);
    mockUpdateLicenceCancelledDate.mockResolvedValue({
      licenceCancelledDate: '2026-06-30',
    });

    renderTab(true, '1234', { licenceCancelledDate: '2026-06-30' });

    await waitFor(() => expect(cancelDateInput()?.value).toBe('2026-06-30'));
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));
    expect(
      await screen.findByText('Licence cancelled date saved.'),
    ).toBeInTheDocument();

    // Editing the field must drop the now-stale success banner.
    const input = cancelDateInput()!;
    fireEvent.change(input, { target: { value: '2027-02-02' } });
    fireEvent.blur(input);

    await waitFor(() =>
      expect(
        screen.queryByText('Licence cancelled date saved.'),
      ).not.toBeInTheDocument(),
    );
  });

  it('does not re-seed the cancel-date field when the summary refetches', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([]);

    const { rerenderWithSummary } = renderTab(true, '1234', {
      licenceCancelledDate: '2024-01-01',
    });

    await waitFor(() => expect(cancelDateInput()?.value).toBe('2024-01-01'));

    // A summary refetch (post-save invalidation / window focus) delivers a new summary object with
    // a different value. The field must keep its value — seeded once per scaler.
    rerenderWithSummary({ licenceCancelledDate: '2099-12-31' });

    expect(cancelDateInput()?.value).toBe('2024-01-01');
  });

  it('surfaces a validation error when the save fails', async () => {
    mockGetScalerPerformanceRemarks.mockResolvedValue([]);
    mockUpdateLicenceCancelledDate.mockRejectedValue({
      response: {
        data: {
          message: 'Licence cancelled date must be on or after the scaler effective date.',
        },
      },
    });

    renderTab(true, '1234', { licenceCancelledDate: '2020-01-01' });

    await userEvent.click(await screen.findByRole('button', { name: 'Save Record' }));

    expect(
      await screen.findByText('Could not save the licence cancelled date.'),
    ).toBeInTheDocument();
  });

  describe('permission gating', () => {
    const remarkRow = {
      scalerPerformanceRemarkId: 1001,
      loggedTimestamp: '2025-01-10',
      performanceRemarkDesc: 'Remark under review',
    };

    const asIndustryScaler = () =>
      mockUseAuth.mockReturnValue({
        ...createAuthContextValue(),
        user: { roles: ['SCS_INDUSTRY_SCALER'], privileges: {}, clientNumbers: ['00001074'] },
      });

    /**
     * Setting the licence-cancelled date is the legacy "suspend licence / recommend cancellation"
     * manager capability, and it lives on a tab a read-only role can legitimately read. The date must
     * stay visible (it is part of their record) but must not be editable or savable.
     */
    it('shows an Industry Scaler the licence cancelled date read-only, with no Save Record', async () => {
      asIndustryScaler();
      mockGetScalerPerformanceRemarks.mockResolvedValue([]);

      renderTab(true, '1234', { licenceCancelledDate: '2024-01-01' });

      await screen.findByText('Licence Cancelled Date');
      expect(cancelDateInput()?.value).toBe('2024-01-01');
      // Read-only, not disabled: the date is information this role may read, select and copy, and a
      // disabled control would also drop out of the tab order.
      expect(cancelDateInput()).toHaveAttribute('readonly');
      expect(cancelDateInput()).not.toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Save Record' })).not.toBeInTheDocument();
    });

    it('leaves the licence cancelled date editable for a caller who holds the permission', async () => {
      mockGetScalerPerformanceRemarks.mockResolvedValue([]);

      renderTab(true, '1234', { licenceCancelledDate: '2024-01-01' });

      await screen.findByText('Licence Cancelled Date');
      expect(cancelDateInput()).not.toHaveAttribute('readonly');
      expect(await screen.findByRole('button', { name: 'Save Record' })).toBeInTheDocument();
    });

    it('offers an Industry Scaler no create, edit or delete controls on the list', async () => {
      asIndustryScaler();
      mockGetScalerPerformanceRemarks.mockResolvedValue([remarkRow]);

      renderTab();

      await screen.findByRole('table');
      expect(
        screen.queryByRole('button', { name: /add performance remark/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });

    /**
     * Gating the two row buttons is not enough on its own: a role holding neither verb — §C is `R` for
     * every read-only column — would otherwise be left with a headed Actions column of empty cells.
     * Same rule the Contacts tab and the Work Bench queues follow.
     */
    it('drops the Actions column entirely for a role holding neither row verb', async () => {
      mockUseAuth.mockReturnValue({
        ...createAuthContextValue(),
        user: { roles: ['SCS_CLERICAL'], privileges: {} },
      });
      mockGetScalerPerformanceRemarks.mockResolvedValue([remarkRow]);

      renderTab();

      const table = await screen.findByRole('table');
      expect(
        within(table).queryByRole('columnheader', { name: 'Actions' }),
      ).not.toBeInTheDocument();
      // The rest of the row is still there — this is a column drop, not a hidden table.
      expect(within(table).getByText('Remark under review')).toBeInTheDocument();
    });

    it('keeps the Actions column for an administrator', async () => {
      mockGetScalerPerformanceRemarks.mockResolvedValue([remarkRow]);

      renderTab();

      const table = await screen.findByRole('table');
      expect(within(table).getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    });

    /**
     * The District Manager combination, which no enabled role had before it: §4 grants it the licence
     * cancellation while §C denies it every remark write. The two halves of this tab are gated
     * independently — as they were in legacy, under separate WebADE actions — so one is live and the
     * other is not.
     */
    it('gives a District Manager the licence date but no remark authoring', async () => {
      mockUseAuth.mockReturnValue({
        ...createAuthContextValue(),
        user: { roles: ['SCS_DIST_MANAGER'], privileges: {} },
      });
      mockGetScalerPerformanceRemarks.mockResolvedValue([remarkRow]);

      renderTab(true, '1234', { licenceCancelledDate: '2024-01-01' });

      // The half §4 grants: editable date, with its own Save Record.
      await screen.findByText('Licence Cancelled Date');
      expect(cancelDateInput()).not.toHaveAttribute('readonly');
      expect(await screen.findByRole('button', { name: 'Save Record' })).toBeInTheDocument();

      // The half §C denies: no create, and the row actions column dropped rather than left empty.
      const table = await screen.findByRole('table');
      expect(
        screen.queryByRole('button', { name: /add performance remark/i }),
      ).not.toBeInTheDocument();
      expect(
        within(table).queryByRole('columnheader', { name: 'Actions' }),
      ).not.toBeInTheDocument();
    });

    /**
     * The detail view is reached by clicking an Issue #, so gating the list's Edit button alone would
     * still leave the edit form one click away.
     */
    it('offers no Edit Record on the remark detail reached via the Issue # link', async () => {
      asIndustryScaler();
      mockGetScalerPerformanceRemarks.mockResolvedValue([remarkRow]);

      renderTab();

      await userEvent.click(
        await screen.findByRole('button', {
          name: String(remarkRow.scalerPerformanceRemarkId),
        }),
      );

      expect(await screen.findByText('Scaler Performance Remark')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit Record' })).not.toBeInTheDocument();
      // Back is still available, so the user is not stranded on the detail view.
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    });

    it('still offers an administrator Edit Record on the remark detail', async () => {
      mockGetScalerPerformanceRemarks.mockResolvedValue([remarkRow]);

      renderTab();

      await userEvent.click(
        await screen.findByRole('button', {
          name: String(remarkRow.scalerPerformanceRemarkId),
        }),
      );

      expect(await screen.findByRole('button', { name: 'Edit Record' })).toBeInTheDocument();
    });
  });
});
