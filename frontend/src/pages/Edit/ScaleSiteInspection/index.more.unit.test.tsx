import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import EditScaleSiteInspection from './index';

const answeredQuestion = (overrides: Record<string, unknown> = {}) => ({
  inspectionQuestionId: 1,
  questionText: 'Is the deck clear?',
  sortOrder: 1,
  answerOptions: [
    { code: 'Y', description: 'Yes' },
    { code: 'N', description: 'No' },
  ],
  inspectionAnswerCode: 'Y',
  commentsText: '',
  followUpRequiredInd: 'N',
  followUpCompletedInd: 'N',
  followUpActionText: '',
  followUpDueDate: '',
  ...overrides,
});

const detail = (overrides: Record<string, unknown> = {}) => ({
  inspectionId: 7,
  scaleSiteIdNmbr: 'SS-1',
  siteName: 'North Yard',
  siteLocation: 'North of the bridge',
  ownerName: 'Acme Forestry',
  inspectionTypeDescription: 'Routine',
  siteTypeDisplay: 'Weight',
  inspectionDate: '2026-01-01',
  inspector: 'F5E59074276C40558FF6A17CF1AB3EC2',
  inspectorName: 'Jane Smith',
  recipient: 'R',
  siteOperatorPresentInd: 'Y',
  comments: '',
  questionResponses: [answeredQuestion()],
  ...overrides,
});

const load = (d: unknown) => apiMock.scaleSiteInspections.getScaleSiteInspectionEdit.mockResolvedValue(d as never);

beforeEach(() => {
  resetApiMock();
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'INS', description: 'Routine' }]);
  apiMock.lov.getScaleMethodTypeLov.mockResolvedValue([{ code: 'WT', description: 'Weight' }]);
  load(detail());
});

const renderPage = (route = '/scale-sites/SS-1/inspections/7/edit') =>
  renderWithProviders(<EditScaleSiteInspection />, {
    route,
    path: '/scale-sites/:scaleSiteIdNmbr/inspections/:inspectionId/edit',
  });

const loaded = async (container: HTMLElement) =>
  waitFor(() => expect(controlById(container, 'inspection-scale-site-number')).toHaveValue('SS-1'));

const save = async () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
const update = () => apiMock.scaleSiteInspections.updateScaleSiteInspection;
const set = (container: HTMLElement, id: string, value: string) =>
  fireEvent.change(controlById(container, id), { target: { value } });

describe('Edit Scale Site Inspection — route guard', () => {
  it('loads nothing for an inspection id that is not a number', async () => {
    renderPage('/scale-sites/SS-1/inspections/abc/edit');

    expect(await screen.findByText('Scale Site SS-1')).toBeInTheDocument();
    expect(apiMock.scaleSiteInspections.getScaleSiteInspectionEdit).not.toHaveBeenCalled();
  });
});

describe('Edit Scale Site Inspection — header validation', () => {
  it.each([
    ['inspection-date', '', 'Inspection Date is required.'],
    ['inspection-date', '2099-01-01', 'Inspection Date cannot be in the future.'],
    ['inspector', '', 'Inspector # is required.'],
    ['inspector', 'not-a-guid', 'Inspector must be a valid user GUID.'],
    ['site-operator-present', '', 'Site Operator present during Inspection is required.'],
  ])('refuses %s = "%s"', async (id, value, message) => {
    const { container } = renderPage();

    await loaded(container);
    set(container, id, value);
    await save();

    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
    expect(update()).not.toHaveBeenCalled();
  });

  it('clears a header complaint once the field is corrected', async () => {
    const { container } = renderPage();

    await loaded(container);
    set(container, 'inspector', '');
    await save();
    await screen.findAllByText('Inspector # is required.');

    set(container, 'inspector', 'F5E59074276C40558FF6A17CF1AB3EC2');

    expect(screen.queryByText('Inspector # is required.')).not.toBeInTheDocument();
  });
});

