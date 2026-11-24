import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import CreateScalerRiskAssessment from './Create/ScalerRiskAssessment';
import CreateScaleSiteRiskAssessment from './Create/ScaleSiteRiskAssessment';
import EditScalerRiskAssessment from './Edit/ScalerRiskAssessment';
import EditScaleSiteRiskAssessment from './Edit/ScaleSiteRiskAssessment';
import ViewScalerRiskAssessment from './View/ScalerRiskAssessment';
import ViewScaleSiteRiskAssessment from './View/ScaleSiteRiskAssessment';

const sections = [
  {
    sectionId: 1,
    sectionDescription: 'Site conditions',
    questions: [
      {
        questionId: 10,
        questionText: 'How busy is the site?',
        selectedAnswerId: null,
        answers: [
          { answerId: 100, answerText: 'Quiet', weight: 1 },
          { answerId: 101, answerText: 'Busy', weight: 5 },
        ],
      },
    ],
  },
];

const scalerDetail = (overrides: Record<string, unknown> = {}) => ({
  riskQuestionnaireId: 7,
  scalerLicenceNo: 'S1234',
  clientName: 'Acme Forestry',
  regionName: 'Coast',
  districtName: 'DCK',
  sections,
  ...overrides,
});

const siteDetail = (overrides: Record<string, unknown> = {}) => ({
  riskQuestionnaireId: 7,
  scaleSiteIdNmbr: 'SS-1',
  siteName: 'North Yard',
  sections,
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.scalerRiskAssessments.getScalerRiskAssessmentCreateInit.mockResolvedValue(
    scalerDetail({ riskQuestionnaireId: null }),
  );
  apiMock.scalerRiskAssessments.getScalerRiskAssessment.mockResolvedValue(scalerDetail());
  apiMock.scaleSiteRiskAssessments.getScaleSiteRiskAssessmentCreateInit.mockResolvedValue(
    siteDetail({ riskQuestionnaireId: null }),
  );
  apiMock.scaleSiteRiskAssessments.getScaleSiteRiskAssessment.mockResolvedValue(siteDetail());
});

describe('Create Scaler Risk Assessment', () => {
  const renderPage = () =>
    renderWithProviders(<CreateScalerRiskAssessment />, {
      route: '/scalers/S1234/risk-assessments/create',
      path: '/scalers/:scalerLicenceNo/risk-assessments/create',
    });

  it('loads the create-init questionnaire for the scaler in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(
        apiMock.scalerRiskAssessments.getScalerRiskAssessmentCreateInit,
      ).toHaveBeenCalled(),
    );
    expect(
      apiMock.scalerRiskAssessments.getScalerRiskAssessmentCreateInit.mock.calls[0][0],
    ).toBe('S1234');
  });

  it('shows the scaler header fields', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.querySelector('#scaler-licence-no')).not.toBeNull());
    expect(container.querySelector('#client-name')).not.toBeNull();
    expect(container.querySelector('#region-name')).not.toBeNull();
    expect(container.querySelector('#district-name')).not.toBeNull();
  });

  it('renders the questionnaire sections', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.textContent ?? '').toContain('Site conditions'));
    expect(container.textContent ?? '').toContain('How busy is the site?');
  });

  it('creates nothing merely by loading', async () => {
    renderPage();

    await waitFor(() =>
      expect(
        apiMock.scalerRiskAssessments.getScalerRiskAssessmentCreateInit,
      ).toHaveBeenCalled(),
    );
    expect(apiMock.scalerRiskAssessments.createScalerRiskAssessment).not.toHaveBeenCalled();
  });

  it('surfaces a failed create-init', async () => {
    apiMock.scalerRiskAssessments.getScalerRiskAssessmentCreateInit.mockRejectedValue(
      new Error('Questionnaire unavailable.'),
    );
    const { container } = renderPage();

    await waitFor(() =>
      expect(
        apiMock.scalerRiskAssessments.getScalerRiskAssessmentCreateInit,
      ).toHaveBeenCalled(),
    );
    expect(container.textContent ?? '').not.toContain('How busy is the site?');
  });

  it('records an answer when a weight is chosen', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.textContent ?? '').toContain('How busy is the site?'));
    // Each question is answered through a select whose options are the weighted answers.
    const answer = container.querySelector('select[id^="question-"]') as HTMLSelectElement | null;
    expect(answer).not.toBeNull();
    const chosen = Array.from(answer!.options).at(-1)!.value;
    expect(chosen).not.toBe('');
    fireEvent.change(answer!, { target: { value: chosen } });
    expect(answer!.value).toBe(chosen);
  });
});

