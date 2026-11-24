import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import AppointmentTypes from './AppointmentTypes';
import AuthorizationClauses from './AuthorizationClauses';
import Conditions from './Conditions';
import ExamUpgrades from './ExamUpgrades';
import Questions from './Questions';
import SignatureBlocks from './SignatureBlocks';

const set = (container: HTMLElement, id: string, value: string) =>
  fireEvent.change(container.querySelector(`#${id}`)!, { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: /^Save/ }));
const openAdd = async (name: RegExp) => fireEvent.click(await screen.findByRole('button', { name }));
const waitForOptions = (container: HTMLElement, id: string) =>
  waitFor(() => expect((container.querySelector(`#${id}`) as HTMLSelectElement).options.length).toBeGreaterThan(1));

beforeEach(() => {
  resetApiMock();
  apiMock.lov.getStaticLov.mockResolvedValue([
    { code: 'SIA', description: 'Scale Site Authorization' },
    { code: 'MSD', description: 'Mark Site Designation' },
  ]);
  apiMock.lov.getScaleMethodTypeLov.mockResolvedValue([{ code: 'WT', description: 'Weight' }]);
  apiMock.lov.getRegionDistrictRollupLov.mockResolvedValue([{ code: '43', description: 'DCK', orgUnitCode: 'DCK' }]);
});

describe('Conditions — rules', () => {
  const add = async () => {
    const utils = renderWithProviders(<Conditions />);
    await openAdd(/^Add Condition$/i);
    await waitForOptions(utils.container, 'condition-type');
    return utils;
  };

  it('names the required fields', async () => {
    await add();
    save();

    for (const msg of ['Sort Order is required.', 'Effective Date is required.', 'Condition Text is required.']) {
      expect((await screen.findAllByText(msg)).length).toBeGreaterThan(0);
    }
    expect(apiMock.conditions.createCondition).not.toHaveBeenCalled();
  });

  it.each([
    ['abc', 'Sort Order must be a number.'],
    ['-1', 'Sort Order must be between 0 and 9999.'],
    ['10000', 'Sort Order must be between 0 and 9999.'],
  ])('rejects a sort order of "%s"', async (value, message) => {
    const { container } = await add();
    set(container, 'condition-sort-order', value);
    save();

    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
  });

  it('rejects an expiry before the effective date', async () => {
    const { container } = await add();
    set(container, 'condition-effective-date', '2026-02-01');
    set(container, 'condition-expiry-date', '2026-01-01');
    save();

    expect((await screen.findAllByText('Expiry Date must be on or after Effective Date.')).length).toBeGreaterThan(0);
  });

  it('demands a site type for a scale site authorization condition only', async () => {
    const { container } = await add();
    set(container, 'condition-type', 'SIA');
    save();
    expect((await screen.findAllByText('Site Type is required.')).length).toBeGreaterThan(0);

    set(container, 'condition-type', 'MSD');
    save();
    await waitFor(() => expect(screen.queryByText('Site Type is required.')).not.toBeInTheDocument());
  });

  it('still opens the add dialog when the lookups fail', async () => {
    apiMock.lov.getStaticLov.mockRejectedValue(new Error('down'));
    apiMock.lov.getScaleMethodTypeLov.mockRejectedValue(new Error('down'));
    const { container } = renderWithProviders(<Conditions />);
    await openAdd(/^Add Condition$/i);

    await waitFor(() => expect(container.querySelector('#condition-type')).not.toBeNull());
    expect((container.querySelector('#condition-type') as HTMLSelectElement).options.length).toBeLessThanOrEqual(1);
  });

  it('opens a listed condition read-only by its number', async () => {
    apiMock.conditions.searchConditions.mockResolvedValue([
      { scaleAuthConditionId: 7, scaleConditionClassCode: 'SIA', scaleAuthConditionTitle: 'Bark' },
    ] as never);
    apiMock.conditions.getCondition.mockResolvedValue({ scaleAuthConditionId: 7, scaleConditionClassCode: 'SIA' } as never);
    renderWithProviders(<Conditions />);

    fireEvent.click(await screen.findByRole('button', { name: '7' }));

    await waitFor(() => expect(apiMock.conditions.getCondition).toHaveBeenCalledWith('SIA', 7, expect.anything()));
  });
});

