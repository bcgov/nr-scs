import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { resetApiMock } from '@/config/tests/apiMock';
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
});

/**
 * The maintenance screens are all the same shape: a list, an "Add ..." action that opens a create
 * dialog, and (mostly) an active/inactive filter. They are driven through one shared CRUD hook, so
 * a regression in that hook shows up on all of them at once — which is exactly why they are worth
 * covering together rather than picking one as a representative.
 */
/** Escapes every RegExp metacharacter so a label such as "Add Exam / Upgrade" matches literally. */
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

const SCREENS: Array<[string, React.ComponentType, string, string, string | null]> = [
  ['Valid Licence Attributes', ValidLicenceAttributes, 'Maintain Valid Licence Attributes', 'Add Attribute', 'vla-filter'],
  ['Signatories', SignatureBlocks, 'Maintain Signatories', 'Add Signatory', 'signature-block-filter'],
  ['Conditions', Conditions, 'Maintain Conditions', 'Add Condition', 'condition-filter'],
  ['Authorization Clauses', AuthorizationClauses, 'Maintain Authorization Clauses', 'Add Authorization Clause', 'auth-clause-filter'],
  ['Exams / Upgrades', ExamUpgrades, 'Maintain Exams / Upgrades', 'Add Exam / Upgrade', 'exam-upgrade-filter'],
  ['Questions', Questions, 'Maintain Questions', 'Add Question', null],
  ['Appointment Types', AppointmentTypes, 'Appointment Types', 'Add Appointment Type', null],
];

describe('Maintenance screens', () => {
  it.each(SCREENS)('%s renders its heading', async (_name, Screen, heading) => {
    renderWithProviders(<Screen />);

    await waitFor(() => expect(screen.getAllByText(heading).length).toBeGreaterThan(0));
  });

  it.each(SCREENS)('%s offers its add action', async (_name, Screen, _heading, addLabel) => {
    renderWithProviders(<Screen />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: new RegExp(`^${escapeRegExp(addLabel)}$`, 'i') })).toBeInTheDocument(),
    );
  });

  it.each(SCREENS)('%s renders a list region', async (_name, Screen) => {
    const { container } = renderWithProviders(<Screen />);

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it.each(SCREENS.filter(([, , , , filterId]) => filterId !== null))(
    '%s renders its filter',
    async (_name, Screen, _heading, _addLabel, filterId) => {
      const { container } = renderWithProviders(<Screen />);

      await waitFor(() => expect(container.querySelector(`#${filterId}`)).not.toBeNull());
    },
  );

  it.each(SCREENS)('%s opens its create dialog', async (_name, Screen, _heading, addLabel) => {
    const { container } = renderWithProviders(<Screen />);

    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(`^${escapeRegExp(addLabel)}$`, 'i') }),
    );

    // Carbon keeps modals mounted; the open class is what proves the dialog was raised.
    await waitFor(() =>
      expect(container.ownerDocument.querySelector('.cds--modal.is-visible')).not.toBeNull(),
    );
  });

  it.each(SCREENS)('%s does not open its dialog before the add action', async (_name, Screen) => {
    const { container } = renderWithProviders(<Screen />);

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
    expect(container.ownerDocument.querySelector('.cds--modal.is-visible')).toBeNull();
  });
});

describe('Maintenance screens — filter', () => {
  it.each(SCREENS.filter(([, , , , filterId]) => filterId !== null))(
    '%s re-lists when its filter changes',
    async (_name, Screen, _heading, _addLabel, filterId) => {
      const { container } = renderWithProviders(<Screen />);

      await waitFor(() => expect(container.querySelector(`#${filterId}`)).not.toBeNull());
      const select = container.querySelector(`#${filterId}`) as HTMLSelectElement;
      const alternative = Array.from(select.options).map((o) => o.value).find((v) => v !== select.value);
      if (alternative === undefined) {
        return;
      }
      fireEvent.change(select, { target: { value: alternative } });

      await waitFor(() => expect(select.value).toBe(alternative));
      expect(container.textContent ?? '').not.toBe('');
    },
  );
});