describe('Create Scale Site Risk Assessment', () => {
  const renderPage = () =>
    renderWithProviders(<CreateScaleSiteRiskAssessment />, {
      route: '/scale-sites/SS-1/risk-assessments/create',
      path: '/scale-sites/:scaleSiteIdNmbr/risk-assessments/create',
    });

  it('loads the create-init questionnaire for the site in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(
        apiMock.scaleSiteRiskAssessments.getScaleSiteRiskAssessmentCreateInit,
      ).toHaveBeenCalled(),
    );
  });

  it('renders the questionnaire sections', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.textContent ?? '').toContain('Site conditions'));
  });

  it('creates nothing merely by loading', async () => {
    renderPage();

    await waitFor(() =>
      expect(
        apiMock.scaleSiteRiskAssessments.getScaleSiteRiskAssessmentCreateInit,
      ).toHaveBeenCalled(),
    );
    expect(
      apiMock.scaleSiteRiskAssessments.createScaleSiteRiskAssessment,
    ).not.toHaveBeenCalled();
  });
});

describe('Edit Scaler Risk Assessment', () => {
  const renderPage = () =>
    renderWithProviders(<EditScalerRiskAssessment />, {
      route: '/scaler-risk-assessments/7',
      path: '/scaler-risk-assessments/:riskQuestionnaireId',
    });

  it('loads the assessment named in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scalerRiskAssessments.getScalerRiskAssessment).toHaveBeenCalled(),
    );
  });

  it('renders the questionnaire', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.textContent ?? '').toContain('Site conditions'));
  });

  it('updates nothing merely by loading', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scalerRiskAssessments.getScalerRiskAssessment).toHaveBeenCalled(),
    );
    expect(apiMock.scalerRiskAssessments.updateScalerRiskAssessment).not.toHaveBeenCalled();
  });

  it('surfaces a failed load', async () => {
    apiMock.scalerRiskAssessments.getScalerRiskAssessment.mockRejectedValue(
      new Error('Assessment unavailable.'),
    );
    const { container } = renderPage();

    await waitFor(() =>
      expect(apiMock.scalerRiskAssessments.getScalerRiskAssessment).toHaveBeenCalled(),
    );
    expect(container.textContent ?? '').not.toContain('How busy is the site?');
  });
});

describe('Edit Scale Site Risk Assessment', () => {
  const renderPage = () =>
    renderWithProviders(<EditScaleSiteRiskAssessment />, {
      route: '/scale-site-risk-assessments/7',
      path: '/scale-site-risk-assessments/:riskQuestionnaireId',
    });

  it('loads the assessment named in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scaleSiteRiskAssessments.getScaleSiteRiskAssessment).toHaveBeenCalled(),
    );
  });

  it('renders the questionnaire', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.textContent ?? '').toContain('Site conditions'));
  });

  it('updates nothing merely by loading', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scaleSiteRiskAssessments.getScaleSiteRiskAssessment).toHaveBeenCalled(),
    );
    expect(
      apiMock.scaleSiteRiskAssessments.updateScaleSiteRiskAssessment,
    ).not.toHaveBeenCalled();
  });
});

describe('View risk assessments', () => {
  it('loads the scaler assessment named in the route', async () => {
    renderWithProviders(<ViewScalerRiskAssessment />, {
      route: '/scaler-risk-assessments/7/view',
      path: '/scaler-risk-assessments/:riskQuestionnaireId/view',
    });

    await waitFor(() =>
      expect(apiMock.scalerRiskAssessments.getScalerRiskAssessment).toHaveBeenCalled(),
    );
  });

  it('renders the scaler questionnaire read-only', async () => {
    const { container } = renderWithProviders(<ViewScalerRiskAssessment />, {
      route: '/scaler-risk-assessments/7/view',
      path: '/scaler-risk-assessments/:riskQuestionnaireId/view',
    });

    await waitFor(() => expect(container.textContent ?? '').toContain('Site conditions'));
    expect(apiMock.scalerRiskAssessments.updateScalerRiskAssessment).not.toHaveBeenCalled();
  });

  it('loads the scale site assessment named in the route', async () => {
    renderWithProviders(<ViewScaleSiteRiskAssessment />, {
      route: '/scale-site-risk-assessments/7/view',
      path: '/scale-site-risk-assessments/:riskQuestionnaireId/view',
    });

    await waitFor(() =>
      expect(apiMock.scaleSiteRiskAssessments.getScaleSiteRiskAssessment).toHaveBeenCalled(),
    );
  });

  it('renders the scale site questionnaire read-only', async () => {
    const { container } = renderWithProviders(<ViewScaleSiteRiskAssessment />, {
      route: '/scale-site-risk-assessments/7/view',
      path: '/scale-site-risk-assessments/:riskQuestionnaireId/view',
    });

    await waitFor(() => expect(container.textContent ?? '').toContain('Site conditions'));
    expect(
      apiMock.scaleSiteRiskAssessments.updateScaleSiteRiskAssessment,
    ).not.toHaveBeenCalled();
  });
});