describe('Authorization Clauses — rules', () => {
  const add = async () => {
    const utils = renderWithProviders(<AuthorizationClauses />);
    await openAdd(/^Add Authorization Clause$/i);
    await waitFor(() => expect(utils.container.querySelector('#clause-text')).not.toBeNull());
    return utils;
  };

  it('caps the clause at 200 characters', async () => {
    const { container } = await add();
    set(container, 'clause-text', 'x'.repeat(201));
    save();

    expect((await screen.findAllByText('Clause can not be greater than 200 characters.')).length).toBeGreaterThan(0);
  });

  it('requires an effective date and orders the expiry after it', async () => {
    const { container } = await add();
    save();
    expect((await screen.findAllByText('Effective Date is required.')).length).toBeGreaterThan(0);

    set(container, 'clause-effective-date', '2026-02-01');
    set(container, 'clause-expiry-date', '2026-01-01');
    save();
    expect((await screen.findAllByText('Expiry Date must be on or after Effective Date.')).length).toBeGreaterThan(0);
  });

  it('labels the scale method through the lookup and falls back to the code', async () => {
    apiMock.authorizationClauses.searchAuthorizationClauses.mockResolvedValue([
      { scaleMethodAuthClauseId: 1, scaleMethodTypeCode: 'WT', scalerAuthorizationClause: 'Weigh every load' },
      { scaleMethodAuthClauseId: 2, scaleMethodTypeCode: 'ZZ', scalerAuthorizationClause: 'Unknown method' },
      { scaleMethodAuthClauseId: 3, scalerAuthorizationClause: 'No method' },
    ] as never);
    renderWithProviders(<AuthorizationClauses />);

    expect((await screen.findAllByText('Weight')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('ZZ').length).toBeGreaterThan(0);
    expect(screen.getByText('No method')).toBeInTheDocument();
  });

  it('refilters by scale method and back to all, and survives a failed lookup', async () => {
    apiMock.authorizationClauses.searchAuthorizationClauses.mockResolvedValue([] as never);
    const { container } = renderWithProviders(<AuthorizationClauses />);
    await waitFor(() => expect(apiMock.authorizationClauses.searchAuthorizationClauses).toHaveBeenCalled());
    await waitForOptions(container, 'auth-clause-filter');

    set(container, 'auth-clause-filter', 'WT');
    await waitFor(() =>
      expect(apiMock.authorizationClauses.searchAuthorizationClauses.mock.calls.at(-1)?.[0]).toMatchObject({ scaleMethodTypeCode: 'WT' }),
    );
    set(container, 'auth-clause-filter', 'ALL');
    await waitFor(() =>
      expect(apiMock.authorizationClauses.searchAuthorizationClauses.mock.calls.at(-1)?.[0]).not.toHaveProperty('scaleMethodTypeCode'),
    );
  });

  it('renders without method types when the lookup fails', async () => {
    apiMock.lov.getScaleMethodTypeLov.mockRejectedValue(new Error('down'));
    renderWithProviders(<AuthorizationClauses />);

    expect(await screen.findByRole('button', { name: /^Add Authorization Clause$/i })).toBeInTheDocument();
  });
});

describe('Signatories — districts', () => {
  const rows = [
    { scaleSignatoryBlockId: 1, firstName: 'Ann', lastName: 'Able', signatureTitle: 'Manager', orgUnitNo: 43, orgUnitDescription: 'Given description' },
    { scaleSignatoryBlockId: 2, firstName: 'Bob', lastName: 'Baker', orgUnitNo: 43 },
    { scaleSignatoryBlockId: 3, firstName: 'Cy', lastName: 'Cole', orgUnitNo: 99 },
    { scaleSignatoryBlockId: 4, firstName: 'Di', lastName: 'Dunn' },
  ];

  it('lists the district description the record carries', async () => {
    apiMock.signatureBlocks.searchSignatureBlocks.mockResolvedValue(rows as never);
    renderWithProviders(<SignatureBlocks />);

    expect((await screen.findAllByText('Given description')).length).toBeGreaterThan(0);
  });

  const viewRegDist = async (id: number, detail: Record<string, unknown>) => {
    apiMock.signatureBlocks.searchSignatureBlocks.mockResolvedValue(rows as never);
    apiMock.signatureBlocks.getSignatureBlock.mockResolvedValue(detail as never);
    const { container } = renderWithProviders(<SignatureBlocks />);
    fireEvent.click(await screen.findByRole('button', { name: String(id) }));
    await waitFor(() => expect(container.querySelector('#view-block-regdist')).not.toBeNull());
    return container.querySelector('#view-block-regdist') as HTMLInputElement;
  };

  it('shows the viewed district through the lookup when the record has no description', async () => {
    const field = await viewRegDist(2, { scaleSignatoryBlockId: 2, firstName: 'Bob', lastName: 'Baker', orgUnitNo: 43 });
    await waitFor(() => expect(field.value).toBe('DCK'));
  });

  it('falls back to the raw org unit number the lookup does not know', async () => {
    const field = await viewRegDist(3, { scaleSignatoryBlockId: 3, firstName: 'Cy', lastName: 'Cole', orgUnitNo: 99 });
    await waitFor(() => expect(field.value).toBe('99'));
  });

  it('shows a blank district for a signatory without an org unit', async () => {
    const field = await viewRegDist(4, { scaleSignatoryBlockId: 4, firstName: 'Di', lastName: 'Dunn' });
    await waitFor(() => expect(field.value).toBe(''));
  });

  it('filters by district code, resolving it to the org unit number', async () => {
    apiMock.signatureBlocks.searchSignatureBlocks.mockResolvedValue([] as never);
    const { container } = renderWithProviders(<SignatureBlocks />);
    await waitFor(() => expect(apiMock.signatureBlocks.searchSignatureBlocks).toHaveBeenCalled());
    await waitForOptions(container, 'signature-block-filter');

    set(container, 'signature-block-filter', 'DCK');
    await waitFor(() =>
      expect(apiMock.signatureBlocks.searchSignatureBlocks.mock.calls.at(-1)?.[0]).toMatchObject({ orgUnitNo: 43 }),
    );
    set(container, 'signature-block-filter', 'ALL');
    await waitFor(() =>
      expect(apiMock.signatureBlocks.searchSignatureBlocks.mock.calls.at(-1)?.[0]).not.toHaveProperty('orgUnitNo'),
    );
  });

  it('opens a signatory read-only, keeping the listed district when the detail has none', async () => {
    apiMock.signatureBlocks.searchSignatureBlocks.mockResolvedValue(rows as never);
    apiMock.signatureBlocks.getSignatureBlock.mockResolvedValue({ scaleSignatoryBlockId: 1, firstName: 'Ann', lastName: 'Able', orgUnitNo: 43 } as never);
    renderWithProviders(<SignatureBlocks />);

    fireEvent.click(await screen.findByRole('button', { name: '1' }));

    await waitFor(() => expect(apiMock.signatureBlocks.getSignatureBlock).toHaveBeenCalledWith(1, expect.anything()));
    await waitFor(() => expect(screen.getAllByText('Given description').length).toBeGreaterThan(0));
  });

  it('shows the raw org unit number when the district lookup fails', async () => {
    apiMock.lov.getRegionDistrictRollupLov.mockRejectedValue(new Error('down'));
    const field = await viewRegDist(2, { scaleSignatoryBlockId: 2, firstName: 'Bob', lastName: 'Baker', orgUnitNo: 43 });
    await waitFor(() => expect(field.value).toBe('43'));
  });
});

describe('Questions — list', () => {
  it('spells the inspection types through the lookup, keeping unknown codes raw, and opens a question', async () => {
    apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'IT1', description: 'Routine' }] as never);
    apiMock.inspectionQuestions.searchQuestions.mockResolvedValue([
      { inspectionQuestionId: 12, questionText: 'Is the deck clear?', inspectionTypeCodes: ['IT1', 'ZZ'], sortOrderNo: 1 },
      { inspectionQuestionId: 13, questionText: 'Untyped', inspectionTypeCodes: null },
    ] as never);
    apiMock.inspectionQuestions.getQuestion.mockResolvedValue({ inspectionQuestionId: 12, questionText: 'Is the deck clear?' } as never);
    renderWithProviders(<Questions />);

    expect((await screen.findAllByText('Routine, ZZ')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '12' }));

    await waitFor(() => expect(apiMock.inspectionQuestions.getQuestion).toHaveBeenCalledWith(12, expect.anything()));
  });

  it('still opens the add dialog when the lookups fail', async () => {
    apiMock.lov.getStaticLov.mockRejectedValue(new Error('down'));
    apiMock.lov.getScaleMethodTypeLov.mockRejectedValue(new Error('down'));
    renderWithProviders(<Questions />);

    fireEvent.click(await screen.findByRole('button', { name: /^Add Question$/i }));

    await waitFor(() => expect(document.querySelector('#question-sort-order')).not.toBeNull());
  });
});


