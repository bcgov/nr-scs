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

beforeEach(() => {
  resetApiMock();
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'INS', description: 'Routine' }]);
  apiMock.lov.getScaleMethodTypeLov.mockResolvedValue([{ code: 'WT', description: 'Weight' }]);
  apiMock.scaleSiteInspections.getScaleSiteInspectionEdit.mockResolvedValue(detail());
});

const renderPage = () =>
  renderWithProviders(<EditScaleSiteInspection />, {
    route: '/scale-sites/SS-1/inspections/7/edit',
    path: '/scale-sites/:scaleSiteIdNmbr/inspections/:inspectionId/edit',
  });

const loaded = async (container: HTMLElement) =>
  waitFor(() =>
    expect(controlById(container, 'inspection-scale-site-number')).toHaveValue('SS-1'),
  );

describe('Edit Scale Site Inspection', () => {
  it('loads the inspection named in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.getScaleSiteInspectionEdit).toHaveBeenCalled(),
    );
  });

  it('shows the scale site identity read-only', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'inspection-scale-site-number')).toHaveValue('SS-1');
    expect(controlById(container, 'inspection-scale-site-name')).toBeInTheDocument();
  });

  it('shows the site location and owner', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'inspection-scale-site-location')).toBeInTheDocument();
    expect(controlById(container, 'inspection-scale-site-owner')).toBeInTheDocument();
  });

  it('shows the inspection type and site type as fixed descriptions', async () => {
    const { container } = renderPage();

    await loaded(container);
    // Type and site type are chosen at create time and cannot be changed here.
    expect(controlById(container, 'inspection-type-description')).toBeInTheDocument();
    expect(controlById(container, 'inspection-site-type-display')).toBeInTheDocument();
  });

  it('renders the editable inspector and operator fields', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'inspector')).toBeInTheDocument();
    expect(controlById(container, 'site-operator-present')).toBeInTheDocument();
  });

  it('offers Back, Reset and Save Record', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Back$/i })).toBeInTheDocument();
  });

  it('updates nothing merely by loading', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('keeps Save disabled when the inspection has no editable questions', async () => {
    // Without questions there is nothing to record, so the page refuses rather than sending an
    // empty inspection. This is a rule, not a loading state.
    apiMock.scaleSiteInspections.getScaleSiteInspectionEdit.mockResolvedValue(
      detail({ questionResponses: [] }),
    );
    const { container } = renderPage();

    await loaded(container);
    expect(screen.getByRole('button', { name: /Save Record/i })).toBeDisabled();
  });

  it('enables Save once there is a question to answer', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(screen.getByRole('button', { name: /Save Record/i })).toBeEnabled();
  });

  it('saves the inspection through the update endpoint', async () => {
    apiMock.scaleSiteInspections.updateScaleSiteInspection.mockResolvedValue(detail());
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).toHaveBeenCalled(),
    );
  });

  it('sends the answers with the update', async () => {
    apiMock.scaleSiteInspections.updateScaleSiteInspection.mockResolvedValue(detail());
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).toHaveBeenCalled(),
    );
    const payload = JSON.stringify(
      apiMock.scaleSiteInspections.updateScaleSiteInspection.mock.calls[0],
    );
    expect(payload).toContain('"inspectionQuestionId":1');
  });

  it('reports a failed save and keeps the form', async () => {
    apiMock.scaleSiteInspections.updateScaleSiteInspection.mockRejectedValue(
      new Error('Save refused.'),
    );
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).toHaveBeenCalled(),
    );
    expect(container.querySelector('#inspector')).not.toBeNull();
  });

  it('refuses to save when the inspector is not a user GUID', async () => {
    // The inspector holds a euser GUID; a name is the mistake a user actually makes.
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'inspector'), { target: { value: 'Jane Smith' } });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('Inspector must be a valid user GUID.')).length).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('refuses to save an unanswered question', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionEdit.mockResolvedValue(
      detail({ questionResponses: [answeredQuestion({ inspectionAnswerCode: '' })] }),
    );
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('Answer is required.')).length).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('demands the follow-up details when follow-up is required', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionEdit.mockResolvedValue(
      detail({ questionResponses: [answeredQuestion({ followUpRequiredInd: 'Y' })] }),
    );
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(
      (await screen.findAllByText('Action Required is required when follow-up is required.'))
        .length,
    ).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('restores the loaded values on reset', async () => {
    const { container } = renderPage();

    await loaded(container);
    const inspector = controlById(container, 'inspector');
    fireEvent.change(inspector, { target: { value: 'Someone Else' } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() =>
      expect(controlById(container, 'inspector')).not.toHaveValue('Someone Else'),
    );
  });

  it('renders the questions the inspection carries', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionEdit.mockResolvedValue(
      detail({
        questionResponses: [
          {
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
          },
        ],
      }),
    );
    const { container } = renderPage();

    await loaded(container);
    await waitFor(() => expect(container.textContent ?? '').toContain('Is the deck clear?'));
  });

  it('surfaces a failed load rather than showing an empty form', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionEdit.mockRejectedValue(
      new Error('Inspection not available.'),
    );
    const { container } = renderPage();

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.getScaleSiteInspectionEdit).toHaveBeenCalled(),
    );
    expect(container.querySelector('#inspection-scale-site-number')).toBeNull();
  });
});

