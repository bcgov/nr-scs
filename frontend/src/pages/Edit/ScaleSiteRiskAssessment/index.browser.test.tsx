import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/config/tests/setup-env';
import type { AuthContextType } from '@/context/auth/AuthContext';
import { SYS_ADMIN_ROLE } from '@/context/auth/types';
import * as authModule from '@/context/auth/useAuth';

import ScaleSiteRiskAssessmentEditPage from './index';
import ScaleSiteRiskAssessmentViewPage from '@/pages/View/ScaleSiteRiskAssessment';

const mockNavigate = vi.fn();
const mockGetScaleSiteRiskAssessment = vi.fn();
const mockUpdateScaleSiteRiskAssessment = vi.fn();

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
    scaleSiteRiskAssessments: {
      getScaleSiteRiskAssessment: (...args: unknown[]) => mockGetScaleSiteRiskAssessment(...args),
      updateScaleSiteRiskAssessment: (...args: unknown[]) => mockUpdateScaleSiteRiskAssessment(...args),
    },
  },
}));

vi.mock('@/components/core/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

describe('ScaleSiteRiskAssessmentEditPage', () => {
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

  // Two-section template. Selected: Activity=3, Timber=4 -> section1 = 7;
  // PerfIssues=5, Complexity=4 -> section2 = 9. Grand total = PRODUCT = 7 * 9 = 63.
  const stubDetail = {
    riskQuestionnaireId: 99,
    scaleSiteIdNmbr: 'SITE001',
    siteName: 'MAIN YARD',
    regionName: 'Kootenay-Boundary Natural Resource Region',
    districtName: 'Rocky Mountain Natural Resource District',
    templateId: 7,
    maxRiskRating: 100,
    comments: 'Initial comment',
    sections: [
      {
        sectionId: 1,
        sectionDescription: 'Values (A)',
        sectionOrder: 1,
        questions: [
          {
            questionId: 11,
            questionText: 'Activity Level',
            questionOrder: 1,
            selectedAnswerId: 102,
            answers: [
              { answerId: 101, answerText: 'Low', weight: 1, answerOrder: 1 },
              { answerId: 102, answerText: 'Medium', weight: 3, answerOrder: 2 },
              { answerId: 103, answerText: 'High', weight: 5, answerOrder: 3 },
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
        sectionDescription: 'Likelihood of a Detrimental Event (B)',
        sectionOrder: 2,
        questions: [
          {
            questionId: 21,
            questionText: 'Performance Issues',
            questionOrder: 1,
            selectedAnswerId: 301,
            answers: [
              { answerId: 301, answerText: '00', weight: 5, answerOrder: 1 },
              { answerId: 302, answerText: '01', weight: 6, answerOrder: 2 },
            ],
          },
          {
            questionId: 22,
            questionText: 'Complexity of Scaling Events',
            questionOrder: 2,
            selectedAnswerId: 401,
            answers: [
              { answerId: 401, answerText: 'Low', weight: 4, answerOrder: 1 },
              { answerId: 402, answerText: 'High', weight: 2, answerOrder: 2 },
            ],
          },
        ],
      },
    ],
    riskRatings: [
      {
        riskTypeCode: 'H',
        codeDescription: 'High',
        ratingDescription: '9 checks for every 12 months',
        rangeLowValue: 50,
        rangeHighValue: 100,
      },
      {
        riskTypeCode: 'L',
        codeDescription: 'Low',
        ratingDescription: '2 checks for every 12 months',
        rangeLowValue: 0,
        rangeHighValue: 20,
      },
    ],
  };

  // Mode is set by the route's component: /view/:id renders the View wrapper (read-only) and
  // /edit/:id the Edit wrapper. Edit-interaction tests render directly at /edit/99 because
  // navigate() is mocked and does not change the location.
  const renderPage = (initialEntry = '/scale-site-risk-assessments/view/99') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path="/scale-site-risk-assessments/view/:riskQuestionnaireId"
              element={<ScaleSiteRiskAssessmentViewPage />}
            />
            <Route
              path="/scale-site-risk-assessments/edit/:riskQuestionnaireId"
              element={<ScaleSiteRiskAssessmentEditPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    return queryClient;
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetScaleSiteRiskAssessment.mockReset();
    mockUpdateScaleSiteRiskAssessment.mockReset();
    mockUseAuth.mockReturnValue(createAuthContextValue());
    mockGetScaleSiteRiskAssessment.mockResolvedValue(stubDetail);
    mockUpdateScaleSiteRiskAssessment.mockResolvedValue(stubDetail);
  });

  it('loads and renders the data-driven assessment, computing the product total', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('SITE001')).toBeTruthy();
    expect((screen.getByLabelText('Scale Site #') as HTMLInputElement).value).toBe('SITE001');
    expect((screen.getByLabelText('Site Name') as HTMLInputElement).value).toBe('MAIN YARD');
    expect((screen.getByLabelText('Region') as HTMLInputElement).value).toBe('Kootenay-Boundary Natural Resource Region');
    expect((screen.getByLabelText('District') as HTMLInputElement).value).toBe('Rocky Mountain Natural Resource District');
    expect((screen.getByLabelText('Risk Assessment ID') as HTMLInputElement).value).toBe('99');
    expect(screen.getByText('Values (A)')).toBeTruthy();
    expect(screen.getByText('Likelihood of a Detrimental Event (B)')).toBeTruthy();
    expect((screen.getByLabelText('Activity Level') as HTMLSelectElement).value).toBe('102');
    expect((screen.getByLabelText('Total') as HTMLInputElement).value).toBe('63');
    // Maximum Total = product of each section's max weights ((5+4) * (6+4) = 90), computed from the
    // template (not the view's SUM-based max_risk_rating), so it is always >= the total.
    expect((screen.getByLabelText('Maximum Total') as HTMLInputElement).value).toBe('90');
    // Risk levels: "<codeDescription> Risk - <ratingDescription>", top row shown as ">= low".
    expect(screen.getByText('High Risk - 9 checks for every 12 months')).toBeTruthy();
    expect(screen.getByText('Low Risk - 2 checks for every 12 months')).toBeTruthy();
    expect(screen.getByText('>= 50')).toBeTruthy();
    expect(screen.getByText('0 - 20')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save Assessment' })).toBeNull();
  });

  it('recomputes the product total when an answer changes', async () => {
    renderPage('/scale-site-risk-assessments/edit/99');

    await screen.findByDisplayValue('SITE001');

    // Activity Medium (3) -> High (5): section1 = 5 + 4 = 9; total = 9 * 9 = 81.
    fireEvent.change(screen.getByLabelText('Activity Level'), { target: { value: '103' } });

    expect((screen.getByLabelText('Total') as HTMLInputElement).value).toBe('81');
  });

  it('renders legacy embedded HTML/entities without leaking markup', async () => {
    mockGetScaleSiteRiskAssessment.mockResolvedValueOnce({
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

    await screen.findByDisplayValue('SITE001');
    expect(screen.getAllByText(/determined by scalers/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/<font/)).toBeNull();
    expect(screen.getByRole('option', { name: '> 40,000 m³ or weight' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /&sup3;/ })).toBeNull();
  });

  it('shows an error notification and keeps Edit disabled when the route id is invalid', async () => {
    renderPage('/scale-site-risk-assessments/view/abc');

    expect(await screen.findByText('Invalid Risk Assessment ID.')).toBeTruthy();
    expect(mockGetScaleSiteRiskAssessment).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows an error notification when the load request fails', async () => {
    mockGetScaleSiteRiskAssessment.mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    expect(await screen.findByText('Network error')).toBeTruthy();
  });

  it('view mode shows Edit and clicking it navigates to the edit URL', async () => {
    renderPage();

    await screen.findByDisplayValue('SITE001');
    const editButton = screen.getByRole('button', { name: 'Edit' });
    expect(screen.queryByRole('button', { name: 'Save Assessment' })).toBeNull();

    fireEvent.click(editButton);
    expect(mockNavigate).toHaveBeenCalledWith('/scale-site-risk-assessments/edit/99');
  });

  /**
   * Risk assessment takes the access level a role has on the record's other tabs, so a read-only
   * internal column reads assessments and authors none. `SCS_CLERICAL` is that case: it holds
   * `SCALE_SITE_RISK_ASSESSMENT_READ` and not `_UPDATE`, so view mode must not offer it an Edit button
   * that lands on `/unauthorized`.
   *
   * (This was pinned on `SCS_DIST_SCALING_MANAGER` while §D's lone `CR` was read as the ceiling and
   * *no* column held `_UPDATE`. That column now authors assessments, so the fixture moved to one that
   * genuinely cannot.)
   */
  it('hides the view-mode Edit button from a role that cannot edit an assessment', async () => {
    mockUseAuth.mockReturnValue({
      ...createAuthContextValue(),
      user: { roles: ['SCS_CLERICAL'], privileges: {} },
    });

    renderPage();

    await screen.findByDisplayValue('SITE001');
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    // Still a reader: Back remains, so the page is not a dead end.
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });

  it('edit mode shows reset and save buttons (no Edit)', async () => {
    renderPage('/scale-site-risk-assessments/edit/99');

    await screen.findByDisplayValue('SITE001');

    expect(screen.getByRole('button', { name: 'Reset' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save Assessment' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('resets selections to their loaded state on Reset click', async () => {
    renderPage('/scale-site-risk-assessments/edit/99');

    await screen.findByDisplayValue('SITE001');

    const activitySelect = screen.getByLabelText('Activity Level') as HTMLSelectElement;
    fireEvent.change(activitySelect, { target: { value: '103' } });
    expect(activitySelect.value).toBe('103');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(activitySelect.value).toBe('102');
  });

  it('caps the Comments field at 4000 characters', async () => {
    renderPage('/scale-site-risk-assessments/edit/99');

    await screen.findByDisplayValue('SITE001');

    const comments = screen.getByLabelText('Comments') as HTMLTextAreaElement;
    expect(comments.maxLength).toBe(4000);
  });

  it('sends responses + comments to the API and navigates to the record risk rating tab on save', async () => {
    renderPage('/scale-site-risk-assessments/edit/99');

    await screen.findByDisplayValue('SITE001');

    fireEvent.change(screen.getByLabelText('Comments'), { target: { value: 'Updated comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Assessment' }));

    await waitFor(() => {
      expect(mockUpdateScaleSiteRiskAssessment).toHaveBeenCalledWith(
        99,
        {
          comments: 'Updated comment',
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
      expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/view/SITE001?tab=risk-rating');
    });
  });

  it('shows an error notification when save fails', async () => {
    mockUpdateScaleSiteRiskAssessment.mockRejectedValueOnce(new Error('Save failed'));

    renderPage('/scale-site-risk-assessments/edit/99');

    await screen.findByDisplayValue('SITE001');
    fireEvent.click(screen.getByRole('button', { name: 'Save Assessment' }));

    expect(await screen.findByText('Save failed')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Edit mirrors create (this supersedes the earlier ERR-002 "at least one answer" rule): leaving ANY
  // question unanswered is rejected with a clear message and kept on the form - it must not reach the
  // API. A sub-complete assessment rates below the lowest risk band, which the banded view filters
  // out, so it would otherwise vanish from the Risk Rating tab and searches.
  it('rejects a save that leaves any question unanswered, keeping the user on the form', async () => {
    renderPage('/scale-site-risk-assessments/edit/99');

    await screen.findByDisplayValue('SITE001');

    // Clear a single answer — the assessment is no longer fully answered, so the save must be blocked.
    fireEvent.change(screen.getByLabelText('Activity Level'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Assessment' }));

    expect(
      await screen.findByText(
        'All questions must be answered in order to save the assessment.',
      ),
    ).toBeTruthy();
    expect(mockUpdateScaleSiteRiskAssessment).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Regression: a save that moves the assessment into a different Risk Level band used to leave
  // the scale site record's Risk Rating tab showing the pre-save rating until a manual browser
  // refresh. The tab's query defaults to refetchOnMount:false with a 3h staleTime, so returning to
  // it re-served the cached row; only create dropped that cache, update did not.
  it('save drops the cached Risk Rating tab list so the new Risk Level is not served stale', async () => {
    const queryClient = renderPage('/scale-site-risk-assessments/edit/99');
    const ratingsKey = ['scale-site-risk-ratings', 'SITE001'];
    queryClient.setQueryData(ratingsKey, [{ riskQuestionnaireId: 1, codeDescription: 'Medium' }]);

    await screen.findByDisplayValue('SITE001');
    fireEvent.click(screen.getByRole('button', { name: 'Save Assessment' }));

    await waitFor(() => {
      expect(mockUpdateScaleSiteRiskAssessment).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(queryClient.getQueryData(ratingsKey)).toBeUndefined();
    });
  });
  it('navigates back to the record risk rating tab on Back click', async () => {
    renderPage();

    // Wait for the assessment (and its owning record) to load, so Back has the record id.
    await screen.findByDisplayValue('SITE001');
    const backButton = await screen.findByRole('button', { name: 'Back' });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/scale-sites/view/SITE001?tab=risk-rating');
  });
});