describe('Risk assessment — saving', () => {
  const renderCreate = () =>
    renderWithProviders(<CreateScalerRiskAssessment />, {
      route: '/scalers/S1234/risk-assessments/create',
      path: '/scalers/:scalerLicenceNo/risk-assessments/create',
    });
  const renderEdit = () =>
    renderWithProviders(<EditScalerRiskAssessment />, {
      route: '/scaler-risk-assessments/7',
      path: '/scaler-risk-assessments/:riskQuestionnaireId',
    });
  const questionReady = async (container: HTMLElement) =>
    waitFor(() => expect(container.querySelector('#question-10')).not.toBeNull());
  const save = async () => userEvent.click(screen.getByRole('button', { name: /Save Assessment/i }));

  it('refuses to create while any question is unanswered', async () => {
    const { container } = renderCreate();

    await questionReady(container);
    await save();

    expect(
      (await screen.findAllByText('All questions must be answered in order to save the assessment.')).length,
    ).toBeGreaterThan(0);
    expect(apiMock.scalerRiskAssessments.createScalerRiskAssessment).not.toHaveBeenCalled();
  });

  it('creates once every question is answered, then goes to the new record', async () => {
    apiMock.scalerRiskAssessments.createScalerRiskAssessment.mockResolvedValue(
      scalerDetail({ riskQuestionnaireId: 99 }),
    );
    const { container } = renderCreate();

    await questionReady(container);
    fireEvent.change(container.querySelector('#question-10')!, { target: { value: '101' } });
    await save();

    await waitFor(() =>
      expect(apiMock.scalerRiskAssessments.createScalerRiskAssessment).toHaveBeenCalled(),
    );
    const [licence, payload] = apiMock.scalerRiskAssessments.createScalerRiskAssessment.mock.calls[0];
    expect(licence).toBe('S1234');
    expect(payload.responses).toEqual([expect.objectContaining({ questionId: 10, answerId: 101 })]);
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/scalers/view/S1234'));
  });

  it('sends the comments box value even when it is empty, so a cleared comment clears', async () => {
    apiMock.scalerRiskAssessments.createScalerRiskAssessment.mockResolvedValue(scalerDetail());
    const { container } = renderCreate();

    await questionReady(container);
    fireEvent.change(container.querySelector('#question-10')!, { target: { value: '100' } });
    await save();

    await waitFor(() =>
      expect(apiMock.scalerRiskAssessments.createScalerRiskAssessment).toHaveBeenCalled(),
    );
    const [, payload] = apiMock.scalerRiskAssessments.createScalerRiskAssessment.mock.calls[0];
    expect('comments' in payload).toBe(true);
  });

  it('reports a failed create and stays put', async () => {
    apiMock.scalerRiskAssessments.createScalerRiskAssessment.mockRejectedValue(
      new Error('Create refused.'),
    );
    const { container } = renderCreate();

    await questionReady(container);
    fireEvent.change(container.querySelector('#question-10')!, { target: { value: '100' } });
    await save();

    expect((await screen.findAllByText(/Create refused\./i)).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('updates an existing assessment and returns to its record', async () => {
    apiMock.scalerRiskAssessments.updateScalerRiskAssessment.mockResolvedValue(scalerDetail());
    const { container } = renderEdit();

    await questionReady(container);
    fireEvent.change(container.querySelector('#question-10')!, { target: { value: '101' } });
    await save();

    await waitFor(() =>
      expect(apiMock.scalerRiskAssessments.updateScalerRiskAssessment).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ responses: expect.any(Array) }),
        expect.anything(),
      ),
    );
    expect(navigate).toHaveBeenCalled();
  });

  it('restores the loaded answers on reset', async () => {
    apiMock.scalerRiskAssessments.getScalerRiskAssessment.mockResolvedValue(
      scalerDetail({
        sections: [
          {
            ...sections[0],
            questions: [{ ...sections[0].questions[0], selectedAnswerId: 100 }],
          },
        ],
      }),
    );
    const { container } = renderEdit();

    await questionReady(container);
    await waitFor(() => expect(container.querySelector('#question-10')).toHaveValue('100'));
    fireEvent.change(container.querySelector('#question-10')!, { target: { value: '101' } });
    expect(container.querySelector('#question-10')).toHaveValue('101');
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(container.querySelector('#question-10')).toHaveValue('100'));
  });
});
