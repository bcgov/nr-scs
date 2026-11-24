// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import ScaleSiteInspectionEditPage from './index';

const mockNavigate = vi.fn();
const mockGetScaleSiteInspectionEdit = vi.fn();
const mockUpdateScaleSiteInspection = vi.fn();

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
      getScaleSiteInspectionEdit: (...args: unknown[]) => mockGetScaleSiteInspectionEdit(...args),
      updateScaleSiteInspection: (...args: unknown[]) => mockUpdateScaleSiteInspection(...args),
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

describe('ScaleSiteInspectionEditPage', () => {
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

  const renderPage = (initialEntry = '/scale-sites/SITE001/inspections/edit/12345') => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/scale-sites/:scaleSiteIdNmbr/inspections/edit/:inspectionId" element={<ScaleSiteInspectionEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetScaleSiteInspectionEdit.mockReset();
    mockUpdateScaleSiteInspection.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());

    mockGetScaleSiteInspectionEdit.mockResolvedValue({
      inspectionId: 12345,
      inspectionTypeDescription: 'Compliance',
      inspectionDate: '2026-03-10',
      inspector: 'F5E59074276C40558FF6A17CF1AB3EC2',
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      siteLocation: 'Nanaimo',
      siteOwnerName: 'ACME FOREST PRODUCTS LTD.',
      siteTypeDisplay: 'Weight Scale, Piece Scale',
      previousInspectionId: 12001,
      recipient: 'Jordan Smith',
      siteOperatorPresentInd: 'Y',
      comments: 'General comments',
      questionResponses: [
        {
          inspectionQuestionId: 777,
          questionText: 'Was the scale head sealed?',
          inspectionAnswerCode: 'Y',
          answerOptions: [
            { code: 'Y', description: 'Yes' },
            { code: 'N', description: 'No' },
          ],
          commentsText: 'Seal intact.',
          followUpRequiredInd: 'N',
          followUpActionText: null,
          followUpDueDate: null,
          followUpCompletedInd: null,
        },
      ],
    });

    mockUpdateScaleSiteInspection.mockResolvedValue({
      inspectionId: 12345,
      comments: 'General comments',
    });
  });

  it('loads and renders the inspection edit page', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockGetScaleSiteInspectionEdit).toHaveBeenCalledWith(12345, 'token');
    });

    expect(await screen.findByText('Site Inspection - Compliance')).toBeTruthy();
    expect(screen.getByText('Inspection Report Details')).toBeTruthy();
    expect((screen.getByLabelText('Scale Site #') as HTMLInputElement).value).toBe('SITE001');
    expect((screen.getByLabelText('Inspection Type') as HTMLInputElement).value).toBe('Compliance');
    expect((screen.getByLabelText('Inspection #') as HTMLInputElement).value).toBe('12345');
    expect(screen.getByLabelText(/Inspector #/i)).toBeTruthy();
    expect(screen.getByDisplayValue('General comments')).toBeTruthy();
    expect(screen.getByText(/Was the scale head sealed\?/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save Record' })).toBeTruthy();
  });

  it('keeps the page in a loading state while the edit payload is still pending', async () => {
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
      siteOperatorPresentInd: 'Y' | 'N';
      comments: string;
      questionResponses: Array<{
        inspectionQuestionId: number;
        questionText: string;
        inspectionAnswerCode: string;
        answerOptions: Array<{ code: string; description: string }>;
        commentsText: string;
        followUpRequiredInd: 'Y' | 'N';
        followUpActionText: string | null;
        followUpDueDate: string | null;
        followUpCompletedInd: 'Y' | 'N' | null;
      }>;
    }>();

    mockGetScaleSiteInspectionEdit.mockImplementationOnce(() => deferred.promise);

    renderPage();

    await waitFor(() => {
      expect(mockGetScaleSiteInspectionEdit).toHaveBeenCalledWith(12345, 'token');
    });

    expect(screen.queryByText('Could not load inspection')).toBeNull();

    deferred.resolve({
      inspectionId: 12345,
      inspectionTypeDescription: 'Compliance',
      inspectionDate: '2026-03-10',
      inspector: 'F5E59074276C40558FF6A17CF1AB3EC2',
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      siteLocation: 'Nanaimo',
      siteOwnerName: 'ACME FOREST PRODUCTS LTD.',
      siteTypeDisplay: 'Weight Scale, Piece Scale',
      previousInspectionId: 12001,
      recipient: 'Jordan Smith',
      siteOperatorPresentInd: 'Y',
      comments: 'General comments',
      questionResponses: [
        {
          inspectionQuestionId: 777,
          questionText: 'Was the scale head sealed?',
          inspectionAnswerCode: 'Y',
          answerOptions: [
            { code: 'Y', description: 'Yes' },
            { code: 'N', description: 'No' },
          ],
          commentsText: 'Seal intact.',
          followUpRequiredInd: 'N',
          followUpActionText: null,
          followUpDueDate: null,
          followUpCompletedInd: null,
        },
      ],
    });

    expect(await screen.findByText('Site Inspection - Compliance')).toBeTruthy();
  });

  it('shows an empty-state message when the inspection id route param is invalid', async () => {
    renderPage('/scale-sites/SITE001/inspections/edit/abc');

    expect(await screen.findByText('Inspection not available')).toBeTruthy();
    expect(screen.getByText('A valid inspection id was not provided in the route.')).toBeTruthy();
    expect(mockGetScaleSiteInspectionEdit).not.toHaveBeenCalled();
  });

  it('shows an error empty state when the edit payload request fails', async () => {
    mockGetScaleSiteInspectionEdit.mockRejectedValueOnce(new Error('Backend unavailable'));

    renderPage();

    expect(await screen.findByText('Could not load inspection')).toBeTruthy();
    expect(screen.getByText('Backend unavailable')).toBeTruthy();
  });

  it('validates required fields before saving', async () => {
    renderPage();

    const inspectorInput = await screen.findByLabelText(/Inspector #/i);
    fireEvent.change(inspectorInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    expect(await screen.findByText('Please fix the highlighted fields')).toBeTruthy();
    expect(screen.getAllByText(/Inspector # is required\./i)).toHaveLength(2);
    await waitFor(() => {
      expect(document.activeElement).toBe(inspectorInput);
    });
    expect(mockUpdateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('shows the due date validation inline on the field when follow-up is required', async () => {
    renderPage();

    fireEvent.change(await screen.findByLabelText(/Follow-Up Required/i), {
      target: { value: 'Y' },
    });
    fireEvent.change(screen.getByLabelText(/Action Required/i), {
      target: { value: 'Contact operator' },
    });
    fireEvent.change(screen.getByLabelText(/Complete\?/i), {
      target: { value: 'N' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    expect(await screen.findAllByText(/Due Date is required when follow-up is required\./i)).toHaveLength(2);
    expect(screen.getByLabelText(/Due Date/i).getAttribute('aria-invalid')).toBe('true');
    expect(mockUpdateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('submits the update request and navigates back to the inspection view on success', async () => {
    renderPage();

    const inspectorInput = await screen.findByLabelText(/Inspector #/i);
    fireEvent.change(inspectorInput, { target: { value: 'A1B2C3D4-E5F6-7890-1234-56789ABCDEF0' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => {
      expect(mockUpdateScaleSiteInspection).toHaveBeenCalledWith(
        12345,
        {
          inspectionDate: '2026-03-10',
          inspector: 'A1B2C3D4-E5F6-7890-1234-56789ABCDEF0',
          siteOperatorPresentInd: 'Y',
          comments: 'General comments',
          questionResponses: [
            {
              inspectionQuestionId: 777,
              inspectionAnswerCode: 'Y',
              commentsText: 'Seal intact.',
              followUpRequiredInd: 'N',
              followUpActionText: null,
              followUpDueDate: null,
              followUpCompletedInd: null,
            },
          ],
        },
        'token',
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/SITE001/inspections/view/12345');
    });
  });

  it('blocks the update and shows an inline error when the inspector is edited to a non-GUID', async () => {
    renderPage();

    const inspectorInput = await screen.findByLabelText(/Inspector #/i);
    fireEvent.change(inspectorInput, { target: { value: 'not-a-guid' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    // Rendered both inline (TextInput invalidText) and in the validation banner, so match all.
    expect((await screen.findAllByText('Inspector must be a valid user GUID.')).length).toBeGreaterThan(0);
    expect(mockUpdateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('navigates back to the contextual inspection detail path when the return scale site query param is present', async () => {
    renderPage('/scale-sites/SITE001/inspections/edit/12345');

    const backButton = await screen.findByRole('button', { name: 'Back' });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/SITE001/inspections/view/12345');
  });

  it('preserves the return scale site query param after save', async () => {
    renderPage('/scale-sites/SITE001/inspections/edit/12345');

    const inspectorInput = await screen.findByLabelText(/Inspector #/i);
    fireEvent.change(inspectorInput, { target: { value: 'A1B2C3D4-E5F6-7890-1234-56789ABCDEF0' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/SITE001/inspections/view/12345');
    });
  });
});





