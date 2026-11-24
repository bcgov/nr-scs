import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import TemplatesModal from './TemplatesModal';

// One fully populated row per Mandatory rendering (Y, N, anything else) plus a
// sparse row so every `?? ''` fallback in toConditionRow is exercised.
const conditions = [
  {
    scaleAuthConditionId: 1,
    scaleAuthConditionTitle: 'Bark',
    ministryStandardInd: 'Y',
    scaleAuthConditionDesc: 'Bark must be intact',
  },
  {
    scaleAuthConditionId: 2,
    scaleAuthConditionTitle: 'Alpha',
    ministryStandardInd: 'N',
    scaleAuthConditionDesc: 'Sorts first by title',
  },
  {
    scaleAuthConditionId: 3,
    scaleAuthConditionTitle: 'Zulu',
    ministryStandardInd: 'X',
    scaleAuthConditionDesc: 'Odd flag',
  },
  {},
];

const template = (overrides: Record<string, unknown> = {}) =>
  ({
    scaleAuthTemplateId: 7,
    scaleAuthTemplateName: 'Standard haul',
    scaleConditionClassCode: 'SA',
    orgUnitNo: 43,
    conditions,
    ...overrides,
  }) as never;

const setModalMode = vi.fn();
const handleFieldChange = vi.fn();
const handleSave = vi.fn();
const setDeleteModalOpen = vi.fn();

const filledForm = { scaleAuthTemplateName: 'Standard haul', scaleConditionClassCode: 'SA', orgUnitNo: '43' };

const setup = (overrides: Record<string, unknown> = {}) =>
  renderWithProviders(
    <TemplatesModal
      modalMode="create"
      setModalMode={setModalMode}
      selectedTemplate={null}
      detailQueryLoading={false}
      typeCodes={[{ code: 'SA', description: 'Scaler authorization' }] as never}
      regionDistricts={[{ code: '43', description: 'DCK' }] as never}
      formValues={filledForm}
      handleFieldChange={handleFieldChange}
      handleSave={handleSave}
      savePending={false}
      setDeleteModalOpen={setDeleteModalOpen}
      {...overrides}
    />,
  );

const saveButton = () => screen.getByRole('button', { name: 'Save Record' });

beforeEach(() => {
  resetApiMock();
  setModalMode.mockClear();
  handleFieldChange.mockClear();
  handleSave.mockClear();
  setDeleteModalOpen.mockClear();
  apiMock.scalerAuthorizations.searchActiveScaleAuthConditions.mockResolvedValue(conditions as never);
});