describe('Edit Scale Site Inspection — follow-up', () => {
  it('names every missing follow-up detail', async () => {
    load(detail({ questionResponses: [answeredQuestion({ followUpRequiredInd: 'Y', followUpCompletedInd: '' })] }));
    const { container } = renderPage();

    await loaded(container);
    await save();

    expect((await screen.findAllByText('Action Required is required when follow-up is required.')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Due Date is required when follow-up is required.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Complete? is required when follow-up is required.').length).toBeGreaterThan(0);
  });

  it('saves the follow-up details once they are filled in', async () => {
    update().mockResolvedValue(detail());
    load(detail({ questionResponses: [answeredQuestion({ followUpRequiredInd: 'Y', followUpCompletedInd: '' })] }));
    const { container } = renderPage();

    await loaded(container);
    await save();
    await screen.findAllByText('Action Required is required when follow-up is required.');

    set(container, 'question-follow-up-action-1', 'Clear the deck');
    set(container, 'question-follow-up-due-date-1', '2026-02-01');
    set(container, 'question-follow-up-completed-1', 'Y');
    expect(screen.queryByText('Action Required is required when follow-up is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Due Date is required when follow-up is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Complete? is required when follow-up is required.')).not.toBeInTheDocument();
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    const sent = JSON.stringify(update().mock.calls[0]);
    expect(sent).toContain('Clear the deck');
    expect(sent).toContain('2026-02-01');
  });

  it('drops the follow-up details when follow-up is switched to No', async () => {
    update().mockResolvedValue(detail());
    load(
      detail({
        questionResponses: [
          answeredQuestion({
            followUpRequiredInd: 'Y',
            followUpActionText: 'Clear the deck',
            followUpDueDate: '2026-02-01',
            followUpCompletedInd: 'N',
          }),
        ],
      }),
    );
    const { container } = renderPage();

    await loaded(container);
    set(container, 'question-follow-up-required-1', 'N');
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(JSON.stringify(update().mock.calls[0])).not.toContain('Clear the deck');
  });

  it('insists on a follow-up choice and forgets the complaint once one is made', async () => {
    load(detail({ questionResponses: [answeredQuestion({ followUpRequiredInd: '' })] }));
    const { container } = renderPage();

    await loaded(container);
    await save();
    expect((await screen.findAllByText('Follow-Up Required is required.')).length).toBeGreaterThan(0);

    set(container, 'question-follow-up-required-1', 'N');

    expect(screen.queryByText('Follow-Up Required is required.')).not.toBeInTheDocument();
  });

  it('forgets an answer complaint once the question is answered', async () => {
    load(detail({ questionResponses: [answeredQuestion({ inspectionAnswerCode: '' })] }));
    const { container } = renderPage();

    await loaded(container);
    await save();
    expect((await screen.findAllByText('Answer is required.')).length).toBeGreaterThan(0);

    set(container, 'question-answer-1', 'N');

    expect(screen.queryByText('Answer is required.')).not.toBeInTheDocument();
  });

  it('cleans up the answer options it is given', async () => {
    load(
      detail({
        questionResponses: [
          answeredQuestion({
            answerOptions: [{ code: '', description: 'Blank code' }, { code: 'M' }, { code: 'Y', description: 'Yes' }],
            inspectionAnswerCode: 'Q',
            inspectionAnswerDescription: 'Legacy answer',
          }),
        ],
      }),
    );
    const { container } = renderPage();

    await loaded(container);

    const texts = Array.from(controlById<HTMLSelectElement>(container, 'question-answer-1').options).map((o) => o.textContent);
    expect(texts).not.toContain('Blank code');
    expect(texts).toContain('M');
    expect(texts).toContain('Legacy answer');
  });

  it('normalises odd yes/no values to blank', async () => {
    load(detail({ siteOperatorPresentInd: 'maybe' }));
    const { container } = renderPage();

    await loaded(container);

    expect(controlById(container, 'site-operator-present')).toHaveValue('');
  });
});
