import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import CreateScaleSiteInspection from './index';

const questions = [
  {
    inspectionQuestionId: 1,
    questionText: 'Is the deck clear?',
    sortOrder: 1,
    answerOptions: [
      { code: 'Y', description: 'Yes' },
      { code: 'N', description: 'No' },
    ],
    inspectionAnswerCode: '',
    commentsText: '',
    followUpRequiredInd: 'N',
    followUpCompletedInd: 'N',
  },
];

beforeEach(() => {
  resetApiMock();
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'INS', description: 'Routine' }]);
  apiMock.lov.getScaleMethodTypeLov.mockResolvedValue([{ code: 'WT', description: 'Weight' }]);
  apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit.mockResolvedValue({
    scaleSiteIdNmbr: 'SS-1',
    siteName: 'North Yard',
    questionResponses: questions,
  });
});

const renderPage = (route = '/scale-sites/SS-1/inspections/create') =>
  renderWithProviders(<CreateScaleSiteInspection />, {
    route,
    path: '/scale-sites/:scaleSiteIdNmbr/inspections/create',
  });

/** Stage one is a type + site-type picker; the questionnaire only loads after Next. */
const stageOne = async (container: HTMLElement) =>
  waitFor(() => expect(container.querySelector('#inspection-type-code')).not.toBeNull());

describe('Create Scale Site Inspection — route guard', () => {
  // Rendered outside a matching route, so useParams yields no scale site number at all.
  const renderUnrouted = () => renderWithProviders(<CreateScaleSiteInspection />);

  it('refuses to start without a scale site number in the route', async () => {
    renderUnrouted();

    expect(
      await screen.findByText('A valid scale site number was not provided in the route.'),
    ).toBeInTheDocument();
  });

  it('does not load anything without a scale site number', async () => {
    renderUnrouted();

    await screen.findByText('A valid scale site number was not provided in the route.');
    expect(
      apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit,
    ).not.toHaveBeenCalled();
    expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled();
  });
});

describe('Create Scale Site Inspection — stage one', () => {
  it('renders the inspection type and site type pickers', async () => {
    const { container } = renderPage();

    await stageOne(container);
    expect(container.querySelector('#site-type-code-WT')).not.toBeNull();
  });

  it('loads both lookups', async () => {
    renderPage();

    await waitFor(() => expect(apiMock.lov.getStaticLov).toHaveBeenCalled());
    await waitFor(() => expect(apiMock.lov.getScaleMethodTypeLov).toHaveBeenCalled());
  });

  it('offers Back and Next', async () => {
    const { container } = renderPage();

    await stageOne(container);
    expect(screen.getByRole('button', { name: /^Next$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Back$/i })).toBeInTheDocument();
  });

  it('does not load the questionnaire before Next is pressed', async () => {
    const { container } = renderPage();

    await stageOne(container);
    expect(
      apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit,
    ).not.toHaveBeenCalled();
  });

  it('refuses to advance without an inspection type', async () => {
    const { container } = renderPage();

    await stageOne(container);
    await userEvent.click(screen.getByRole('button', { name: /^Next$/i }));

    await waitFor(() =>
      expect(
        apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit,
      ).not.toHaveBeenCalled(),
    );
  });

  it('loads the questionnaire once a type and site type are chosen', async () => {
    const { container } = renderPage();

    await stageOne(container);
    fireEvent.change(controlById(container, 'inspection-type-code'), {
      target: { value: 'INS' },
    });
    fireEvent.click(controlById(container, 'site-type-code-WT'));
    await userEvent.click(screen.getByRole('button', { name: /^Next$/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit).toHaveBeenCalled(),
    );
  });

  it('passes the route site number and the chosen options to the loader', async () => {
    const { container } = renderPage();

    await stageOne(container);
    fireEvent.change(controlById(container, 'inspection-type-code'), {
      target: { value: 'INS' },
    });
    fireEvent.click(controlById(container, 'site-type-code-WT'));
    await userEvent.click(screen.getByRole('button', { name: /^Next$/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit).toHaveBeenCalled(),
    );
    const call = apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit.mock.calls[0];
    expect(call[0]).toBe('SS-1');
    expect(call[1]).toBe('INS');
  });

  it('creates nothing during stage one', async () => {
    const { container } = renderPage();

    await stageOne(container);
    expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled();
  });
});

describe('Create Scale Site Inspection — stage two', () => {
  const advance = async (container: HTMLElement) => {
    await stageOne(container);
    fireEvent.change(controlById(container, 'inspection-type-code'), {
      target: { value: 'INS' },
    });
    fireEvent.click(controlById(container, 'site-type-code-WT'));
    await userEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit).toHaveBeenCalled(),
    );
  };

  it('renders the questionnaire returned by the loader', async () => {
    const { container } = renderPage();

    await advance(container);
    await waitFor(() => expect(container.textContent ?? '').toContain('Is the deck clear?'));
  });

  it('renders the stage two header fields', async () => {
    const { container } = renderPage();

    await advance(container);
    await waitFor(() => expect(container.querySelector('#inspector')).not.toBeNull());
    expect(container.querySelector('#inspection-date')).not.toBeNull();
    expect(container.querySelector('#site-operator-present')).not.toBeNull();
    expect(container.querySelector('#inspection-comments')).not.toBeNull();
  });

  it('refuses to create an inspection with nothing filled in', async () => {
    const { container } = renderPage();

    await advance(container);
    await waitFor(() => expect(container.querySelector('#inspector')).not.toBeNull());
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled(),
    );
  });

  it('keeps the stage two values that were entered', async () => {
    const { container } = renderPage();

    await advance(container);
    await waitFor(() => expect(container.querySelector('#inspector')).not.toBeNull());
    fireEvent.change(controlById(container, 'inspector'), { target: { value: 'Jane Smith' } });
    fireEvent.change(controlById(container, 'inspection-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'inspection-comments'), {
      target: { value: 'All clear' },
    });

    expect(controlById(container, 'inspector')).toHaveValue('Jane Smith');
    expect(controlById(container, 'inspection-date')).toHaveValue('2026-01-01');
    expect(controlById(container, 'inspection-comments')).toHaveValue('All clear');
  });

  it('offers Reset and Save Record in stage two', async () => {
    const { container } = renderPage();

    await advance(container);
    await waitFor(() => expect(container.querySelector('#inspector')).not.toBeNull());
    expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeInTheDocument();
  });

  it('records an answer chosen in the question select', async () => {
    const { container } = renderPage();

    await advance(container);
    await waitFor(() => expect(container.querySelector('#question-answer-1')).not.toBeNull());
    fireEvent.change(controlById(container, 'question-answer-1'), { target: { value: 'Y' } });

    expect(controlById(container, 'question-answer-1')).toHaveValue('Y');
  });

  it('survives a questionnaire that comes back empty', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit.mockResolvedValue({
      scaleSiteIdNmbr: 'SS-1',
      questionResponses: [],
    });
    const { container } = renderPage();

    await advance(container);
    expect(container.textContent ?? '').not.toBe('');
  });

  it('surfaces a failed questionnaire load', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit.mockRejectedValue(
      new Error('Inspection options unavailable.'),
    );
    const { container } = renderPage();

    await advance(container);
    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('does not create until the questionnaire is submitted', async () => {
    const { container } = renderPage();

    await advance(container);
    expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled();
  });
});

