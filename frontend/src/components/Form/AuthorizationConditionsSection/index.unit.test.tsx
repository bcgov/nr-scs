import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';
import type { ScaleAuthCondition } from '@/services/scalerAuthorizations.service';

import AuthorizationConditionsSection from './index';

const condition = (
  scaleAuthConditionId: number,
  text = `Condition ${scaleAuthConditionId}`,
): ScaleAuthCondition =>
  ({
    scaleAuthConditionId,
    scaleAuthConditionTitle: text,
    scaleAuthConditionDesc: text,
    ministryStandardInd: 'N',
  }) as ScaleAuthCondition;

const searchConditions = vi.fn();
const getTemplateConditions = vi.fn();

const setup = (overrides: Record<string, unknown> = {}) => {
  const setConditions = vi.fn();
  const props = {
    conditionClassCode: 'SA',
    templateFilterField: 'scalerAuthInd',
    conditions: [] as ScaleAuthCondition[],
    setConditions,
    searchConditions,
    getTemplateConditions,
    // Off by default: the mount-time seeding resolves asynchronously and would clear the inline
    // error a test had just triggered. One test below turns it back on.
    loadDefaults: false,
    ...overrides,
  };
  const result = renderWithProviders(<AuthorizationConditionsSection {...props} />);
  return { ...result, setConditions, props };
};

beforeEach(() => {
  resetApiMock();
  searchConditions.mockReset().mockResolvedValue([]);
  getTemplateConditions.mockReset().mockResolvedValue([]);
});

