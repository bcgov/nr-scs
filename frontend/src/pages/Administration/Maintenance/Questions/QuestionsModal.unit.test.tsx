import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { QuestionsFormFields, QuestionsViewFields, type QuestionFormState } from './QuestionsModal';

const inspectionTypes = [{ code: 'IT1', description: 'Routine' }] as never;
const scalingMethods = [{ code: 'SM1', description: 'Weight' }] as never;
const validResponses = [{ code: 'VR1', description: 'Pass / Fail' }] as never;

const detail = (overrides: Record<string, unknown> = {}) =>
  ({
    inspectionQuestionId: 12,
    sortOrderNo: 3,
    inspectionTypeCodes: ['IT1', 'IT9'],
    commentRequiredInd: 'Y',
    scalingMethodTypeCodes: ['SM1'],
    validResponseCodes: ['VR1', 'VR9'],
    effectiveDate: '2024-01-01',
    expiryDate: '2025-01-01',
    questionText: 'Is the scale level?',
    ...overrides,
  }) as never;

const value = (container: HTMLElement, id: string) =>
  (container.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement).value;

describe('QuestionsViewFields', () => {
  const view = (selected: unknown) =>
    render(
      <QuestionsViewFields
        selected={selected as never}
        inspectionTypes={inspectionTypes}
        scalingMethods={scalingMethods}
        validResponses={validResponses}
      />,
    );

  it('renders nothing without a record', () => {
    const { container } = view(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('spells out the codes it knows and shows the rest raw', () => {
    const { container } = view(detail());

    expect(value(container, 'view-question-id')).toBe('12');
    expect(value(container, 'view-sort-order')).toBe('3');
    expect(value(container, 'view-inspection-types')).toBe('Routine, IT9');
    expect(value(container, 'view-comment-required')).toBe('Yes');
    expect(value(container, 'view-scaling-methods')).toBe('Weight');
    expect(value(container, 'view-valid-responses')).toBe('Pass / Fail, VR9');
    expect(value(container, 'view-effective-date')).toBe('2024-01-01');
    expect(value(container, 'view-expiry-date')).toBe('2025-01-01');
    expect(value(container, 'view-question-text')).toBe('Is the scale level?');
  });

  it('shows No for a comment that is not required', () => {
    const { container } = view(detail({ commentRequiredInd: 'N' }));
    expect(value(container, 'view-comment-required')).toBe('No');
  });

  it('leaves every field blank for a sparse record', () => {
    const { container } = view({});

    for (const id of [
      'view-question-id',
      'view-sort-order',
      'view-inspection-types',
      'view-comment-required',
      'view-scaling-methods',
      'view-valid-responses',
      'view-effective-date',
      'view-expiry-date',
      'view-question-text',
    ]) {
      expect(value(container, id)).toBe('');
    }
  });
});

describe('QuestionsFormFields', () => {
  const formState: QuestionFormState = {
    sortOrderNo: '3',
    questionText: 'Is the scale level?',
    commentRequiredInd: 'Y',
    effectiveDate: '2024-01-01',
    expiryDate: '',
    inspectionTypeCodes: ['IT1'],
    scalingMethodTypeCodes: ['SM1'],
    validResponseCodes: ['VR1'],
  } as QuestionFormState;

  const onFieldChange = vi.fn();

  const form = (overrides: Record<string, unknown> = {}) => {
    onFieldChange.mockClear();
    return render(
      <QuestionsFormFields
        selected={null}
        inspectionTypes={inspectionTypes}
        scalingMethods={scalingMethods}
        validResponses={validResponses}
        formState={formState}
        formErrors={{}}
        onFieldChange={onFieldChange}
        isSubmitting={false}
        isEdit={false}
        {...(overrides as object)}
      />,
    );
  };

  it('reports each edited field as a patch', () => {
    const { container } = form();

    fireEvent.change(container.querySelector('#question-sort-order')!, { target: { value: '5' } });
    expect(onFieldChange).toHaveBeenCalledWith({ sortOrderNo: '5' });

    fireEvent.change(container.querySelector('#comment-required')!, { target: { value: 'N' } });
    expect(onFieldChange).toHaveBeenCalledWith({ commentRequiredInd: 'N' });

    fireEvent.change(container.querySelector('#effective-date')!, { target: { value: '2024-02-02' } });
    expect(onFieldChange).toHaveBeenCalledWith({ effectiveDate: '2024-02-02' });

    fireEvent.change(container.querySelector('#expiry-date')!, { target: { value: '2024-12-31' } });
    expect(onFieldChange).toHaveBeenCalledWith({ expiryDate: '2024-12-31' });

    fireEvent.change(container.querySelector('#question-text')!, { target: { value: 'Is it level?' } });
    expect(onFieldChange).toHaveBeenCalledWith({ questionText: 'Is it level?' });
  });

  it('has no question id while creating', () => {
    const { container } = form();
    expect(value(container, 'question-id')).toBe('');
  });

  it('shows the id of the question being edited', () => {
    const { container } = form({ isEdit: true, selected: detail() });
    expect(value(container, 'question-id')).toBe('12');
    expect(screen.queryByText('Question Update')).not.toBeInTheDocument();
    expect(container.querySelector('#question-text')).not.toBeNull();
  });

  it('locks a question that has been used in an inspection down to sort order and expiry', () => {
    const { container } = form({ isEdit: true, selected: detail({ questionUsed: true }) });

    expect(screen.getByText('Question Update')).toBeInTheDocument();
    expect(value(container, 'inspection-type-readonly')).toBe('Routine');
    expect(value(container, 'scaling-methods-readonly')).toBe('Weight');
    expect(value(container, 'valid-responses-readonly')).toBe('Pass / Fail');
    expect(value(container, 'question-text-readonly')).toBe('Is the scale level?');
    expect(container.querySelector('#comment-required')).toBeDisabled();
    expect(container.querySelector('#effective-date')).toBeDisabled();
    expect(container.querySelector('#expiry-date')).not.toBeDisabled();
    expect(container.querySelector('#question-sort-order')).not.toBeDisabled();
  });

  it('shows the read-only lists blank when the locked question has no codes', () => {
    const { container } = form({
      isEdit: true,
      selected: detail({ questionUsed: true }),
      formState: { ...formState, inspectionTypeCodes: undefined, scalingMethodTypeCodes: undefined, validResponseCodes: undefined },
    });

    expect(value(container, 'inspection-type-readonly')).toBe('');
    expect(value(container, 'scaling-methods-readonly')).toBe('');
    expect(value(container, 'valid-responses-readonly')).toBe('');
  });

  it('marks the fields that failed validation', () => {
    form({
      formErrors: {
        sortOrderNo: 'Sort Order is required.',
        inspectionTypeCodes: 'Pick a type.',
        scalingMethodTypeCodes: 'Pick a method.',
        validResponseCodes: 'Pick a response.',
        commentRequiredInd: 'Say yes or no.',
        effectiveDate: 'Effective Date is required.',
        expiryDate: 'Expiry must follow effective.',
        questionText: 'Question is required.',
      },
    });

    for (const msg of [
      'Sort Order is required.',
      'Pick a type.',
      'Pick a method.',
      'Pick a response.',
      'Say yes or no.',
      'Effective Date is required.',
      'Expiry must follow effective.',
      'Question is required.',
    ]) {
      expect(screen.getByText(msg)).toBeInTheDocument();
    }
  });

  it('disables everything while submitting', () => {
    const { container } = form({ isSubmitting: true });

    expect(container.querySelector('#question-sort-order')).toBeDisabled();
    expect(container.querySelector('#comment-required')).toBeDisabled();
    expect(container.querySelector('#question-text')).toBeDisabled();
  });
});