describe('Edit Scale Site Inspection — stage two fields', () => {
  const loadedFields = async (container: HTMLElement) =>
    waitFor(() => expect(container.querySelector('#inspector')).not.toBeNull());

  it('renders the editable header fields', async () => {
    const { container } = renderPage();

    await loadedFields(container);
    expect(container.querySelector('#inspection-date')).not.toBeNull();
    expect(container.querySelector('#inspection-comments')).not.toBeNull();
    expect(container.querySelector('#previous-inspection-id')).not.toBeNull();
  });

  it('keeps edited header values', async () => {
    const { container } = renderPage();

    await loadedFields(container);
    fireEvent.change(controlById(container, 'inspector'), { target: { value: 'Someone Else' } });
    fireEvent.change(controlById(container, 'inspection-comments'), {
      target: { value: 'Follow up needed' },
    });

    expect(controlById(container, 'inspector')).toHaveValue('Someone Else');
    expect(controlById(container, 'inspection-comments')).toHaveValue('Follow up needed');
  });

  it('records an answer chosen in the question select', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionEdit.mockResolvedValue(
      detail({
        questionResponses: [
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
        ],
      }),
    );
    const { container } = renderPage();

    await loadedFields(container);
    await waitFor(() => expect(container.querySelector('#question-answer-1')).not.toBeNull());
    fireEvent.change(controlById(container, 'question-answer-1'), { target: { value: 'N' } });

    expect(controlById(container, 'question-answer-1')).toHaveValue('N');
  });
});

describe('Edit Scale Site Inspection — server field errors', () => {
  it('inlines a field error the backend returns against its field', async () => {
    apiMock.scaleSiteInspections.updateScaleSiteInspection.mockRejectedValue({ response: { status: 400, data: { message: 'Validation failed', fieldErrors: [{ field: 'inspectionDate', message: 'Inspection date is before the previous inspection.' }] } } });
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('Inspection date is before the previous inspection.')).length).toBeGreaterThan(0);
    expect(controlById(container, 'inspection-date')).toBeInTheDocument();
  });
});

describe('Edit Scale Site Inspection — navigating back', () => {
  it('Back leaves the page without saving', async () => {
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));

    expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).not.toHaveBeenCalled();
  });
});

describe('Edit Scale Site Inspection — character limits', () => {
  it('caps each comment field at its legacy length while typing', async () => {
    const { container } = renderPage();

    await loaded(container);

    expect(controlById(container, 'inspection-comments')).toHaveAttribute('maxlength', '2000');
    expect(controlById(container, 'question-comments-1')).toHaveAttribute('maxlength', '4000');
    expect(controlById(container, 'question-follow-up-action-1')).toHaveAttribute('maxlength', '4000');
  });

  it('refuses General Comments over 2000 characters', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'inspection-comments'), {
      target: { value: 'x'.repeat(2001) },
    });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(
      (await screen.findAllByText('General Comments must be 2000 characters or fewer.')).length,
    ).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('accepts General Comments of exactly 2000 characters', async () => {
    apiMock.scaleSiteInspections.updateScaleSiteInspection.mockResolvedValue({});
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'inspection-comments'), {
      target: { value: 'x'.repeat(2000) },
    });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).toHaveBeenCalled(),
    );
  });

  it('refuses a loaded question Comment over 4000 characters', async () => {
    // maxlength only stops typing; a value already over the limit must still be caught on save.
    apiMock.scaleSiteInspections.getScaleSiteInspectionEdit.mockResolvedValue(
      detail({ questionResponses: [answeredQuestion({ commentsText: 'x'.repeat(4001) })] }),
    );
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(
      (await screen.findAllByText('Comments must be 4000 characters or fewer.')).length,
    ).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('refuses Action Required over 4000 characters', async () => {
    apiMock.scaleSiteInspections.getScaleSiteInspectionEdit.mockResolvedValue(
      detail({
        questionResponses: [
          answeredQuestion({
            followUpRequiredInd: 'Y',
            followUpActionText: 'x'.repeat(4001),
            followUpDueDate: '2026-02-01',
            followUpCompletedInd: 'N',
          }),
        ],
      }),
    );
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(
      (await screen.findAllByText('Action Required must be 4000 characters or fewer.')).length,
    ).toBeGreaterThan(0);
    expect(apiMock.scaleSiteInspections.updateScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('inlines a General Comments error the backend returns', async () => {
    apiMock.scaleSiteInspections.updateScaleSiteInspection.mockRejectedValue({ response: { status: 400, data: { message: 'Validation failed', fieldErrors: [{ field: 'comments', message: 'General Comments is too long.' }] } } });
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('General Comments is too long.')).length).toBeGreaterThan(0);
    expect(controlById(container, 'inspection-comments')).toHaveAttribute('aria-invalid', 'true');
  });
});