describe('TemplatesModal — choosing conditions in create mode', () => {
  it('lists the conditions for the chosen type with their Mandatory flags spelled out', async () => {
    setup();

    expect(await screen.findByText('Bark')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('saves the ticked conditions under the template type', async () => {
    setup();

    fireEvent.click(await screen.findByLabelText('Select condition 1'));
    fireEvent.click(saveButton());

    expect(handleSave).toHaveBeenCalledWith([{ scaleConditionClassCode: 'SA', scaleAuthConditionId: 1 }]);
  });

  it('un-ticks a condition that is ticked twice', async () => {
    setup();

    const box = await screen.findByLabelText('Select condition 1');
    fireEvent.click(box);
    fireEvent.click(box);
    fireEvent.click(saveButton());

    expect(handleSave).toHaveBeenCalledWith([]);
  });

  it('ticks a condition when its row is clicked', async () => {
    setup();

    fireEvent.click(await screen.findByText('Zulu'));
    fireEvent.click(saveButton());

    expect(handleSave).toHaveBeenCalledWith([{ scaleConditionClassCode: 'SA', scaleAuthConditionId: 3 }]);
  });

  it('shows no conditions when the lookup fails', async () => {
    apiMock.scalerAuthorizations.searchActiveScaleAuthConditions.mockRejectedValue(new Error('down'));
    setup();

    await waitFor(() =>
      expect(apiMock.scalerAuthorizations.searchActiveScaleAuthConditions).toHaveBeenCalled(),
    );
    await waitFor(() => expect(screen.queryByText('Loading')).not.toBeInTheDocument());

    expect(screen.queryByLabelText(/Select condition/)).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it('looks up nothing until a type is chosen', () => {
    setup({ formValues: { ...filledForm, scaleConditionClassCode: '' } });

    expect(apiMock.scalerAuthorizations.searchActiveScaleAuthConditions).not.toHaveBeenCalled();
    expect(saveButton()).toBeDisabled();
  });

  it('leaves the tick boxes inert while a save is pending', async () => {
    setup({ savePending: true });

    const box = await screen.findByLabelText('Select condition 1');
    expect(box).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('closes on request when nothing is saving, but not mid-save', () => {
    const { unmount } = setup();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(setModalMode).toHaveBeenCalledWith(null);
    unmount();

    setModalMode.mockClear();
    setup({ savePending: true });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(setModalMode).not.toHaveBeenCalled();
  });
});

describe('TemplatesModal — edit mode', () => {
  it('pushes the fetched template into the host form and pre-ticks its conditions', () => {
    setup({ modalMode: 'edit', selectedTemplate: template(), detail: template() });

    expect(screen.getByText('Template - Edit')).toBeInTheDocument();
    expect(handleFieldChange).toHaveBeenCalledWith('scaleAuthTemplateName', 'Standard haul');
    expect(handleFieldChange).toHaveBeenCalledWith('scaleConditionClassCode', 'SA');
    expect(handleFieldChange).toHaveBeenCalledWith('orgUnitNo', '43');

    fireEvent.click(saveButton());
    expect(handleSave).toHaveBeenCalledWith(
      expect.arrayContaining([
        { scaleConditionClassCode: 'SA', scaleAuthConditionId: 1 },
        { scaleConditionClassCode: 'SA', scaleAuthConditionId: 2 },
        { scaleConditionClassCode: 'SA', scaleAuthConditionId: 3 },
      ]),
    );
    expect(handleSave.mock.calls[0][0]).toHaveLength(3);
  });

  it('blanks the org unit when the template has none', () => {
    setup({
      modalMode: 'edit',
      selectedTemplate: template(),
      detail: template({ orgUnitNo: null, scaleAuthTemplateName: null, scaleConditionClassCode: null, conditions: undefined }),
    });

    expect(handleFieldChange).toHaveBeenCalledWith('orgUnitNo', '');
    expect(handleFieldChange).toHaveBeenCalledWith('scaleAuthTemplateName', '');
    expect(handleFieldChange).toHaveBeenCalledWith('scaleConditionClassCode', '');
  });

  it('puts the fetched values back on Reset', () => {
    setup({ modalMode: 'edit', selectedTemplate: template(), detail: template() });
    handleFieldChange.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(handleFieldChange).toHaveBeenCalledWith('scaleAuthTemplateName', 'Standard haul');
    expect(handleFieldChange).toHaveBeenCalledWith('scaleConditionClassCode', 'SA');
    expect(handleFieldChange).toHaveBeenCalledWith('orgUnitNo', '43');
  });

  it('resets to blank org unit when the template has none', () => {
    setup({ modalMode: 'edit', selectedTemplate: template(), detail: template({ orgUnitNo: null, conditions: [{}] }) });
    handleFieldChange.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(handleFieldChange).toHaveBeenCalledWith('orgUnitNo', '');
  });

  it('clears everything on Reset in create mode', () => {
    setup();
    handleFieldChange.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(handleFieldChange).toHaveBeenCalledWith('scaleAuthTemplateName', '');
    expect(handleFieldChange).toHaveBeenCalledWith('scaleConditionClassCode', '');
    expect(handleFieldChange).toHaveBeenCalledWith('orgUnitNo', '');
  });

  it('goes back to the list from Back', () => {
    setup({ modalMode: 'edit', selectedTemplate: template(), detail: template() });

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(setModalMode).toHaveBeenCalledWith(null);
  });
});

describe('TemplatesModal — sorting the conditions of a viewed template', () => {
  const rowText = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('tbody tr')).map((tr) => tr.textContent ?? '');

  const view = () =>
    setup({ modalMode: 'view', selectedTemplate: template(), detail: template() });

  it('cycles a column through ascending, descending and unsorted', () => {
    const { container } = view();
    expect(rowText(container)[0]).toContain('Bark');

    fireEvent.click(screen.getByText('Title'));
    expect(rowText(container).map((t) => t.includes('Alpha')).indexOf(true)).toBeLessThan(
      rowText(container).map((t) => t.includes('Zulu')).indexOf(true),
    );

    fireEvent.click(screen.getByText('Title'));
    expect(rowText(container)[0]).toContain('Zulu');

    fireEvent.click(screen.getByText('Title'));
    expect(rowText(container)[0]).toContain('Bark');
  });

  it('starts ascending again when a different column is chosen', () => {
    const { container } = view();

    fireEvent.click(screen.getByText('Title'));
    fireEvent.click(screen.getByText('Title'));
    expect(rowText(container)[0]).toContain('Zulu');

    fireEvent.click(screen.getByText('Description'));
    const rows = rowText(container);
    expect(rows.findIndex((t) => t.includes('Bark must'))).toBeLessThan(rows.findIndex((t) => t.includes('Sorts first')));
  });

  it('shows the type and district descriptions read-only', () => {
    const { container } = view();

    expect((container.querySelector('#view-template-type') as HTMLInputElement).value).toBe('Scaler authorization');
    expect((container.querySelector('#view-template-org') as HTMLInputElement).value).toBe('DCK');
  });

  it('falls back to the raw type code and a blank district when the lookups do not know them', () => {
    const { container } = setup({
      modalMode: 'view',
      selectedTemplate: template(),
      detail: template({ scaleConditionClassCode: 'ZZ', orgUnitNo: 99, conditions: undefined }),
    });

    expect((container.querySelector('#view-template-type') as HTMLInputElement).value).toBe('ZZ');
    expect((container.querySelector('#view-template-org') as HTMLInputElement).value).toBe('');
  });
});
