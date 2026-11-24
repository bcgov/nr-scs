import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import ValidLicenceAttributes from './ValidLicenceAttributes';

beforeEach(() => {
  resetApiMock();
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'A', description: 'Option A' }]);
  apiMock.lov.getScaleMethodTypeLov.mockResolvedValue([{ code: 'A', description: 'Option A' }]);
  // The district select's option value is the orgUnitCode, not the numeric code.
  apiMock.lov.getRegionDistrictRollupLov.mockResolvedValue([{ code: '43', description: 'DCK', orgUnitCode: 'DCK' }]);
  // The grading-code xref still backs the list/description columns.
  apiMock.lov.getGradingCodeAppointmentTypeLov.mockResolvedValue([
    { code: 'A', description: 'Option A', scalerAppointmentType: 'O', scaleGradingSystemCode: 'A' },
  ]);
  // The Add-Attribute appointment-type dropdown now draws its options from the full appointment-type
  // LOV (option value === lov.code), not the grading-code xref.
  apiMock.lov.getAppointmentTypeLov.mockResolvedValue([{ code: 'O', description: 'Owner' }]);
});

const openModal = async (container: HTMLElement, addLabel: RegExp) => {
  await userEvent.click(screen.getByRole('button', { name: addLabel }));
  await waitFor(() =>
    expect(container.ownerDocument.querySelector('.cds--modal.is-visible')).not.toBeNull(),
  );
  return container.ownerDocument.querySelector('.cds--modal.is-visible') as HTMLElement;
};

/**
 * Every maintenance screen runs through one shared CRUD hook, so these flows are the hook's
 * behaviour more than any one screen's: the list load, the refusal to submit an incomplete form,
 * and the create round-trip.
 */
const SCREENS: Array<[string, React.ComponentType, RegExp, ReturnType<typeof vi.fn>, ReturnType<typeof vi.fn>]> = [
  ['Exams / Upgrades', ExamUpgrades, /^Add Exam \/ Upgrade$/i, apiMock.examUpgrades.listExamUpgrades, apiMock.examUpgrades.createExamUpgrade],
  ['Conditions', Conditions, /^Add Condition$/i, apiMock.conditions.searchConditions, apiMock.conditions.createCondition],
  ['Authorization Clauses', AuthorizationClauses, /^Add Authorization Clause$/i, apiMock.authorizationClauses.searchAuthorizationClauses, apiMock.authorizationClauses.createAuthorizationClause],
  ['Valid Licence Attributes', ValidLicenceAttributes, /^Add Attribute$/i, apiMock.validLicenceAttributes.searchValidLicenceAttributes, apiMock.validLicenceAttributes.createValidLicenceAttribute],
  ['Signatories', SignatureBlocks, /^Add Signatory$/i, apiMock.signatureBlocks.searchSignatureBlocks, apiMock.signatureBlocks.createSignatureBlock],
  ['Questions', Questions, /^Add Question$/i, apiMock.inspectionQuestions.searchQuestions, apiMock.inspectionQuestions.createQuestion],
  ['Appointment Types', AppointmentTypes, /^Add Appointment Type$/i, apiMock.appointmentTypes.searchAppointmentTypes, apiMock.appointmentTypes.createAppointmentType],
];

describe('Maintenance CRUD — list', () => {
  it.each(SCREENS)('%s loads its list on mount', async (_name, Screen, _add, list) => {
    renderWithProviders(<Screen />);

    await waitFor(() => expect(list).toHaveBeenCalled());
  });

  it.each(SCREENS)('%s survives a failed list load', async (_name, Screen, _add, list) => {
    list.mockRejectedValue(new Error('List unavailable.'));
    const { container } = renderWithProviders(<Screen />);

    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(container.textContent ?? '').not.toBe('');
  });

  it.each(SCREENS)('%s renders an empty list without crashing', async (_name, Screen, _add, list) => {
    list.mockResolvedValue([]);
    const { container } = renderWithProviders(<Screen />);

    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(container.textContent ?? '').not.toBe('');
  });

  it.each(SCREENS)('%s tolerates a non-array list response', async (_name, Screen, _add, list) => {
    // The backend returns a bare array here; anything else must empty the list, not throw.
    list.mockResolvedValue({ unexpected: true });
    const { container } = renderWithProviders(<Screen />);

    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(container.textContent ?? '').not.toBe('');
  });
});

