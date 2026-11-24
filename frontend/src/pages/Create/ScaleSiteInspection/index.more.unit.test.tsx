import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import CreateScaleSiteInspection from './index';

const GUID = 'F5E59074276C40558FF6A17CF1AB3EC2';

const question = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

const init = (questions: unknown[]) =>
  apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit.mockResolvedValue({
    scaleSiteIdNmbr: 'SS-1',
    siteName: 'North Yard',
    questionResponses: questions,
  } as never);

beforeEach(() => {
  resetApiMock();
  apiMock.lov.getStaticLov.mockResolvedValue([
    { code: 'INS', description: 'Routine' },
    { code: 'AUT', description: 'Automated' },
  ]);
  apiMock.lov.getScaleMethodTypeLov.mockResolvedValue([
    { code: 'WT', description: 'Weight' },
    { code: 'W', description: 'Weight Scale' },
  ]);
  init([question()]);
});

const renderPage = () =>
  renderWithProviders(<CreateScaleSiteInspection />, {
    route: '/scale-sites/SS-1/inspections/create',
    path: '/scale-sites/:scaleSiteIdNmbr/inspections/create',
  });

const stageOne = async (container: HTMLElement, type = 'INS', siteType = 'WT') => {
  await waitFor(() => expect(container.querySelector('#inspection-type-code')).not.toBeNull());
  fireEvent.change(controlById(container, 'inspection-type-code'), { target: { value: type } });
  fireEvent.click(controlById(container, `site-type-code-${siteType}`));
  await userEvent.click(screen.getByRole('button', { name: /^Next$/i }));
};

const advance = async (container: HTMLElement, type = 'INS', siteType = 'WT') => {
  await stageOne(container, type, siteType);
  await waitFor(() => expect(container.querySelector('#inspector')).not.toBeNull());
};

const fillHeader = (container: HTMLElement) => {
  fireEvent.change(controlById(container, 'inspector'), { target: { value: GUID } });
  fireEvent.change(controlById(container, 'inspection-date'), { target: { value: '2026-01-01' } });
  fireEvent.change(controlById(container, 'site-operator-present'), { target: { value: 'Y' } });
};

const answer = (container: HTMLElement, value = 'Y') =>
  fireEvent.change(controlById(container, 'question-answer-1'), { target: { value } });

const save = async () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
const create = () => apiMock.scaleSiteInspections.createScaleSiteInspection;
const firstQuestionSent = () => create().mock.calls[0][1].questionResponses[0];

describe('Create Scale Site Inspection — automated inspections', () => {
  // Picking the automated type forces the site type to Weight Scale, so the
  // "wrong site type" refusal cannot be reached from the screen.
  it('forces the site type to Weight Scale for an automated inspection', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.querySelector('#inspection-type-code')).not.toBeNull());
    fireEvent.click(controlById(container, 'site-type-code-WT'));
    fireEvent.change(controlById(container, 'inspection-type-code'), { target: { value: 'AUT' } });

    expect(controlById(container, 'site-type-code-W')).toBeChecked();
    expect(controlById(container, 'site-type-code-WT')).not.toBeChecked();
  });

  it('lets an automated inspection through on a weight scale', async () => {
    const { container } = renderPage();

    await advance(container, 'AUT', 'W');

    expect(apiMock.scaleSiteInspections.getScaleSiteInspectionCreateInit).toHaveBeenCalled();
  });
});

