// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import ScaleSiteInspectionViewPage from './index';

const mockNavigate = vi.fn();
const mockGetScaleSiteInspectionDetail = vi.fn();
const mockDeleteScaleSiteInspection = vi.fn();

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
    scaleSiteInspections: {
      getScaleSiteInspectionDetail: (...args: unknown[]) => mockGetScaleSiteInspectionDetail(...args),
      deleteScaleSiteInspection: (...args: unknown[]) => mockDeleteScaleSiteInspection(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

describe('ScaleSiteInspectionViewPage', () => {
  const mockUseAuth = vi.mocked(authModule.useAuth);

  const createDeferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
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

  const renderPage = (initialEntry = '/scale-sites/SITE001/inspections/view/12345') => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/scale-sites/:scaleSiteIdNmbr/inspections/view/:inspectionId" element={<ScaleSiteInspectionViewPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetScaleSiteInspectionDetail.mockReset();
    mockDeleteScaleSiteInspection.mockReset();
    mockDeleteScaleSiteInspection.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(createAuthContextValue());

    mockGetScaleSiteInspectionDetail.mockResolvedValue({
      inspectionId: 12345,
      inspectionTypeDescription: 'Compliance',
      inspectionDate: '2026-03-10',
      inspector: 'Jordan Smith',
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      siteLocation: 'Nanaimo',
      siteOwnerName: 'ACME FOREST PRODUCTS LTD.',
      siteTypeDisplay: 'Weight Scale, Piece Scale',
      previousInspectionId: 12001,
      recipient: 'Jordan Smith',
      siteOperatorPresentDescription: 'Yes',
      comments: 'General comments',
      questionResponses: [
        {
          questionText: 'Was the scale head sealed?',
          inspectionAnswerDescription: 'Yes',
          commentsText: 'Seal intact.',
          followUpRequiredDescription: 'Yes',
          followUpActionText: 'Document follow-up',
          followUpDueDate: '2026-04-01',
          followUpCompletedDescription: 'No',
        },
      ],
    });
  });

  it('loads and renders the inspection detail page', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockGetScaleSiteInspectionDetail).toHaveBeenCalledWith(12345, 'token');
    });

    expect(await screen.findByText('Site Inspection - Compliance')).toBeTruthy();
    expect(screen.getByText('Inspection Report Details')).toBeTruthy();
    expect((screen.getByLabelText('Scale Site Name') as HTMLInputElement).value).toBe('MAIN YARD');
    expect((screen.getByLabelText('Scale Site Owner') as HTMLInputElement).value).toBe('ACME FOREST PRODUCTS LTD.');
    expect((screen.getByLabelText('Site Operator present during Inspection') as HTMLInputElement).value).toBe('Yes');
    expect((screen.getByLabelText('Inspection Date') as HTMLInputElement).value).toBe('2026-03-10');
    expect((screen.getByLabelText('General Comments') as HTMLTextAreaElement).value).toBe('General comments');
    expect(screen.getByText('Questions')).toBeTruthy();
    expect(screen.getByText('Was the scale head sealed?')).toBeTruthy();
    expect(screen.getByText('Document follow-up')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send / View Report' })).toBeTruthy();
    expect((screen.getByText('Delete').closest('button') as HTMLButtonElement | null)?.disabled).toBe(false);
  });

  it('keeps the page in a loading state while the detail request is still pending', async () => {
    const deferred = createDeferred<{
      inspectionId: number;
      inspectionTypeDescription: string;
      inspectionDate: string;
      inspector: string;
      scaleSiteIdNmbr: string;
      siteName: string;
      siteLocation: string;
      siteOwnerName: string;
      siteTypeDisplay: string;
      previousInspectionId: number;
      recipient: string;
      siteOperatorPresentDescription: string;
      comments: string;
      questionResponses: Array<{
        questionText: string;
        inspectionAnswerDescription: string;
        commentsText: string;
        followUpRequiredDescription: string;
        followUpActionText: string;
        followUpDueDate: string;
        followUpCompletedDescription: string;
      }>;
    }>();

    mockGetScaleSiteInspectionDetail.mockImplementationOnce(() => deferred.promise);

    renderPage();

    await waitFor(() => {
      expect(mockGetScaleSiteInspectionDetail).toHaveBeenCalledWith(12345, 'token');
    });

    expect(screen.queryByText('Could not load inspection')).toBeNull();

    deferred.resolve({
      inspectionId: 12345,
      inspectionTypeDescription: 'Compliance',
      inspectionDate: '2026-03-10',
      inspector: 'Jordan Smith',
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      siteLocation: 'Nanaimo',
      siteOwnerName: 'ACME FOREST PRODUCTS LTD.',
      siteTypeDisplay: 'Weight Scale, Piece Scale',
      previousInspectionId: 12001,
      recipient: 'Jordan Smith',
      siteOperatorPresentDescription: 'Yes',
      comments: 'General comments',
      questionResponses: [
        {
          questionText: 'Was the scale head sealed?',
          inspectionAnswerDescription: 'Yes',
          commentsText: 'Seal intact.',
          followUpRequiredDescription: 'Yes',
          followUpActionText: 'Document follow-up',
          followUpDueDate: '2026-04-01',
          followUpCompletedDescription: 'No',
        },
      ],
    });

    expect(await screen.findByText('Inspection Report Details')).toBeTruthy();
  });

  it('navigates to the inspection edit page', async () => {
    renderPage();

    const editButton = await screen.findByRole('button', { name: 'Edit Record' });
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/SITE001/inspections/edit/12345');
  });

  it('navigates to the scale site compliance report for the inspection', async () => {
    renderPage();

    const reportButton = await screen.findByRole('button', { name: 'Send / View Report' });
    fireEvent.click(reportButton);

    expect(mockNavigate).toHaveBeenCalledWith('/reports/scale-site-compliance/12345');
  });

  it('preserves the scale-site return context when navigating to edit', async () => {
    renderPage('/scale-sites/SITE001/inspections/view/12345');

    const editButton = await screen.findByRole('button', { name: 'Edit Record' });
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/SITE001/inspections/edit/12345');
  });

  it('shows an empty-state message when the inspection id route param is invalid', async () => {
    renderPage('/scale-sites/SITE001/inspections/view/abc');

    expect(await screen.findByText('Inspection not available')).toBeTruthy();
    expect(screen.getByText('A valid inspection id was not provided in the route.')).toBeTruthy();
    expect(mockGetScaleSiteInspectionDetail).not.toHaveBeenCalled();
  });

  it('shows an error empty state when the detail request fails', async () => {
    mockGetScaleSiteInspectionDetail.mockRejectedValueOnce(new Error('Backend unavailable'));

    renderPage();

    expect(await screen.findByText('Could not load inspection')).toBeTruthy();
    expect(screen.getByText('Backend unavailable')).toBeTruthy();
  });

  it('navigates back to the originating scale-site inspections tab when context is present', async () => {
    renderPage('/scale-sites/SITE001/inspections/view/12345');

    const backButton = await screen.findByRole('button', { name: 'Back' });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/view/SITE001?tab=inspections');
  });

  it('cancels the delete confirm modal without calling the delete API', async () => {
    renderPage();

    const deleteButton = (await screen.findByText('Delete')).closest('button') as HTMLButtonElement;
    fireEvent.click(deleteButton);

    expect(await screen.findByText('Are you sure you want to delete this record?')).toBeTruthy();

    fireEvent.click((screen.getByText('Cancel').closest('button') as HTMLButtonElement));

    expect(mockDeleteScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('navigates to the scale-site inspections tab after a successful delete', async () => {
    renderPage();

    fireEvent.click(((await screen.findByText('Delete')).closest('button') as HTMLButtonElement));
    fireEvent.click(((await screen.findByText('Confirm Delete')).closest('button') as HTMLButtonElement));

    await waitFor(() => {
      expect(mockDeleteScaleSiteInspection).toHaveBeenCalledWith(12345, 'token');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/view/SITE001?tab=inspections');
    });
  });

  it('shows an error banner when the delete request fails', async () => {
    mockDeleteScaleSiteInspection.mockRejectedValueOnce({
      response: { data: { message: 'Inspection 12345 cannot be deleted.' } },
    });

    renderPage();

    fireEvent.click(((await screen.findByText('Delete')).closest('button') as HTMLButtonElement));
    fireEvent.click(((await screen.findByText('Confirm Delete')).closest('button') as HTMLButtonElement));

    expect(await screen.findByText('Inspection 12345 cannot be deleted.')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});