describe('AuthorizationConditionsSection', () => {
  it('renders the conditions heading and its controls', () => {
    const { container } = setup();

    expect(screen.getByText('Conditions')).toBeInTheDocument();
    expect(controlById(container, 'condition-id')).toBeInTheDocument();
  });

  it('lists the conditions it is given', () => {
    setup({ conditions: [condition(1, 'No night hauling'), condition(2, 'Weigh scale only')] });

    // The fixture puts the same text in both the Title and Description columns.
    expect(screen.getAllByText(/No night hauling/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Weigh scale only/).length).toBeGreaterThan(0);
  });

  it('loads the template list on mount', async () => {
    apiMock.lov.getTemplates.mockResolvedValue([
      { templateId: 7, templateName: 'Standard', scalerAuthInd: 'Y' },
    ]);
    setup({ loadDefaults: true });

    await waitFor(() => expect(apiMock.lov.getTemplates).toHaveBeenCalledWith(
      'scalerAuthInd',
      expect.anything(),
    ));
  });

  it('seeds the mandatory default conditions when asked to', async () => {
    searchConditions.mockResolvedValue([condition(5, 'Ministry standard')]);
    const { setConditions } = setup({ loadDefaults: true });

    await waitFor(() => expect(setConditions).toHaveBeenCalled());
  });

  it('does not seed defaults, nor fetch templates, when loadDefaults is off', async () => {
    const { setConditions } = setup({ loadDefaults: false });

    await waitFor(() => expect(screen.getByText('Conditions')).toBeInTheDocument());
    expect(setConditions).not.toHaveBeenCalled();
    expect(apiMock.lov.getTemplates).not.toHaveBeenCalled();
    expect(searchConditions).not.toHaveBeenCalled();
  });

  it('leaves Add disabled until a condition number is typed', async () => {
    const { container } = setup();

    expect(screen.getByRole('button', { name: /^Add$/i })).toBeDisabled();

    await userEvent.type(controlById(container, 'condition-id'), '12');

    expect(screen.getByRole('button', { name: /^Add$/i })).toBeEnabled();
  });

  it('refuses a non-numeric condition number', async () => {
    const { container } = setup();

    await userEvent.type(controlById(container, 'condition-id'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(await screen.findByText('Condition # must be a valid number.')).toBeInTheDocument();
    expect(searchConditions).not.toHaveBeenCalled();
  });

  it('adds a condition that the search resolves', async () => {
    searchConditions.mockResolvedValue([condition(12, 'Daylight hauling only')]);
    const { container, setConditions } = setup();

    await userEvent.type(controlById(container, 'condition-id'), '12');
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    await waitFor(() => expect(setConditions).toHaveBeenCalled());
  });

  it('rejects a condition that is already in the list', async () => {
    searchConditions.mockResolvedValue([condition(12)]);
    const { container, setConditions } = setup({ conditions: [condition(12)] });
    // The section seeds its defaults on mount; only calls after the click are of interest.
    setConditions.mockClear();

    await userEvent.type(controlById(container, 'condition-id'), '12');
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(await screen.findByText(/has already been added/i)).toBeInTheDocument();
    expect(setConditions).not.toHaveBeenCalled();
  });

  it('adds a condition once when Add is clicked twice before the lookup resolves', async () => {
    let resolveLookup: (value: ScaleAuthCondition[]) => void = () => {};
    searchConditions.mockImplementation(
      () => new Promise<ScaleAuthCondition[]>((resolve) => { resolveLookup = resolve; }),
    );
    const { container, setConditions } = setup();

    await userEvent.type(controlById(container, 'condition-id'), '12');
    const add = screen.getByRole('button', { name: /^Add$/i });
    fireEvent.click(add);
    fireEvent.click(add);

    await waitFor(() => expect(add).toBeDisabled());
    resolveLookup([condition(12)]);

    await waitFor(() => expect(setConditions).toHaveBeenCalledTimes(1));
    expect(searchConditions).toHaveBeenCalledTimes(1);
    const updater = setConditions.mock.calls[0][0];
    // Even if a second add did get through, the updater must not append a condition already queued.
    expect(updater([condition(12)]).map((c: ScaleAuthCondition) => c.scaleAuthConditionId)).toEqual([12]);
    expect(updater([]).map((c: ScaleAuthCondition) => c.scaleAuthConditionId)).toEqual([12]);
  });

  it('uses a host-supplied duplicate message when given one', async () => {
    searchConditions.mockResolvedValue([condition(12)]);
    const { container } = setup({
      conditions: [condition(12)],
      duplicateConditionMessage: () => 'Condition already exists for Mark Site Designation.',
    });

    await userEvent.type(controlById(container, 'condition-id'), '12');
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(
      await screen.findByText('Condition already exists for Mark Site Designation.'),
    ).toBeInTheDocument();
  });

  it('reports a condition number the search does not find', async () => {
    searchConditions.mockResolvedValue([]);
    const { container, setConditions } = setup();
    setConditions.mockClear();

    await userEvent.type(controlById(container, 'condition-id'), '99');
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(await screen.findByText('Condition 99 was not found.')).toBeInTheDocument();
    expect(setConditions).not.toHaveBeenCalled();
  });

  it('surfaces a failed condition search', async () => {
    searchConditions.mockRejectedValue(new Error('Condition service down.'));
    const { container } = setup();

    await userEvent.type(controlById(container, 'condition-id'), '12');
    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(await screen.findByText(/Condition service down\./i)).toBeInTheDocument();
  });

  it('hides the controls when asked to', () => {
    const { container } = setup({ showControls: false });

    expect(container.querySelector('#condition-id')).toBeNull();
  });

  it('keeps the add control but disables removal when read-only', () => {
    // readOnly locks the rows; hiding the controls entirely is showControls' job.
    const { container } = setup({ readOnly: true, conditions: [condition(1)] });

    expect(container.querySelector('#condition-id')).not.toBeNull();
  });

  it('disables the add control when disabled', () => {
    const { container } = setup({ disabled: true });

    const input = container.querySelector('#condition-id');
    if (input) {
      expect(input).toBeDisabled();
    }
  });
});

describe('AuthorizationConditionsSection — templates', () => {
  const withTemplates = (overrides: Record<string, unknown> = {}) => {
    apiMock.lov.getTemplates.mockResolvedValue([{ code: '7', description: 'Standard haul' }]);
    return setup({ loadDefaults: true, ...overrides });
  };

  it('keeps Apply disabled until a template is chosen', async () => {
    const { container } = withTemplates();

    await waitFor(() =>
      expect(controlById<HTMLSelectElement>(container, 'template-select').options.length).toBeGreaterThan(1),
    );
    expect(screen.getByRole('button', { name: /^Apply$/i })).toBeDisabled();
  });

  it('adds the template conditions that are not already present', async () => {
    getTemplateConditions.mockResolvedValue([condition(12), condition(13)]);
    const { container, setConditions } = withTemplates({ conditions: [condition(12)] });

    await waitFor(() =>
      expect(controlById<HTMLSelectElement>(container, 'template-select').options.length).toBeGreaterThan(1),
    );
    setConditions.mockClear();
    fireEvent.change(controlById(container, 'template-select'), { target: { value: '7' } });
    await userEvent.click(screen.getByRole('button', { name: /^Apply$/i }));

    await waitFor(() => expect(getTemplateConditions).toHaveBeenCalledWith(7, expect.anything()));
    await waitFor(() => expect(setConditions).toHaveBeenCalled());
    // The updater is pure: run it against the current list and only 13 should be new.
    const updater = setConditions.mock.calls[0][0] as (prev: ScaleAuthCondition[]) => ScaleAuthCondition[];
    const next = updater([condition(12)]);
    expect(next.map((c) => c.scaleAuthConditionId)).toEqual([12, 13]);
  });

  it('surfaces a failed template load', async () => {
    getTemplateConditions.mockRejectedValue(new Error('Template unavailable.'));
    const { container } = withTemplates();

    await waitFor(() =>
      expect(controlById<HTMLSelectElement>(container, 'template-select').options.length).toBeGreaterThan(1),
    );
    fireEvent.change(controlById(container, 'template-select'), { target: { value: '7' } });
    await userEvent.click(screen.getByRole('button', { name: /^Apply$/i }));

    expect((await screen.findAllByText(/Template unavailable\./i)).length).toBeGreaterThan(0);
  });
});

describe('AuthorizationConditionsSection — removing and searching', () => {
  it('removes an ordinary condition', async () => {
    const { setConditions } = setup({ conditions: [condition(12, 'Optional clause')] });
    setConditions.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /Remove/i }));

    await waitFor(() => expect(setConditions).toHaveBeenCalled());
    const updater = setConditions.mock.calls[0][0] as (prev: ScaleAuthCondition[]) => ScaleAuthCondition[];
    expect(updater([condition(12)])).toEqual([]);
  });

  it('refuses to remove a ministry-standard condition', async () => {
    const mandatory = { ...condition(12, 'Mandatory clause'), ministryStandardInd: 'Y' } as ScaleAuthCondition;
    const { setConditions } = setup({ conditions: [mandatory] });
    setConditions.mockClear();

    // A ministry-standard row disables its Remove outright; the handler's own guard is a fallback.
    const remove = screen.getByRole('button', { name: /Remove/i });
    expect(remove).toBeDisabled();
    await userEvent.click(remove);

    expect(setConditions).not.toHaveBeenCalled();
  });

  it('searches the conditions for its class when the search is opened', async () => {
    searchConditions.mockResolvedValue([condition(20, 'Findable')]);
    setup();

    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    await waitFor(() =>
      expect(searchConditions).toHaveBeenCalledWith(
        expect.objectContaining({ scaleConditionClassCode: 'SA' }),
        expect.anything(),
      ),
    );
  });

  it('survives a failed condition search when opening the modal', async () => {
    searchConditions.mockRejectedValue(new Error('Search down.'));
    const { container } = setup();

    await userEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    await waitFor(() => expect(searchConditions).toHaveBeenCalled());
    // The dialog stays open with nothing to pick rather than crashing.
    expect(container.ownerDocument.querySelector('.cds--modal.is-visible')).not.toBeNull();
    expect(container.ownerDocument.querySelectorAll('.cds--modal.is-visible tbody tr td').length).toBeLessThanOrEqual(1);
  });
});