describe('Exam Upgrades — rules', () => {
  const rows = [
    { scalerTrainingClassCode: 'EX', scalerTrainingTypeId: 7, description: 'Basic exam', effectiveDate: '2024-01-01' },
    { scalerTrainingClassCode: 'UP', scalerTrainingTypeId: 8, description: 'Upgrade one' },
  ];

  const add = async () => {
    apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'EX', description: 'Exam' }, { code: 'UP', description: 'Upgrade' }] as never);
    apiMock.examUpgrades.listExamUpgrades.mockResolvedValue(rows as never);
    const utils = renderWithProviders(<ExamUpgrades />);
    await openAdd(/^Add Exam \/ Upgrade$/i);
    await waitFor(() => expect(utils.container.querySelector('#exam-upgrade-description')).not.toBeNull());
    return utils;
  };

  it('names the required fields', async () => {
    await add();
    save();

    expect((await screen.findAllByText('Description is required.')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Effective Date is required.').length).toBeGreaterThan(0);
    expect(apiMock.examUpgrades.createExamUpgrade).not.toHaveBeenCalled();
  });

  it('rejects an expiry before the effective date', async () => {
    const { container } = await add();
    set(container, 'exam-upgrade-effective-date', '2026-02-01');
    set(container, 'exam-upgrade-expiry-date', '2026-01-01');
    save();

    expect((await screen.findAllByText('Expiry Date must be on or after Effective Date.')).length).toBeGreaterThan(0);
  });

  it('filters by class and opens a row by its type id', async () => {
    apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'EX', description: 'Exam' }, { code: 'UP', description: 'Upgrade' }] as never);
    apiMock.examUpgrades.listExamUpgrades.mockResolvedValue(rows as never);
    apiMock.examUpgrades.getExamUpgrade.mockResolvedValue(rows[0] as never);
    const { container } = renderWithProviders(<ExamUpgrades />);
    await waitFor(() => expect(apiMock.examUpgrades.listExamUpgrades).toHaveBeenCalled());
    await waitForOptions(container, 'exam-upgrade-filter');

    set(container, 'exam-upgrade-filter', 'EX');
    await waitFor(() => expect(apiMock.examUpgrades.listExamUpgrades.mock.calls.at(-1)?.[0]).toBe('EX'));
    set(container, 'exam-upgrade-filter', 'ALL');
    await waitFor(() => expect(apiMock.examUpgrades.listExamUpgrades.mock.calls.at(-1)?.[0]).toBeUndefined());

    fireEvent.click(await screen.findByRole('button', { name: '7' }));
    await waitFor(() => expect(apiMock.examUpgrades.getExamUpgrade).toHaveBeenCalledWith('EX', 7, expect.anything()));
  });

  it('renders without class codes when the lookup fails', async () => {
    apiMock.lov.getStaticLov.mockRejectedValue(new Error('down'));
    apiMock.examUpgrades.listExamUpgrades.mockResolvedValue(rows as never);
    renderWithProviders(<ExamUpgrades />);

    expect((await screen.findAllByText('Upgrade one')).length).toBeGreaterThan(0);
  });
});