describe('Create Scale Site Inspection — through to save', () => {
  const GUID = 'F5E59074276C40558FF6A17CF1AB3EC2';

  const advance = async (container: HTMLElement) => {
    await stageOne(container);
    fireEvent.change(controlById(container, 'inspection-type-code'), {
      target: { value: 'INS' },
    });
    fireEvent.click(controlById(container, 'site-type-code-WT'));
    await userEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    await waitFor(() => expect(container.querySelector('#inspector')).not.toBeNull());
  };

  /** Fills every stage-two field the validator requires, including the one question's answer. */
  const fillStageTwo = (container: HTMLElement) => {
    fireEvent.change(controlById(container, 'inspector'), { target: { value: GUID } });
    fireEvent.change(controlById(container, 'inspection-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'site-operator-present'), { target: { value: 'Y' } });
    // Each question's answer is a select keyed by its question id.
    const answer = container.querySelector('#question-answer-1');
    expect(answer, 'the question select should be on screen').not.toBeNull();
    fireEvent.change(answer!, { target: { value: 'Y' } });
  };

  it('creates the inspection once stage two is complete', async () => {
    apiMock.scaleSiteInspections.createScaleSiteInspection.mockResolvedValue({ inspectionId: 9 });
    const { container } = renderPage();

    await advance(container);
    fillStageTwo(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.createScaleSiteInspection).toHaveBeenCalled(),
    );
  });

  it('sends the stage one choices with the create', async () => {
    apiMock.scaleSiteInspections.createScaleSiteInspection.mockResolvedValue({ inspectionId: 9 });
    const { container } = renderPage();

    await advance(container);
    fillStageTwo(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.createScaleSiteInspection).toHaveBeenCalled(),
    );
    const payload = JSON.stringify(apiMock.scaleSiteInspections.createScaleSiteInspection.mock.calls[0]);
    expect(payload).toContain('"inspectionTypeCode":"INS"');
    expect(payload).toContain('"siteTypeCodes":["WT"]');
  });

  it('reports a failed create and keeps the form', async () => {
    apiMock.scaleSiteInspections.createScaleSiteInspection.mockRejectedValue(
      new Error('Create refused.'),
    );
    const { container } = renderPage();

    await advance(container);
    fillStageTwo(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.createScaleSiteInspection).toHaveBeenCalled(),
    );
    expect(container.querySelector('#inspector')).not.toBeNull();
    expect(controlById(container, 'inspector')).toHaveValue(GUID);
  });

  it('refuses an inspector that is not a user GUID', async () => {
    const { container } = renderPage();

    await advance(container);
    fillStageTwo(container);
    fireEvent.change(controlById(container, 'inspector'), { target: { value: 'Jane Smith' } });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('Inspector must be a valid user GUID.')).length).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('refuses an unanswered question', async () => {
    const { container } = renderPage();

    await advance(container);
    fireEvent.change(controlById(container, 'inspector'), { target: { value: GUID } });
    fireEvent.change(controlById(container, 'inspection-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'site-operator-present'), { target: { value: 'Y' } });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('Answer is required.')).length).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('refuses an inspection date in the future', async () => {
    const { container } = renderPage();

    await advance(container);
    fillStageTwo(container);
    fireEvent.change(controlById(container, 'inspection-date'), { target: { value: '2099-01-01' } });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('Inspection Date cannot be in the future.')).length).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('caps each comment field at its legacy length while typing', async () => {
    const { container } = renderPage();

    await advance(container);

    expect(controlById(container, 'inspection-comments')).toHaveAttribute('maxlength', '2000');
    expect(controlById(container, 'question-comments-1')).toHaveAttribute('maxlength', '4000');
    expect(controlById(container, 'question-follow-up-action-1')).toHaveAttribute('maxlength', '4000');
  });

  it('refuses General Comments over 2000 characters', async () => {
    const { container } = renderPage();

    await advance(container);
    fillStageTwo(container);
    fireEvent.change(controlById(container, 'inspection-comments'), {
      target: { value: 'x'.repeat(2001) },
    });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(
      (await screen.findAllByText('General Comments must be 2000 characters or fewer.')).length,
    ).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('refuses question Comments over 4000 characters', async () => {
    const { container } = renderPage();

    await advance(container);
    fillStageTwo(container);
    fireEvent.change(controlById(container, 'question-comments-1'), {
      target: { value: 'x'.repeat(4001) },
    });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(
      (await screen.findAllByText('Comments must be 4000 characters or fewer.')).length,
    ).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('refuses Action Required over 4000 characters', async () => {
    const { container } = renderPage();

    await advance(container);
    fillStageTwo(container);
    fireEvent.change(controlById(container, 'question-follow-up-required-1'), {
      target: { value: 'Y' },
    });
    fireEvent.change(controlById(container, 'question-follow-up-action-1'), {
      target: { value: 'x'.repeat(4001) },
    });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(
      (await screen.findAllByText('Action Required must be 4000 characters or fewer.')).length,
    ).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('clears stage two on reset', async () => {
    const { container } = renderPage();

    await advance(container);
    fireEvent.change(controlById(container, 'inspector'), { target: { value: GUID } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(controlById(container, 'inspector')).toHaveValue(''));
  });
});

describe('Create Scale Site Inspection — server field errors', () => {
  it('inlines a field error the backend returns against its field', async () => {
    apiMock.scaleSiteInspections.createScaleSiteInspection.mockRejectedValue({ response: { status: 400, data: { message: 'Validation failed', fieldErrors: [{ field: 'inspectionDate', message: 'Inspection date is before the previous inspection.' }] } } });
    const { container } = renderPage();

    await stageOne(container);
    fireEvent.change(controlById(container, 'inspection-type-code'), { target: { value: 'INS' } });
    fireEvent.click(controlById(container, 'site-type-code-WT'));
    await userEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    await waitFor(() => expect(container.querySelector('#inspector')).not.toBeNull());
    fireEvent.change(controlById(container, 'inspector'), { target: { value: 'F5E59074276C40558FF6A17CF1AB3EC2' } });
    fireEvent.change(controlById(container, 'inspection-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'site-operator-present'), { target: { value: 'Y' } });
    const answer = container.querySelector('#question-answer-1');
    expect(answer, 'the question select should be on screen').not.toBeNull();
    fireEvent.change(answer!, { target: { value: 'Y' } });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('Inspection date is before the previous inspection.')).length).toBeGreaterThan(0);
  });
});

describe('Create Scale Site Inspection — navigating back', () => {
  it('returns to stage one from Back, dropping the loaded questionnaire', async () => {
    const { container } = renderPage();

    await stageOne(container);
    fireEvent.change(controlById(container, 'inspection-type-code'), { target: { value: 'INS' } });
    fireEvent.click(controlById(container, 'site-type-code-WT'));
    await userEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    await waitFor(() => expect(container.querySelector('#inspector')).not.toBeNull());
    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));

    await waitFor(() => expect(container.querySelector('#inspection-type-code')).not.toBeNull());
    expect(container.querySelector('#inspector')).toBeNull();
  });

  it('Back in stage one leaves the page without creating anything', async () => {
    const { container } = renderPage();

    await stageOne(container);
    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));

    expect(apiMock.scaleSiteInspections.createScaleSiteInspection).not.toHaveBeenCalled();
  });
});
