import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';
import type { ScaleAuthCondition } from '@/services/scalerAuthorizations.service';

import AuthorizationConditionsSection from './index';

const condition = (scaleAuthConditionId: number | null, text = `Condition ${scaleAuthConditionId}`) =>
  ({ scaleAuthConditionId, scaleAuthConditionTitle: text, scaleAuthConditionDesc: text, ministryStandardInd: 'N' }) as ScaleAuthCondition;

const searchConditions = vi.fn();
const getTemplateConditions = vi.fn();

const setup = (overrides: Record<string, unknown> = {}) => {
  const setConditions = vi.fn();
  const result = renderWithProviders(
    <AuthorizationConditionsSection
      conditionClassCode="SA"
      templateFilterField="scalerAuthInd"
      conditions={[]}
      setConditions={setConditions}
      searchConditions={searchConditions}
      getTemplateConditions={getTemplateConditions}
      loadDefaults={false}
      {...(overrides as object)}
    />,
  );
  return { ...result, setConditions };
};

beforeEach(() => {
  resetApiMock();
  searchConditions.mockReset().mockResolvedValue([]);
  getTemplateConditions.mockReset().mockResolvedValue([]);
});

describe('AuthorizationConditionsSection — the message of a failed default load', () => {
  it.each([
    ['the backend message', { response: { data: { message: 'Mandatory list unavailable.' } } }, 'Mandatory list unavailable.'],
    ['the backend error field', { response: { data: { error: 'Service error.' } } }, 'Service error.'],
    ['the thrown message', new Error('Network down.'), 'Network down.'],
    ['a fallback', {}, 'Could not load mandatory conditions.'],
  ])('shows %s', async (_label, failure, expected) => {
    apiMock.lov.getTemplates.mockRejectedValue(failure);
    searchConditions.mockRejectedValue(failure);
    setup({ loadDefaults: true });

    expect((await screen.findAllByText(expected)).length).toBeGreaterThan(0);
  });
});

describe('AuthorizationConditionsSection — picking from the search modal', () => {
  const openAndPick = async (label: RegExp) => {
    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));
    const pick = await screen.findAllByRole('button', { name: label });
    await userEvent.click(pick[0]);
  };

  it('adds the picked condition and closes the modal', async () => {
    searchConditions.mockResolvedValue([condition(20, 'Findable')]);
    const { setConditions } = setup();

    await openAndPick(/Findable|^20$/);

    await waitFor(() => expect(setConditions).toHaveBeenCalled());
    const updater = setConditions.mock.calls.at(-1)![0];
    const next = typeof updater === 'function' ? updater([]) : updater;
    expect(next.map((c: ScaleAuthCondition) => c.scaleAuthConditionId)).toEqual([20]);
  });

  it('refuses a picked condition that is already in the list, with the host wording', async () => {
    searchConditions.mockResolvedValue([condition(20, 'Findable')]);
    const { setConditions } = setup({
      conditions: [condition(20, 'Findable')],
      duplicateConditionMessage: (id: number) => `Condition ${id} is already here.`,
    });

    await openAndPick(/Findable|^20$/);

    expect((await screen.findAllByText('Condition 20 is already here.')).length).toBeGreaterThan(0);
    expect(setConditions).not.toHaveBeenCalled();
  });
});