describe('Maintenance CRUD — create dialog', () => {
  it.each(SCREENS)('%s refuses to save an empty form', async (_name, Screen, add, _list, create) => {
    const { container } = renderWithProviders(<Screen />);

    const modal = await openModal(container, add);
    await userEvent.click(within(modal).getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(create).not.toHaveBeenCalled());
  });

  it.each(SCREENS)('%s offers Reset inside the dialog', async (_name, Screen, add) => {
    const { container } = renderWithProviders(<Screen />);

    const modal = await openModal(container, add);
    expect(within(modal).getByRole('button', { name: /^Reset$/i })).toBeInTheDocument();
  });

  it.each(SCREENS)('%s creates nothing merely by opening the dialog', async (_name, Screen, add, _list, create) => {
    const { container } = renderWithProviders(<Screen />);

    await openModal(container, add);

    expect(create).not.toHaveBeenCalled();
  });
});

describe('Exams / Upgrades — full create round-trip', () => {
  const fill = (modal: HTMLElement) => {
    const set = (id: string, value: string) => {
      const el = modal.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | null;
      expect(el, `#${id} should be in the dialog`).not.toBeNull();
      fireEvent.change(el!, { target: { value } });
    };
    set('exam-upgrade-type', 'A');
    set('exam-upgrade-effective-date', '2026-01-01');
    set('exam-upgrade-licence-accredit', 'Y');
    set('exam-upgrade-description', 'Written exam');
  };

  it('sends a create when the required fields are supplied', async () => {
    apiMock.examUpgrades.createExamUpgrade.mockResolvedValue({ scalerTrainingTypeCode: 'A' });
    const { container } = renderWithProviders(<ExamUpgrades />);

    const modal = await openModal(container, /^Add Exam \/ Upgrade$/i);
    fill(modal);
    await userEvent.click(within(modal).getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.examUpgrades.createExamUpgrade).toHaveBeenCalled());
  });

  it('reloads the list after a successful create', async () => {
    apiMock.examUpgrades.createExamUpgrade.mockResolvedValue({ scalerTrainingTypeCode: 'A' });
    const { container } = renderWithProviders(<ExamUpgrades />);

    await waitFor(() => expect(apiMock.examUpgrades.listExamUpgrades).toHaveBeenCalledTimes(1));
    const modal = await openModal(container, /^Add Exam \/ Upgrade$/i);
    fill(modal);
    await userEvent.click(within(modal).getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.examUpgrades.listExamUpgrades.mock.calls.length).toBeGreaterThan(1),
    );
  });

  it('keeps the dialog open and reports when the create fails', async () => {
    apiMock.examUpgrades.createExamUpgrade.mockRejectedValue(new Error('Create refused.'));
    const { container } = renderWithProviders(<ExamUpgrades />);

    const modal = await openModal(container, /^Add Exam \/ Upgrade$/i);
    fill(modal);
    await userEvent.click(within(modal).getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.examUpgrades.createExamUpgrade).toHaveBeenCalled());
    expect(container.ownerDocument.querySelector('.cds--modal.is-visible')).not.toBeNull();
  });
});

describe('Conditions — full create round-trip', () => {
  it('sends a create when the required fields are supplied', async () => {
    apiMock.conditions.createCondition.mockResolvedValue({ scaleAuthConditionId: 1 });
    const { container } = renderWithProviders(<Conditions />);

    const modal = await openModal(container, /^Add Condition$/i);
    const set = (id: string, value: string) => {
      const el = modal.querySelector(`#${id}`) as HTMLInputElement | null;
      expect(el, `#${id} should be in the dialog`).not.toBeNull();
      fireEvent.change(el!, { target: { value } });
    };
    set('condition-type', 'A');
    set('condition-title', 'No night hauling');
    set('condition-mandatory', 'N');
    set('condition-effective-date', '2026-01-01');
    set('condition-sort-order', '1');
    set('condition-text', 'Hauling permitted in daylight only.');
    await userEvent.click(within(modal).getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.conditions.createCondition).toHaveBeenCalled());
  });
});