describe('Appointment Types — rules', () => {
  const rows = [{ code: 'O', description: 'Official', actingInd: 'N', effectiveDate: '2024-01-01' }];

  const add = async () => {
    apiMock.appointmentTypes.searchAppointmentTypes.mockResolvedValue(rows as never);
    const utils = renderWithProviders(<AppointmentTypes />);
    await openAdd(/^Add Appointment Type$/i);
    await waitFor(() => expect(utils.container.querySelector('#appointment-code')).not.toBeNull());
    return utils;
  };

  it('names the required fields', async () => {
    await add();
    save();

    expect((await screen.findAllByText('Code is required.')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Description is required.').length).toBeGreaterThan(0);
    expect(apiMock.appointmentTypes.createAppointmentType).not.toHaveBeenCalled();
  });

  it('caps the code at 4 characters and the description at 120', async () => {
    const { container } = await add();
    set(container, 'appointment-code', 'ABCDE');
    set(container, 'appointment-description', 'x'.repeat(121));
    save();

    expect((await screen.findAllByText('Code must be 4 characters or less.')).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Appointment Description can not be greater than 120 characters.').length,
    ).toBeGreaterThan(0);
  });

  it('rejects an expiry before the effective date', async () => {
    const { container } = await add();
    set(container, 'appointment-effective-date', '2026-02-01');
    set(container, 'appointment-expiry-date', '2026-01-01');
    save();

    expect((await screen.findAllByText('Expiry date cannot be before effective date.')).length).toBeGreaterThan(0);
  });

  it('opens a type read-only from its code without a detail fetch', async () => {
    apiMock.appointmentTypes.searchAppointmentTypes.mockResolvedValue(rows as never);
    const { container } = renderWithProviders(<AppointmentTypes />);

    fireEvent.click(await screen.findByRole('button', { name: 'O' }));

    await waitFor(() => expect(container.querySelector('#view-appointment-code')).toHaveValue('O'));
    expect(container.querySelector('#view-appointment-description')).toHaveValue('Official');
  });
});