describe('Create Scale Site Inspection — follow-up', () => {
  it('demands the follow-up details once follow-up is required', async () => {
    init([question({ followUpCompletedInd: '' })]);
    const { container } = renderPage();

    await advance(container);
    fillHeader(container);
    answer(container);
    fireEvent.change(controlById(container, 'question-follow-up-required-1'), { target: { value: 'Y' } });
    await save();

    expect((await screen.findAllByText('Action Required is required when follow-up is required.')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Due Date is required when follow-up is required.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Complete? is required when follow-up is required.').length).toBeGreaterThan(0);
    expect(create()).not.toHaveBeenCalled();
  });

  it('sends the follow-up details with the create', async () => {
    create().mockResolvedValue({ inspectionId: 9 });
    const { container } = renderPage();

    await advance(container);
    fillHeader(container);
    answer(container);
    fireEvent.change(controlById(container, 'question-follow-up-required-1'), { target: { value: 'Y' } });
    fireEvent.change(controlById(container, 'question-follow-up-action-1'), { target: { value: 'Clear the deck' } });
    fireEvent.change(controlById(container, 'question-follow-up-due-date-1'), { target: { value: '2026-02-01' } });
    fireEvent.change(controlById(container, 'question-follow-up-completed-1'), { target: { value: 'N' } });
    fireEvent.change(controlById(container, 'question-comments-1'), { target: { value: 'Debris on deck' } });
    await save();

    await waitFor(() => expect(create()).toHaveBeenCalled());
    expect(firstQuestionSent()).toMatchObject({
      inspectionAnswerCode: 'Y',
      followUpRequiredInd: 'Y',
      followUpActionText: 'Clear the deck',
      followUpDueDate: '2026-02-01',
      followUpCompletedInd: 'N',
      commentsText: 'Debris on deck',
    });
  });

  it('drops the follow-up details when follow-up is switched back to No', async () => {
    create().mockResolvedValue({ inspectionId: 9 });
    const { container } = renderPage();

    await advance(container);
    fillHeader(container);
    answer(container);
    fireEvent.change(controlById(container, 'question-follow-up-required-1'), { target: { value: 'Y' } });
    fireEvent.change(controlById(container, 'question-follow-up-action-1'), { target: { value: 'Clear the deck' } });
    fireEvent.change(controlById(container, 'question-follow-up-due-date-1'), { target: { value: '2026-02-01' } });
    fireEvent.change(controlById(container, 'question-follow-up-required-1'), { target: { value: 'N' } });
    await save();

    await waitFor(() => expect(create()).toHaveBeenCalled());
    const sent = firstQuestionSent();
    expect(sent.followUpRequiredInd).toBe('N');
    expect(sent.followUpActionText ?? '').toBe('');
    expect(sent.followUpDueDate ?? '').toBe('');
  });

  it('insists on a follow-up choice when the questionnaire leaves it blank', async () => {
    init([question({ followUpRequiredInd: '' })]);
    const { container } = renderPage();

    await advance(container);
    fillHeader(container);
    answer(container);
    await save();

    expect((await screen.findAllByText('Follow-Up Required is required.')).length).toBeGreaterThan(0);
    expect(create()).not.toHaveBeenCalled();
  });

  it('clears the follow-up complaint once a choice is made', async () => {
    init([question({ followUpRequiredInd: '' })]);
    const { container } = renderPage();

    await advance(container);
    fillHeader(container);
    answer(container);
    await save();
    await screen.findAllByText('Follow-Up Required is required.');

    fireEvent.change(controlById(container, 'question-follow-up-required-1'), { target: { value: 'N' } });

    expect(screen.queryByText('Follow-Up Required is required.')).not.toBeInTheDocument();
  });
});

describe('Create Scale Site Inspection — follow-up to a previous inspection', () => {
  it.each(['0', '-3', '1.5'])('rejects "%s" as a previous inspection number', async (bad) => {
    const { container } = renderPage();

    await advance(container);
    fillHeader(container);
    answer(container);
    fireEvent.change(controlById(container, 'previous-inspection-id'), { target: { value: bad } });
    await save();

    expect((await screen.findAllByText('Follow-up to Inspection # must be a positive whole number.')).length).toBeGreaterThan(0);
    expect(create()).not.toHaveBeenCalled();
  });

  it('accepts a whole positive previous inspection number', async () => {
    create().mockResolvedValue({ inspectionId: 9 });
    const { container } = renderPage();

    await advance(container);
    fillHeader(container);
    answer(container);
    fireEvent.change(controlById(container, 'previous-inspection-id'), { target: { value: ' 12 ' } });
    await save();

    await waitFor(() => expect(create()).toHaveBeenCalled());
    expect(JSON.stringify(create().mock.calls[0][1])).toContain('12');
  });
});

describe('Create Scale Site Inspection — odd replies', () => {
  it('warns when the create succeeds without returning an id', async () => {
    create().mockResolvedValue({});
    const { container } = renderPage();

    await advance(container);
    fillHeader(container);
    answer(container);
    await save();

    expect(
      (await screen.findAllByText('Inspection was created but no inspection id was returned.')).length,
    ).toBeGreaterThan(0);
  });

  it('cleans up the answer options it is given', async () => {
    init([
      question({
        answerOptions: [{ code: '', description: 'Blank code' }, { code: 'M' }, { code: 'Y', description: 'Yes' }],
        inspectionAnswerCode: 'Q',
        inspectionAnswerDescription: 'Legacy answer',
      }),
    ]);
    const { container } = renderPage();

    await advance(container);

    const texts = Array.from(controlById<HTMLSelectElement>(container, 'question-answer-1').options).map((o) => o.textContent);
    expect(texts).not.toContain('Blank code');
    expect(texts).toContain('M');
    expect(texts).toContain('Legacy answer');
    expect(texts.indexOf('Legacy answer')).toBeLessThan(texts.indexOf('M'));
  });
});