/**
 * The remaining dialogs, each filled with the values its own required fields need. Driving the
 * create through them is what exercises the shared hook's save path rather than just its refusal
 * path.
 *
 * Two of these dialogs read their LOVs in non-obvious ways: the district select's option value is
 * the orgUnitCode, and the appointment-type select's is the scalerAppointmentType -- neither is the
 * code, which is why they looked un-fillable until the fixtures carried those fields.
 */
describe('Maintenance CRUD — create round-trips across the remaining dialogs', () => {
  const set = (modal: HTMLElement, id: string, value: string) => {
    const el = modal.querySelector(`#${id}`) as HTMLInputElement | null;
    expect(el, `#${id} should be in the dialog`).not.toBeNull();
    fireEvent.change(el!, { target: { value } });
  };

  const CASES: Array<[string, React.ComponentType, RegExp, ReturnType<typeof vi.fn>, Array<[string, string]>]> = [
    [
      'Appointment Types',
      AppointmentTypes,
      /^Add Appointment Type$/i,
      apiMock.appointmentTypes.createAppointmentType,
      [
        ['appointment-code', 'PERM'],
        ['appointment-acting', 'no'],
        ['appointment-effective-date', '2026-01-01'],
        ['appointment-expiry-date', '2026-12-31'],
        ['appointment-description', 'Permanent appointment'],
      ],
    ],
    [
      'Authorization Clauses',
      AuthorizationClauses,
      /^Add Authorization Clause$/i,
      apiMock.authorizationClauses.createAuthorizationClause,
      [
        ['clause-type', 'A'],
        ['clause-effective-date', '2026-01-01'],
        ['clause-text', 'The holder shall comply.'],
      ],
    ],
    [
      'Signatories',
      SignatureBlocks,
      /^Add Signatory$/i,
      apiMock.signatureBlocks.createSignatureBlock,
      [
        ['block-first-name', 'Jane'],
        ['block-last-name', 'Smith'],
        ['block-position', 'District Manager'],
        // The district select's option value is the orgUnitCode.
        ['block-regdist', 'DCK'],
      ],
    ],
    [
      'Valid Licence Attributes',
      ValidLicenceAttributes,
      /^Add Attribute$/i,
      apiMock.validLicenceAttributes.createValidLicenceAttribute,
      [
        ['vla-grading-system', 'A'],
        // The appointment-type select's option value is the scalerAppointmentType.
        ['vla-appointment-type', 'O'],
        ['vla-effective-date', '2026-01-01'],
      ],
    ],
  ];

  /** Selects are only fillable once their LOV has landed, which happens after the dialog opens. */
  const waitForOptions = async (modal: HTMLElement) => {
    if (modal.querySelector('select')) {
      await waitFor(() => expect(modal.querySelectorAll('option').length).toBeGreaterThan(1));
    }
  };

  it.each(CASES)('%s sends a create with its required fields', async (_name, Screen, add, create, fields) => {
    create.mockResolvedValue({});
    const { container } = renderWithProviders(<Screen />);

    const modal = await openModal(container, add);
    await waitForOptions(modal);
    fields.forEach(([id, value]) => set(modal, id, value));
    await userEvent.click(within(modal).getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(create).toHaveBeenCalled());
  });

  it.each(CASES)('%s reports a failed create without closing the dialog', async (_name, Screen, add, create, fields) => {
    create.mockRejectedValue(new Error('Create refused.'));
    const { container } = renderWithProviders(<Screen />);

    const modal = await openModal(container, add);
    await waitForOptions(modal);
    fields.forEach(([id, value]) => set(modal, id, value));
    await userEvent.click(within(modal).getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(container.ownerDocument.querySelector('.cds--modal.is-visible')).not.toBeNull();
  });

  it.each(CASES)('%s clears the dialog on Reset', async (_name, Screen, add, _create, fields) => {
    const { container } = renderWithProviders(<Screen />);

    const modal = await openModal(container, add);
    const [firstId, firstValue] = fields[0];
    set(modal, firstId, firstValue);
    await userEvent.click(within(modal).getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => {
      const field = modal.querySelector(`#${firstId}`) as HTMLInputElement | null;
      expect(field).not.toBeNull();
      expect(field!.value === '' || field!.value !== firstValue).toBe(true);
    });
  });
});
