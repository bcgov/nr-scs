// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import ScalerRiskAssessmentEditPage from './index';
import ScalerRiskAssessmentViewPage from '@/pages/View/ScalerRiskAssessment';

const mockNavigate = vi.fn();
const mockGetScalerRiskAssessment = vi.fn();
const mockUpdateScalerRiskAssessment = vi.fn();

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
    scalerRiskAssessments: {
      getScalerRiskAssessment: (...args: unknown[]) => mockGetScalerRiskAssessment(...args),
      updateScalerRiskAssessment: (...args: unknown[]) => mockUpdateScalerRiskAssessment(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

describe('ScalerRiskAssessmentEditPage', () => {
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

  // Two-section template (Consequences (C) + Likelihood (L)), mirroring the legacy scaler form.
  // Selected answers: Activity=3, Timber=4 -> section1 = 7; PastPerf=5, Knowledge=4 -> section2 = 9.
  // Grand total is the PRODUCT of section totals: 7 * 9 = 63.
  const stubDetail = {
    riskQuestionnaireId: 42,
    scalerLicenceNo: 'LIC123',
    clientName: 'JOHN DOE',
    orgUnitName: 'Vancouver Island Natural Resource District',
    districtName: 'Vancouver Island Natural Resource District',
    regionName: 'South Coast Natural Resource Region',
    templateId: 7,
    maxRiskRating: 100,
    comments: 'Some comments',
    sections: [
      {
        sectionId: 1,
        sectionDescription: 'Consequences (C)',
        sectionOrder: 1,
        questions: [
          {
            questionId: 11,
            questionText: 'Activity Level',
            questionOrder: 1,
            selectedAnswerId: 102,
            answers: [
              { answerId: 101, answerText: 'Low activity', weight: 1, answerOrder: 1 },
              { answerId: 102, answerText: 'Medium activity', weight: 3, answerOrder: 2 },
              { answerId: 103, answerText: 'High activity', weight: 5, answerOrder: 3 },
            ],
          },
          {
            questionId: 12,
            questionText: 'Value of Timber',
            questionOrder: 2,
            selectedAnswerId: 202,
            answers: [
              { answerId: 201, answerText: '$.25 - $15/m3', weight: 2, answerOrder: 1 },
              { answerId: 202, answerText: '> $15/m3', weight: 4, answerOrder: 2 },
            ],
          },
        ],
      },
      {
        sectionId: 2,
        sectionDescription: 'Likelihood of a Detrimental Event (L)',
        sectionOrder: 2,
        questions: [
          {
            questionId: 21,
            questionText: 'Past Performance',
            questionOrder: 1,
            selectedAnswerId: 301,
            answers: [
              { answerId: 301, answerText: '00', weight: 5, answerOrder: 1 },
              { answerId: 302, answerText: '01', weight: 6, answerOrder: 2 },
            ],
          },
          {
            questionId: 22,
            questionText: 'Knowledge and Experience',
            questionOrder: 2,
            selectedAnswerId: 401,
            answers: [
              { answerId: 401, answerText: 'Good', weight: 4, answerOrder: 1 },
              { answerId: 402, answerText: 'Poor', weight: 2, answerOrder: 2 },
            ],
          },
        ],
      },
    ],
    riskRatings: [
      {
        riskTypeCode: 'VH',
        codeDescription: 'Very High',
        ratingDescription: '12 checks for every 12 months',
        rangeLowValue: 50,
        rangeHighValue: 100,
      },
      {
        riskTypeCode: 'L',
        codeDescription: 'Low',
        ratingDescription: '2 checks for every 12 months',
        rangeLowValue: 2,
        rangeHighValue: 17,
      },
    ],
  };

  // Mode is driven by the URL: /view/:id (view) vs /edit/:id (edit). Edit-interaction tests render
  // directly at /edit/42 because navigate() is mocked and does not change the location.
  const renderPage = (initialEntry = '/scaler-risk-assessments/view/42') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path="/scaler-risk-assessments/view/:riskQuestionnaireId"
              element={<ScalerRiskAssessmentViewPage />}
            />
            <Route
              path="/scaler-risk-assessments/edit/:riskQuestionnaireId"
              element={<ScalerRiskAssessmentEditPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    return queryClient;
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetScalerRiskAssessment.mockReset();
    mockUpdateScalerRiskAssessment.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
    mockGetScalerRiskAssessment.mockResolvedValue(stubDetail);
    mockUpdateScalerRiskAssessment.mockResolvedValue(stubDetail);
  });

  it('loads and renders the data-driven assessment, computing the product total', async () => {
    renderPage();

    await screen.findByDisplayValue('LIC123');

    expect(mockGetScalerRiskAssessment).toHaveBeenCalledWith(42, 'token');
    expect((screen.getByLabelText('Licence #') as HTMLInputElement).value).toBe('LIC123');
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('JOHN DOE');
    expect((screen.getByLabelText('Region') as HTMLInputElement).value).toBe('South Coast Natural Resource Region');
    expect((screen.getByLabelText('District') as HTMLInputElement).value).toBe('Vancouver Island Natural Resource District');
    expect((screen.getByLabelText('Risk Assessment ID') as HTMLInputElement).value).toBe('42');
    // Section headers come straight from the template data.
    expect(screen.getByText('Consequences (C)')).toBeTruthy();
    expect(screen.getByText('Likelihood of a Detrimental Event (L)')).toBeTruthy();
    // Dropdowns are populated from the template and pre-select the saved answer.
    expect((screen.getByLabelText('Activity Level') as HTMLSelectElement).value).toBe('102');
    expect((screen.getByLabelText('Knowledge and Experience') as HTMLSelectElement).value).toBe('401');
    // Grand total = product of section totals (7 * 9 = 63).
    expect((screen.getByLabelText('Total') as HTMLInputElement).value).toBe('63');
    // Maximum Total = product of each section's max weights ((5+4) * (6+4) = 90), computed from the
    // template (not the view's SUM-based max_risk_rating), so it is always >= the total.
    expect((screen.getByLabelText('Maximum Total') as HTMLInputElement).value).toBe('90');
    expect((screen.getByLabelText('Comments') as HTMLTextAreaElement).value).toBe('Some comments');
    // Risk levels come from the API: "<codeDescription> Risk - <ratingDescription>", with the
    // top row shown as ">= low" and the rest as "low - high".
    expect(screen.getByText('Very High Risk - 12 checks for every 12 months')).toBeTruthy();
    expect(screen.getByText('Low Risk - 2 checks for every 12 months')).toBeTruthy();
    expect(screen.getByText('>= 50')).toBeTruthy();
    expect(screen.getByText('2 - 17')).toBeTruthy();
  });

  it('renders legacy embedded HTML/entities without leaking markup', async () => {
    mockGetScalerRiskAssessment.mockResolvedValueOnce({
      ...stubDetail,
      sections: [
        {
          sectionId: 1,
          sectionDescription: 'Values (A)',
          sectionOrder: 1,
          questions: [
            {
              questionId: 99,
              questionText: 'Activity Level<font size="1"><br/>(determined by scalers)</font>',
              questionOrder: 1,
              selectedAnswerId: 501,
              answers: [
                { answerId: 501, answerText: '> 40,000 m&sup3; or weight', weight: 9, answerOrder: 1 },
              ],
            },
          ],
        },
      ],
    });

    renderPage();

    await screen.findByDisplayValue('LIC123');
    // Guidance text inside the legacy tags renders as text, not literal markup.
    expect(screen.getAllByText(/determined by scalers/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/<font/)).toBeNull();
    // The &sup3; entity is decoded to a superscript 3 in the dropdown option.
    expect(screen.getByRole('option', { name: '> 40,000 m³ or weight' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /&sup3;/ })).toBeNull();
  });

  it('recomputes the product total when an answer changes', async () => {
    renderPage('/scaler-risk-assessments/edit/42');

    await screen.findByDisplayValue('LIC123');

    // Change Activity Level from Medium (3) to High (5): section1 = 5 + 4 = 9; total = 9 * 9 = 81.
    fireEvent.change(screen.getByLabelText('Activity Level'), { target: { value: '103' } });

    expect((screen.getByLabelText('Total') as HTMLInputElement).value).toBe('81');
  });

  it('shows an error notification and keeps Edit disabled when the route id is invalid', async () => {
    renderPage('/scaler-risk-assessments/view/abc');

    expect(await screen.findByText('Invalid Risk Assessment ID.')).toBeTruthy();
    expect(mockGetScalerRiskAssessment).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows an error notification and keeps Edit disabled when the data fetch fails', async () => {
    mockGetScalerRiskAssessment.mockRejectedValueOnce(new Error('Server error'));

    renderPage();

    expect(await screen.findByText('Server error')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('view mode shows Edit and clicking it navigates to the edit URL', async () => {
    renderPage();

    await screen.findByDisplayValue('LIC123');
    const editButton = screen.getByRole('button', { name: 'Edit' });
    expect(screen.queryByRole('button', { name: 'Save Assessment' })).toBeNull();

    fireEvent.click(editButton);
    expect(mockNavigate).toHaveBeenCalledWith('/scaler-risk-assessments/edit/42');
  });

  it('edit mode shows reset and save buttons (no Edit)', async () => {
    renderPage('/scaler-risk-assessments/edit/42');

    await screen.findByDisplayValue('LIC123');

    expect(screen.getByRole('button', { name: 'Reset' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save Assessment' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('reset restores changed fields but remains in edit mode', async () => {
    renderPage('/scaler-risk-assessments/edit/42');

    await screen.findByDisplayValue('LIC123');

    fireEvent.change(screen.getByLabelText('Comments'), { target: { value: 'Changed comments' } });

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByRole('button', { name: 'Save Assessment' })).toBeTruthy();
    expect((screen.getByLabelText('Comments') as HTMLTextAreaElement).value).toBe('Some comments');
  });

  it('caps the Comments field at 4000 characters', async () => {
    renderPage('/scaler-risk-assessments/edit/42');

    await screen.findByDisplayValue('LIC123');

    const comments = screen.getByLabelText('Comments') as HTMLTextAreaElement;
    expect(comments.maxLength).toBe(4000);
  });

  it('save sends the current values to the API and navigates to the record risk rating tab', async () => {
    renderPage('/scaler-risk-assessments/edit/42');

    await screen.findByDisplayValue('LIC123');
    fireEvent.change(screen.getByLabelText('Comments'), { target: { value: 'Updated comments' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Assessment' }));

    await waitFor(() => {
      expect(mockUpdateScalerRiskAssessment).toHaveBeenCalledWith(
        42,
        {
          comments: 'Updated comments',
          responses: [
            { questionId: 11, answerId: 102 },
            { questionId: 12, answerId: 202 },
            { questionId: 21, answerId: 301 },
            { questionId: 22, answerId: 401 },
          ],
        },
        'token',
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/scalers/view/LIC123?tab=risk-rating');
    });
  });

  it('shows an error notification when save fails', async () => {
    mockUpdateScalerRiskAssessment.mockRejectedValueOnce({
      response: { data: { message: 'Update failed' } },
    });

    renderPage('/scaler-risk-assessments/edit/42');

    await screen.findByDisplayValue('LIC123');
    fireEvent.click(screen.getByRole('button', { name: 'Save Assessment' }));

    expect(await screen.findByText('Update failed')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Edit mirrors create (this supersedes the earlier ERR-002 "at least one answer" rule): leaving ANY
  // question unanswered is rejected with a clear message and kept on the form - it must not reach the
  // API. A sub-complete assessment rates below the lowest risk band, which the banded view filters
  // out, so it would otherwise vanish from the Risk Rating tab and searches.
  it('rejects a save that leaves any question unanswered, keeping the user on the form', async () => {
    renderPage('/scaler-risk-assessments/edit/42');

    await screen.findByDisplayValue('LIC123');

    // Clear a single answer — the assessment is no longer fully answered, so the save must be blocked.
    fireEvent.change(screen.getByLabelText('Activity Level'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Assessment' }));

    expect(
      await screen.findByText(
        'All questions must be answered in order to save the assessment.',
      ),
    ).toBeTruthy();
    expect(mockUpdateScalerRiskAssessment).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Regression: a save that moves the assessment into a different Risk Level band used to leave
  // the scaler record's Risk Rating tab showing the pre-save rating until a manual browser
  // refresh. The tab's query defaults to refetchOnMount:false with a 3h staleTime, so returning to
  // it re-served the cached row; only create dropped that cache, update did not.
  it('save drops the cached Risk Rating tab list so the new Risk Level is not served stale', async () => {
    const queryClient = renderPage('/scaler-risk-assessments/edit/42');
    const ratingsKey = ['scaler-risk-ratings', 'LIC123'];
    queryClient.setQueryData(ratingsKey, [{ riskQuestionnaireId: 1, codeDescription: 'Medium' }]);

    await screen.findByDisplayValue('LIC123');
    fireEvent.click(screen.getByRole('button', { name: 'Save Assessment' }));

    await waitFor(() => {
      expect(mockUpdateScalerRiskAssessment).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(queryClient.getQueryData(ratingsKey)).toBeUndefined();
    });
  });
  it('back button navigates to the record risk rating tab', async () => {
    renderPage();

    // Wait for the assessment (and its owning record) to load, so Back has the record id.
    await screen.findByDisplayValue('LIC123');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(mockNavigate).toHaveBeenCalledWith('/scalers/view/LIC123?tab=risk-rating');
  });
});
